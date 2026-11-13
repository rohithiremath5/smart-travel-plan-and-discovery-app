import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadBackendConfig } from './lib/backend-config';
import { managementApi, confirmRemoteProject } from './lib/management-api';
import { deployDiscovery, requireSetupApproval, setupArguments } from './setup-backend';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
export async function setupMapping(
  root: string,
  args: string[],
  fetcher: typeof fetch = fetch,
  deploy = deployDiscovery,
) {
  const free = args.includes('--free-plan-confirmed');
  const options = setupArguments(args.filter((arg) => arg !== '--free-plan-confirmed'));
  const config = loadBackendConfig(root);
  const sql = await readFile(
    join(root, 'supabase/migrations/202611050001_mapping_quota.sql'),
    'utf8',
  );
  const baseline = await readFile(
    join(root, 'supabase/migrations/202611040001_discovery.sql'),
    'utf8',
  );
  const digest = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16);
  const name = `phase_5_mapping_${digest(sql)}`;
  if (!options.apply) {
    if (options.checkRemote) await confirmRemoteProject(config, fetcher);
    return { applied: false, migration: name, remoteChecked: options.checkRemote };
  }
  requireSetupApproval(config, options);
  if (!free)
    throw new SafeToolingError(
      'Confirm the organization remains on Free in Dashboard and supply --free-plan-confirmed. This is manual evidence; no organization-wide token is requested.',
    );
  await confirmRemoteProject(config, fetcher);
  const api = managementApi(config, fetcher);
  const history = await api('/database/migrations');
  if (!Array.isArray(history))
    throw new SafeToolingError('Migration history could not be verified. No changes made.');
  const names = history.flatMap((row: unknown) =>
    row && typeof row === 'object' && 'name' in row && typeof row.name === 'string'
      ? [row.name]
      : [],
  );
  if (
    !names.includes(`phase_2_discovery_${digest(baseline)}`) ||
    names.some(
      (value) =>
        value.startsWith('phase_2_discovery_') && value !== `phase_2_discovery_${digest(baseline)}`,
    )
  )
    throw new SafeToolingError(
      'The reviewed discovery baseline does not match migration history. Stop; no workaround or reset attempted.',
    );
  if (names.some((value) => value.startsWith('phase_5_mapping_') && value !== name))
    throw new SafeToolingError(
      'Phase 5 migration history has a different reviewed hash. Stop without overwriting.',
    );
  const functions = await api('/functions');
  if (
    !Array.isArray(functions) ||
    !functions.some(
      (row) => row && typeof row === 'object' && 'slug' in row && row.slug === 'discovery',
    )
  )
    throw new SafeToolingError(
      'Existing discovery function identity could not be confirmed. No changes made.',
    );
  if (!names.includes(name)) await api('/database/migrations', 'POST', { name, query: sql });
  await deploy(root, config, fetcher);
  return { applied: true, migration: name, remoteChecked: true };
}
if (isMain(import.meta.url))
  setupMapping(process.cwd(), process.argv.slice(2))
    .then((result) =>
      console.log(
        result.applied
          ? 'Reviewed Phase 5 weighted quota migration confirmed; only discovery deployed. No secrets/auth/trip tables changed.'
          : 'Phase 5 mapping plan locally validated. Pending separate hosted approval: one additive weighted-quota RPC migration and discovery deployment. No network or hosted changes unless --check-remote was explicitly supplied.',
      ),
    )
    .catch(reportFailure);
