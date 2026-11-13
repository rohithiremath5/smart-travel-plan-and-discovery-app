import { constants } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isMain, reportFailure } from './lib/cli';

export async function ensureEnvironment(root: string): Promise<'created' | 'preserved'> {
  try {
    await copyFile(join(root, '.env.example'), join(root, '.env'), constants.COPYFILE_EXCL);
    return 'created';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return 'preserved';
    throw error;
  }
}

if (isMain(import.meta.url)) {
  ensureEnvironment(process.cwd())
    .then((result) => {
      console.log(
        result === 'created'
          ? 'Created .env from the blank template. No API keys are needed for Phase 1.'
          : '.env already exists; all existing values were preserved.',
      );
    })
    .catch(reportFailure);
}
