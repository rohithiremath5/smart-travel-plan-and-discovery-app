import { pathToFileURL } from 'node:url';

export function isMain(moduleUrl: string) {
  return Boolean(process.argv[1] && moduleUrl === pathToFileURL(process.argv[1]).href);
}

export function reportFailure(error: unknown) {
  // Only our deliberately sanitized messages are safe to report to the terminal.
  const message =
    error instanceof SafeToolingError
      ? error.message
      : 'The operation failed. Check file permissions and documented prerequisites; no configuration values were printed.';
  console.error(message);
  process.exitCode = 1;
}

export class SafeToolingError extends Error {}
