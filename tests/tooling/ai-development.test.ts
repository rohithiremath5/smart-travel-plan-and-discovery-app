// @vitest-environment node
import { expect, it } from 'vitest';
import { isLocalAiRequest } from '../../server/ai/dev-plugin';
import { setupAi } from '../../scripts/setup-ai';
import { postgresAiQuota } from '../../supabase/functions/_shared/ai/postgres-quota';
it.each([
  { state: 'reserved', globalRemaining: '4', clientRemaining: 2 },
  { state: 'reserved', globalRemaining: 99, clientRemaining: 2 },
  { state: 'reserved', globalRemaining: 4 },
])('fails closed on malformed remote quota acknowledgments', async (body) => {
  const quota = postgresAiQuota('https://synthetic.example', 'synthetic-server-only', async () =>
    Response.json(body),
  );
  await expect(quota.reserve('a', 'b', 'c', 5, 3)).rejects.toThrow('Invalid quota');
});
it('allows only loopback peers with an exact loopback host and same origin', () => {
  expect(isLocalAiRequest('127.0.0.1', 'localhost:5173', 'http://localhost:5173')).toBe(true);
  expect(isLocalAiRequest('::1', '[::1]:5173', 'http://[::1]:5173')).toBe(true);
  for (const [address, host, origin] of [
    ['192.168.1.2', 'localhost:5173', 'http://localhost:5173'],
    ['127.0.0.1', 'attacker.example:5173', 'http://attacker.example:5173'],
    ['127.0.0.1', 'localhost:5173', 'http://attacker.example'],
    ['127.0.0.1', 'localhost:5173', ''],
    ['127.0.0.1', 'localhost.evil:5173', 'http://localhost.evil:5173'],
  ])
    expect(isLocalAiRequest(address!, host!, origin!)).toBe(false);
});
it('refuses hosted setup arguments before reading environment or contacting any service', async () => {
  await expect(setupAi('not-a-project', ['--apply'])).rejects.toThrow('No hosted apply');
});
