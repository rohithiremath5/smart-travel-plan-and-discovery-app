import {
  aiRequestSchema,
  assistantModel,
  plannerModel,
  type AiRequest,
  type AiResponse,
} from './contracts.ts';
import { configurationIssue, type AiConfig } from './config.ts';
import { generateWithGemini, AiProviderError } from './gemini-provider.ts';
import { aiAbortable, aiDeadline } from './timeouts.ts';
export interface AiReservation {
  state: 'reserved' | 'limited' | 'client_limited' | 'duplicate' | 'busy';
  globalRemaining: number;
  clientRemaining: number;
}
export interface AiQuotaStore {
  reserve(
    requestHash: string,
    clientHash: string,
    contentHash: string,
    daily: number,
    client: number,
  ): Promise<AiReservation>;
}
export const digest = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
export function createAiHandler(
  config: AiConfig,
  store: AiQuotaStore,
  provider: (
    input: AiRequest,
    config: AiConfig,
    signal: AbortSignal,
  ) => Promise<AiResponse> = generateWithGemini,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    };
    const respond = (status: number, body: object) => Response.json(body, { status, headers });
    // Not a public anonymous proxy: a confidential development capability is required independently of CORS/client IDs.
    if (
      config.developmentToken.length < 32 ||
      request.headers.get('authorization') !== `Bearer ${config.developmentToken}`
    )
      return respond(403, { code: 'development_only' });
    if (!config.origins.includes(origin)) return respond(403, { code: 'origin_denied' });
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'content-type, authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Expose-Headers'] = 'Retry-After';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const issue = configurationIssue(config);
    if (request.method === 'GET')
      return respond(200, {
        available: !issue,
        code: issue,
        models: { planner: plannerModel, chat: assistantModel },
        dailyBudget: 5,
        clientBudget: 3,
        scope: 'controlled-development',
      });
    if (request.method !== 'POST') return respond(405, { code: 'method_denied' });
    if (issue) return respond(503, { code: issue });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return respond(415, { code: 'json_required' });
    // Includes bounded body parsing and quota reservation, not just upstream waiting.
    const deadline = aiDeadline(request.signal, config.timeouts.handlerMs);
    const signal = deadline.signal;
    try {
      let input: AiRequest;
      try {
        if (Number(request.headers.get('content-length')) > 24576)
          return respond(413, { code: 'request_too_large' });
        const reader = request.body?.getReader();
        if (!reader) return respond(400, { code: 'invalid_request' });
        let bytes = 0,
          body = '';
        const decoder = new TextDecoder();
        while (true) {
          const chunk = await aiAbortable(() => reader.read(), signal).catch((error: unknown) => {
            void reader.cancel().catch(() => undefined);
            throw error;
          });
          if (chunk.done) break;
          bytes += chunk.value.length;
          if (bytes > 24576) {
            await reader.cancel();
            return respond(413, { code: 'request_too_large' });
          }
          body += decoder.decode(chunk.value, { stream: true });
        }
        input = aiRequestSchema.parse(JSON.parse(body + decoder.decode()));
      } catch {
        if (signal.aborted) return respond(504, { code: 'ai_timeout' });
        return respond(400, { code: 'invalid_request' });
      }
      let reservation: AiReservation;
      try {
        reservation = await aiAbortable(async () => {
          const requestHash = await digest(input.requestId);
          const clientHash = await digest(input.clientId);
          const contentHash = await digest(
            JSON.stringify({
              operation: input.operation,
              context: input.context,
              instruction: input.instruction,
              messages: input.messages,
            }),
          );
          signal.throwIfAborted();
          return store.reserve(
            requestHash,
            clientHash,
            contentHash,
            config.dailyBudget,
            config.clientBudget,
          );
        }, signal);
      } catch {
        if (signal.aborted) return respond(504, { code: 'ai_timeout' });
        return respond(503, { code: 'quota_unavailable' });
      }
      if (reservation.state !== 'reserved') {
        if (reservation.state === 'duplicate') return respond(409, { code: 'duplicate_request' });
        headers['Retry-After'] = reservation.state === 'busy' ? '10' : '3600';
        return respond(429, {
          code:
            reservation.state === 'limited'
              ? 'daily_budget'
              : reservation.state === 'client_limited'
                ? 'client_budget'
                : 'request_busy',
        });
      }
      try {
        const result = await aiAbortable(() => provider(input, config, signal), signal);
        if (config.apiKey.length >= 8 && JSON.stringify(result).includes(config.apiKey))
          throw new AiProviderError('invalid_ai_response');
        return respond(200, {
          ...result,
          quota: {
            globalRemaining: reservation.globalRemaining,
            clientRemaining: reservation.clientRemaining,
          },
        });
      } catch (error) {
        if (error instanceof AiProviderError) {
          if (error.status === 429) headers['Retry-After'] = '60';
          return respond(error.status, {
            code: error.code,
            ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}),
            ...(error.diagnostic ? { diagnostic: error.diagnostic } : {}),
          });
        }
        if (signal.aborted) return respond(504, { code: 'ai_timeout' });
        return respond(502, { code: 'provider_unavailable' });
      }
    } finally {
      deadline.dispose();
    }
  };
}
