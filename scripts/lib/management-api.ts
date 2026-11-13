import { SafeToolingError } from './cli';
import type { BackendConfig } from './backend-config';

export function managementApi(config: BackendConfig, fetcher: typeof fetch = fetch) {
  return async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetcher(`https://api.supabase.com/v1/projects/${config.ref}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      });
    } catch {
      throw new SafeToolingError(
        'Supabase management request failed or timed out. Check network/TLS and project availability. Credentials and response bodies suppressed.',
      );
    }
    if (!response.ok) {
      const permission =
        path === '/secrets'
          ? 'edge_functions_secrets_write (Owner or Administrator role)'
          : path.startsWith('/database/migrations')
            ? method === 'GET'
              ? 'database_migrations_read'
              : 'database_migrations_write'
            : path.startsWith('/functions')
              ? 'edge_functions_read'
              : path.startsWith('/api-keys')
                ? 'api_gateway_keys_read'
                : path.includes('read-only')
                  ? 'database_read'
                  : 'project_admin_read';
      if (response.status === 401)
        throw new SafeToolingError(
          'Supabase returned HTTP 401: SUPABASE_ACCESS_TOKEN is invalid or expired. Check Dashboard account → Access Tokens and update only the local .env if necessary; never paste tokens into chat.',
        );
      if (response.status === 403)
        throw new SafeToolingError(
          `Supabase returned HTTP 403: token/account lacks access. Required permission for this operation: ${permission}, on the configured project. Do not send the token in chat.`,
        );
      throw new SafeToolingError(
        `Supabase setup returned HTTP ${response.status}. No response body printed. Check project state and free quotas; no billing or automatic retries are attempted.`,
      );
    }
    if (response.status === 204) return null;
    try {
      const content = await response.text();
      // The hosted secrets endpoint can acknowledge a successful upsert with an
      // empty 201 response. Reads must still supply valid JSON for verification.
      if (!content.trim() && path === '/secrets' && method === 'POST') return null;
      return JSON.parse(content) as unknown;
    } catch {
      throw new SafeToolingError(
        'Supabase returned an unreadable management response. Values suppressed.',
      );
    }
  };
}
export async function confirmRemoteProject(config: BackendConfig, fetcher: typeof fetch = fetch) {
  const project = await managementApi(config, fetcher)('');
  if (
    !project ||
    typeof project !== 'object' ||
    !('id' in project) ||
    !('status' in project) ||
    !('ref' in project ? project.ref === config.ref : project.id === config.ref)
  )
    throw new SafeToolingError(
      'Remote project identity could not be confirmed. No mutation was performed.',
    );
  if (project.status !== 'ACTIVE_HEALTHY')
    throw new SafeToolingError(
      'The configured Supabase project is not ACTIVE_HEALTHY. Check its dashboard; setup will not restart or upgrade it.',
    );
  // Compare the public key to authoritative metadata. An anonymous REST schema
  // request can be denied independently of key validity; never infer rotation from that.
  const keys = await managementApi(config, fetcher)('/api-keys?reveal=false');
  if (
    !Array.isArray(keys) ||
    !keys.some(
      (key: unknown) =>
        key &&
        typeof key === 'object' &&
        'type' in key &&
        key.type === 'publishable' &&
        'api_key' in key &&
        key.api_key === config.publishableKey,
    )
  )
    throw new SafeToolingError(
      'Configured publishable key did not match this project’s public-key metadata. Check Settings → API Keys locally; no regeneration or change was performed.',
    );
}
