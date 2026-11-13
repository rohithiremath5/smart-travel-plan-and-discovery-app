import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unzipSync, zipSync } from 'fflate';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
import { collectReviewFiles, requireInsideRoot, sha256 } from './lib/review-files';

export function verifyArchive(bytes: Uint8Array, source: Record<string, Uint8Array>) {
  const archived = unzipSync(bytes);
  const names = Object.keys(archived).sort();
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(source).sort()))
    throw new SafeToolingError('Review archive inventory does not match its allowlist.');
  for (const name of names) {
    const original = source[name];
    const included = archived[name];
    if (!original || !included || sha256(original) !== sha256(included))
      throw new SafeToolingError('Review archive content verification failed.');
  }
}

export async function createReviewArchive(
  root: string,
  phase: '6' | '6-1' | '7' | '8' | '9' = '6',
) {
  const files = await collectReviewFiles(root);
  const archiveName = `smart-travel-phase-${phase}-review.zip`;
  const output = join(root, archiveName);
  const temporary = `${output}.tmp-${randomUUID()}`;
  requireInsideRoot(root, output);
  requireInsideRoot(root, temporary);
  try {
    const stat = await lstat(output);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new SafeToolingError('The archive target is not a regular file.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const bytes = zipSync(files, { level: 6 });
  verifyArchive(bytes, files);
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
    verifyArchive(await readFile(temporary), files);
    await rename(temporary, output);
  } finally {
    // Cleanup must not replace the original verification/write error.
    await unlink(temporary).catch(() => undefined);
  }
  const result = {
    path: output,
    fileCount: Object.keys(files).length,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
  const receiptPath = join(root, `smart-travel-phase-${phase}-review.receipt.json`);
  requireInsideRoot(root, receiptPath);
  try {
    const stat = await lstat(receiptPath);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new SafeToolingError('The receipt target is not a regular file.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const receipt = {
    archive: archiveName,
    phase: phase === '6-1' ? 6.1 : Number(phase),
    createdAt: new Date().toISOString(),
    bytes: result.bytes,
    sha256: result.sha256,
    fileCount: result.fileCount,
    inventoryAndContentVerified: true,
    credentialScan:
      'Configured private values and common patterns checked; limited scan, not proof of complete secrecy.',
    excluded:
      'Populated env files, credentials, private records/exports, dependencies, builds, caches, logs, prior archives and Git history.',
    files: Object.entries(files).map(([path, content]) => ({ path, sha256: sha256(content) })),
  };
  const temporaryReceipt = `${receiptPath}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporaryReceipt, JSON.stringify(receipt, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temporaryReceipt, receiptPath);
  } finally {
    await unlink(temporaryReceipt).catch(() => undefined);
  }
  return result;
}

if (isMain(import.meta.url)) {
  createReviewArchive(process.cwd(), '9')
    .then((result) => {
      console.log(
        `Created smart-travel-phase-9-review.zip (${result.fileCount} allowlisted files; ${result.bytes} bytes).`,
      );
      console.log(`SHA-256: ${result.sha256}`);
      console.log(
        'Inventory and per-file content hashes verified. Private env files, dependencies, builds, logs, uploads, and previous ZIPs excluded.',
      );
      console.log(
        'Obvious credential scan passed. This scan does not prove all sensitive information is absent; review the contents before sharing.',
      );
    })
    .catch(reportFailure);
}
