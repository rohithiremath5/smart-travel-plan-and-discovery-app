import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadBackendConfig, type BackendConfig } from './lib/backend-config';
import { confirmRemoteProject, managementApi } from './lib/management-api';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
import { assertNoCredentials, knownPrivateValues } from './lib/review-files';

export function safeDeploymentDiagnostic(
  output: string,
  config: BackendConfig,
  privateValues: readonly string[],
) {
  let safe = output;
  for (const value of [
    ...privateValues,
    config.accessToken,
    config.geoapifyKey,
    config.publishableKey,
    config.url,
    config.ref,
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length))
    safe = safe.split(value).join('[redacted]');
  safe = safe
    .replace(/https?:\/\/[^\s"'<>]+/g, '[URL]')
    .replace(/\b(?:sbp_|sb_(?:secret|publishable)_)[A-Za-z0-9_-]+/g, '[credential]')
    .replace(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g, '[credential]');
  safe = safe
    .replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '')
    .trim()
    .slice(-3000);
  assertNoCredentials('redacted CLI diagnostic', safe, privateValues);
  return safe || 'No diagnostic output was provided.';
}

export function setupArguments(args: string[]) {
  const known = ['--apply', '--approved', '--check-remote', '--confirm-project'];
  for (let i = 0; i < args.length; i++) {
    if (!known.includes(args[i]!))
      throw new SafeToolingError('Unknown setup argument. See docs/PHASE_2_SETUP.md.');
    if (args[i] === '--confirm-project') i++;
  }
  const index = args.indexOf('--confirm-project');
  return {
    apply: args.includes('--apply'),
    approved: args.includes('--approved'),
    checkRemote: args.includes('--check-remote'),
    confirmed: index >= 0 ? args[index + 1] : undefined,
  };
}
export function requireSetupApproval(
  config: BackendConfig,
  options: ReturnType<typeof setupArguments>,
) {
  if (!options.approved || options.confirmed !== config.ref)
    throw new SafeToolingError(
      'Hosted changes require separate explicit user approval, --apply --approved, and --confirm-project matching SUPABASE_PROJECT_REF. Default invocation is a local plan only.',
    );
}
export async function deployDiscovery(
  root: string,
  config: BackendConfig,
  fetcher: typeof fetch = fetch,
) {
  const files = [
    'discovery/index.ts',
    '_shared/handler.ts',
    '_shared/geoapify.ts',
    '_shared/contracts.ts',
    '_shared/mapping-contracts.ts',
    '_shared/mapping-provider.ts',
  ];
  const form = new FormData();
  form.set(
    'metadata',
    JSON.stringify({ name: 'discovery', entrypoint_path: 'discovery/index.ts', verify_jwt: false }),
  );
  for (const file of files) {
    const bytes = await readFile(join(root, 'supabase/functions', file));
    form.append('file', new Blob([bytes], { type: 'application/typescript' }), file);
  }
  let response: Response;
  try {
    response = await fetcher(
      'https://api.supabase.com/v1/projects/' + config.ref + '/functions/deploy?slug=discovery',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + config.accessToken },
        body: form,
        signal: AbortSignal.timeout(60000),
        redirect: 'error',
      },
    );
  } catch {
    throw new SafeToolingError(
      'Discovery deployment transport failed or timed out. Inspect the existing function state before retrying; no raw network output printed.',
    );
  }
  if (response.status === 403)
    throw new SafeToolingError(
      'Discovery deployment returned HTTP 403: required project permission edge_functions_write. Stop; do not broaden access automatically.',
    );
  if (response.status === 401)
    throw new SafeToolingError(
      'Discovery deployment returned HTTP 401: check the local SUPABASE_ACCESS_TOKEN; do not paste it into chat.',
    );
  if (!response.ok) {
    const diagnostic = safeDeploymentDiagnostic(
      await response.text(),
      config,
      await knownPrivateValues(root),
    );
    throw new SafeToolingError(
      'Discovery deployment returned HTTP ' +
        response.status +
        '. Redacted diagnostic: ' +
        diagnostic,
    );
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new SafeToolingError(
      'Discovery deployment acknowledgement was unreadable; inspect function state before retrying.',
    );
  }
  if (
    !result ||
    typeof result !== 'object' ||
    !('slug' in result) ||
    result.slug !== 'discovery' ||
    !('status' in result) ||
    result.status !== 'ACTIVE'
  )
    throw new SafeToolingError(
      'Discovery deployment did not confirm an ACTIVE discovery function.',
    );
}
export async function setupBackend(
  root: string,
  args: string[],
  fetcher: typeof fetch = fetch,
  deploy = deployDiscovery,
) {
  const config = loadBackendConfig(root);
  const options = setupArguments(args);
  const sql = await readFile(join(root, 'supabase/migrations/202611040001_discovery.sql'), 'utf8');
  const name = `phase_2_discovery_${createHash('sha256').update(sql).digest('hex').slice(0, 16)}`;
  if (!options.apply) {
    if (options.checkRemote) await confirmRemoteProject(config, fetcher);
    return { applied: false, remoteChecked: options.checkRemote, migration: name };
  }
  requireSetupApproval(config, options);
  if (existsSync(join(root, 'supabase/functions/_shared/mapping-provider.ts')))
    throw new SafeToolingError(
      'Phase 5 extends discovery and needs its separately reviewed additive quota migration. Use setup:mapping only after explicit Phase 5 hosted approval. No hosted change performed.',
    );
  await confirmRemoteProject(config, fetcher);
  const api = managementApi(config, fetcher);
  const history = await api('/database/migrations');
  if (!Array.isArray(history))
    throw new SafeToolingError('Migration history is unreadable; no changes performed.');
  const existing = history.filter(
    (row: unknown) =>
      row &&
      typeof row === 'object' &&
      'name' in row &&
      typeof row.name === 'string' &&
      row.name.startsWith('phase_2_discovery_'),
  ) as { name: string }[];
  if (existing.some((row) => row.name !== name))
    throw new SafeToolingError(
      'An existing Phase 2 migration has a different content hash. Stop for a reviewed additive migration; no reset or overwrite attempted.',
    );
  if (!existing.length) await api('/database/migrations', 'POST', { name, query: sql });
  await deploy(root, config);
  return { applied: true, remoteChecked: true, migration: name };
}
if (isMain(import.meta.url))
  setupBackend(process.cwd(), process.argv.slice(2))
    .then((result) => {
      console.log(
        result.applied
          ? 'Reviewed Phase 2 cache/quota migration confirmed present; discovery function deployed to the confirmed project. Secrets require their separately approved command.'
          : 'Phase 2 backend plan validated locally. No hosted changes made.',
      );
      if (result.remoteChecked)
        console.log(
          'Read-only project identity, healthy status, and public-key metadata match checks passed. No provider live response was tested.',
        );
      console.log(
        'Target matched .env; values suppressed. Plan: three internal RLS-protected tables, two service-only RPCs, and only the discovery Edge Function. No auth, trip tables, billing, deletion or application hosting.',
      );
    })
    .catch(reportFailure);
