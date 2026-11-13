import { readdir, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
import { assertNoCredentials, knownPrivateValues, requireInsideRoot } from './lib/review-files';
import { loadEnv } from 'vite';
import { readPublicEnvironment } from '../config/public-env';

export async function checkBundle(root: string) {
  const values = await knownPrivateValues(root);
  // A validated publishable key is intentionally public; all other configured values remain forbidden.
  const publicConfig = readPublicEnvironment(loadEnv('production', root, ''));
  let count = 0;
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      requireInsideRoot(root, path);
      if ((await lstat(path)).isSymbolicLink())
        throw new SafeToolingError('Build output contains an unexpected linked file.');
      if (entry.isDirectory()) await walk(path);
      else {
        if (entry.name.startsWith('.env') || entry.name.endsWith('.map'))
          throw new SafeToolingError('Build output contains environment files or source maps.');
        const content = await readFile(path, 'utf8');
        const sanitized = publicConfig.publishableKey
          ? content.split(publicConfig.publishableKey).join('[public-publishable-key]')
          : content;
        assertNoCredentials(
          'build output',
          sanitized,
          values.filter((value) => value !== publicConfig.publishableKey),
        );
        count++;
      }
    }
  }
  await walk(join(root, 'dist'));
  return count;
}
if (isMain(import.meta.url))
  checkBundle(process.cwd())
    .then((count) =>
      console.log(
        `Bundle check passed for ${count} assets; no known private credential values, obvious token patterns, environment files, or source maps found. Limited scan, not a complete security audit.`,
      ),
    )
    .catch(reportFailure);
