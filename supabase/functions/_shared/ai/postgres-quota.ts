import type { AiQuotaStore, AiReservation } from './handler.ts';
import { z } from 'zod';
const reservationSchema = z
  .object({
    state: z.enum(['reserved', 'limited', 'client_limited', 'duplicate', 'busy']),
    globalRemaining: z.number().int().min(0).max(5),
    clientRemaining: z.number().int().min(0).max(3),
  })
  .strict();
export function postgresAiQuota(
  url: string,
  adminKey: string,
  fetcher: typeof fetch = fetch,
): AiQuotaStore {
  return {
    reserve: async (request, client, content, daily, perClient) => {
      const response = await fetcher(`${url}/rest/v1/rpc/ai_reserve`, {
        method: 'POST',
        headers: { apikey: adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_request: request,
          p_client: client,
          p_content: content,
          p_daily: daily,
          p_client_limit: perClient,
        }),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('AI quota unavailable.');
      const value: unknown = await response.json();
      const parsed = reservationSchema.safeParse(value);
      if (!parsed.success) throw new Error('Invalid quota response.');
      return parsed.data satisfies AiReservation;
    },
  };
}
