import { functionSecrets, loadBackendConfig } from './lib/backend-config';
import { confirmRemoteProject, managementApi } from './lib/management-api';
import { requireSetupApproval, setupArguments } from './setup-backend';
import { isMain, reportFailure } from './lib/cli';

export async function setupSecrets(root: string, args: string[], fetcher: typeof fetch = fetch) {
  const config = loadBackendConfig(root);
  const options = setupArguments(args);
  const secrets = functionSecrets(config);
  if (options.apply) {
    requireSetupApproval(config, options);
    await confirmRemoteProject(config, fetcher);
    await managementApi(config, fetcher)('/secrets', 'POST', secrets);
  } else if (options.checkRemote) await confirmRemoteProject(config, fetcher);
  return { applied: options.apply, names: secrets.map((secret) => secret.name) };
}
if (isMain(import.meta.url))
  setupSecrets(process.cwd(), process.argv.slice(2))
    .then((result) => {
      console.log(
        result.applied
          ? 'Allowlisted discovery settings synchronized to the confirmed project.'
          : 'Secret synchronization plan only; no network mutation performed.',
      );
      console.log(
        `Names only: ${result.names.join(', ')}. Values suppressed. Local .env remains unchanged.`,
      );
      console.log(
        'No access token, DB password, Gemini, Pexels, OAuth, or Cloudflare credentials are synchronized. Existing unrelated secrets are not deleted.',
      );
    })
    .catch(reportFailure);
