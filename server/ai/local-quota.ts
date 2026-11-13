import { constants } from 'node:fs';
import { open, readFile, writeFile, rename, unlink, mkdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AiQuotaStore, AiReservation } from '../../supabase/functions/_shared/ai/handler.ts';
const recordSchema = z
  .object({
    request: z.string().regex(/^[a-f0-9]{64}$/),
    client: z.string().regex(/^[a-f0-9]{64}$/),
    content: z.string().regex(/^[a-f0-9]{64}$/),
    at: z.number().int().nonnegative(),
  })
  .strict();
const ledgerSchema = z
  .object({ version: z.literal(1), requests: z.array(recordSchema).max(35) })
  .strict();
export async function localAiUsage(root: string, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10),
    path = join(root, '.cache', 'ai-development-ledger.json');
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error('Linked ledger refused.');
    const ledger = ledgerSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (ledger.requests.some((row) => row.at > now + 1000))
      throw new Error('Clock behind quota ledger.');
    return {
      day,
      used: ledger.requests.filter((row) => new Date(row.at).toISOString().slice(0, 10) === day)
        .length,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { day, used: 0 };
    throw error;
  }
}
// One durable checkout-wide budget. No prompt/output is retained; client IDs are untrusted counters, not authentication.
export function localAiQuota(root: string, now = () => Date.now()): AiQuotaStore {
  const directory = join(root, '.cache'),
    path = join(directory, 'ai-development-ledger.json'),
    lock = path + '.lock';
  return {
    reserve: async (request, client, content, daily, perClient) => {
      if (daily < 1 || daily > 5 || perClient < 1 || perClient > 3)
        throw new Error('Invalid AI quota.');
      await mkdir(directory, { recursive: true });
      if ((await lstat(directory)).isSymbolicLink())
        throw new Error('Linked ledger directory refused.');
      const handle = await open(
        lock,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600,
      ).catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null;
        throw error;
      });
      if (!handle) return { state: 'busy', globalRemaining: 0, clientRemaining: 0 };
      const temporary = path + '.tmp-' + randomUUID();
      try {
        let ledger: z.infer<typeof ledgerSchema> = { version: 1, requests: [] };
        try {
          if ((await lstat(path)).isSymbolicLink()) throw new Error('Linked ledger refused.');
          ledger = ledgerSchema.parse(JSON.parse(await readFile(path, 'utf8')));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        const stamp = now(),
          day = new Date(stamp).toISOString().slice(0, 10),
          oldest = stamp - 6 * 86400000;
        ledger.requests = ledger.requests.filter((row) => row.at >= oldest);
        if (ledger.requests.some((row) => row.at > stamp + 1000))
          throw new Error('Clock moved behind quota ledger; stop.');
        const today = ledger.requests.filter(
          (row) => new Date(row.at).toISOString().slice(0, 10) === day,
        );
        const used = today.filter((row) => row.client === client).length;
        const remaining = {
          globalRemaining: Math.max(0, daily - today.length),
          clientRemaining: Math.max(0, perClient - used),
        };
        const result = (state: AiReservation['state']) => ({ state, ...remaining });
        if (today.some((row) => row.request === request)) return result('duplicate');
        if (today.length >= daily) return result('limited');
        if (used >= perClient) return result('client_limited');
        if (
          ledger.requests.some((row) => stamp - row.at < 10000) ||
          today.some((row) => row.content === content && stamp - row.at < 60000)
        )
          return result('busy');
        ledger.requests.push({ request, client, content, at: stamp });
        await writeFile(temporary, JSON.stringify(ledger), { flag: 'wx', mode: 0o600 });
        await rename(temporary, path);
        return {
          state: 'reserved',
          globalRemaining: remaining.globalRemaining - 1,
          clientRemaining: remaining.clientRemaining - 1,
        };
      } finally {
        await handle.close();
        await unlink(lock);
        await unlink(temporary).catch(() => undefined);
      }
    },
  };
}
