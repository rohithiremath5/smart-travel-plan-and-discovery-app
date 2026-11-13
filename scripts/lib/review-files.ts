import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { parseEnv } from 'node:util';
import { SafeToolingError } from './cli';

const rootFiles = new Set([
  'README.md',
  'AGENTS.md',
  'THIRD_PARTY_NOTICES.md',
  '.env.example',
  '.gitignore',
  '.prettierignore',
  '.prettierrc.json',
  '.editorconfig',
  '.nvmrc',
  '.node-version',
  'package.json',
  'package-lock.json',
  'components.json',
  'index.html',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'playwright.hosted.config.ts',
  'eslint.config.js',
]);
const sourceDirectories = [
  'src',
  'server',
  'config',
  'scripts',
  'tests',
  'docs',
  'public',
  'supabase',
];
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.css',
  '.md',
  '.svg',
  '.jpg',
  '.sql',
  '.toml',
]);
const excludedDirectories = new Set([
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
  '.cache',
  'private-uploads',
  'backups',
  'logs',
  'trip-exports',
  'exports',
]);
const credentialPatterns = [
  /AIza[0-9A-Za-z_-]{35}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{30,}/,
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}/,
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function requireInsideRoot(root: string, target: string) {
  if (!resolve(target).startsWith(resolve(root) + sep))
    throw new SafeToolingError('Refusing a file path outside the project.');
}

export function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function credentialField(name: string) {
  return /(?:KEY|TOKEN|PASSWORD|SECRET)$/.test(name);
}

export async function knownPrivateValues(root: string) {
  const values = new Set<string>();
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === '.env.example' || !(entry.name === '.env' || entry.name.startsWith('.env.')))
      continue;
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new SafeToolingError('Refusing a linked environment file.');
    if (!entry.isFile()) continue;
    const parsed = parseEnv(await readFile(path, 'utf8'));
    for (const [name, value] of Object.entries(parsed))
      if (credentialField(name) && value && value.length >= 8) values.add(value);
  }
  for (const [name, value] of Object.entries(process.env))
    if (credentialField(name) && value && value.length >= 8) values.add(value);
  return [...values];
}

export function assertNoCredentials(name: string, content: string, knownValues: readonly string[]) {
  if (name.endsWith('.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      /* Non-JSON inputs are handled by their normal tooling. */
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'format' in parsed &&
      parsed.format === 'smart-travel-trips'
    )
      throw new SafeToolingError(
        'Trip backup exports are private review inputs and must not be packaged.',
      );
  }
  if (
    credentialPatterns.some((pattern) => pattern.test(content)) ||
    knownValues.some((value) => content.includes(value))
  ) {
    throw new SafeToolingError(
      `Possible credential in ${name}; packaging/check stopped. Value suppressed. Review locally before sharing.`,
    );
  }
  if (name === '.env.example') {
    const values = parseEnv(content);
    if (Object.entries(values).some(([field, value]) => credentialField(field) && value?.trim())) {
      throw new SafeToolingError(
        'A credential placeholder in .env.example is populated; keep the template blank.',
      );
    }
  }
}

export async function collectReviewFiles(root: string) {
  const files: Record<string, Uint8Array> = {};
  const knownValues = await knownPrivateValues(root);
  let totalBytes = 0;
  async function add(relativePath: string) {
    const path = join(root, relativePath);
    requireInsideRoot(root, path);
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new SafeToolingError(
        'Review inputs must be regular files; linked/special files are not accepted.',
      );
    if (stat.size > 10 * 1024 * 1024)
      throw new SafeToolingError('A review file exceeds the 10 MiB safety limit.');
    const bytes = await readFile(path);
    totalBytes += bytes.length;
    if (totalBytes > 50 * 1024 * 1024)
      throw new SafeToolingError('Review inputs exceed the 50 MiB safety limit.');
    const entryName = relativePath.split(sep).join('/');
    assertNoCredentials(entryName, bytes.toString('utf8'), knownValues);
    files[entryName] = bytes;
  }
  async function walk(relativeDirectory: string) {
    const path = join(root, relativeDirectory);
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new SafeToolingError('Linked/special source directories are not accepted.');
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || excludedDirectories.has(entry.name)) continue;
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isSymbolicLink())
        throw new SafeToolingError('Linked source files are not accepted in review archives.');
      if (entry.isDirectory()) await walk(relativePath);
      else if (
        entry.isFile() &&
        (sourceExtensions.has(extname(entry.name)) ||
          (/^docs\/review\/phase-(?:[23456789]|6-1)\/screenshots$/.test(
            relativeDirectory.split(sep).join('/'),
          ) &&
            extname(entry.name) === '.png'))
      )
        await add(relativePath);
    }
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (rootFiles.has(entry.name)) await add(entry.name);
    else if (sourceDirectories.includes(entry.name)) await walk(entry.name);
  }
  for (const required of [
    'README.md',
    'AGENTS.md',
    '.env.example',
    'package.json',
    'package-lock.json',
    'docs/PHASE_STATUS.md',
  ]) {
    if (!files[required]) throw new SafeToolingError(`Missing required review input: ${required}.`);
  }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}
