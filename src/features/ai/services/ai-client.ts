import { z } from 'zod';
import { appConfig } from '@/app/config/environment';
import { aiAbortable, aiDeadline } from '../../../../supabase/functions/_shared/ai/timeouts';
import {
  aiRequestSchema,
  aiChatSchema,
  assistantModel,
  plannerModel,
  validatePlan,
  type AiRequest,
  type AiResponse,
} from '../../../../supabase/functions/_shared/ai/contracts';
export class AiClientError extends Error {
  constructor(
    public code: string,
    public retryAfter = 0,
  ) {
    super(code);
  }
}
export function aiMessage(error: unknown): string {
  const code = error instanceof AiClientError ? error.code : '';
  const messages: Record<string, string> = {
    missing_key:
      'AI is not configured on this development server. Add the existing server-side key to .env and restart; manual planning still works.',
    model_unavailable:
      'The configured model is unavailable. Keep the approved models and check the project’s free access; no fallback was selected.',
    ai_disabled: 'AI is disabled by the server configuration. Manual planning stays available.',
    development_only:
      'AI is restricted to local development. Start the documented local development server; this is not a public anonymous service.',
    daily_budget:
      'The development allowance of five requests for today is used. Continue planning manually.',
    client_budget:
      'This client’s three-request allowance is used. It is a convenience limit, not a signed-in user identity.',
    request_busy: 'Another request was just made. Wait ten seconds before trying again.',
    provider_quota:
      'Gemini’s free quota is temporarily unavailable. There is no automatic retry or paid fallback.',
    provider_request_rejected:
      'Gemini rejected the request configuration. Nothing was saved; review the development setup without changing models or retrying automatically.',
    provider_access_denied:
      'Gemini denied generation access for this project. Check the existing project’s API access and restrictions; manual planning stays available.',
    duplicate_request:
      'This request was already submitted. Check your existing draft; duplicate generation was prevented.',
    invalid_ai_response:
      'The AI returned an invalid or incomplete plan. Nothing was saved. You can continue manually.',
    incomplete_ai_response: 'The AI did not finish a complete response. Nothing was saved.',
    invalid_request:
      'Check your brief, date range and conversation length. AI supports up to fourteen consecutive days per request.',
    quota_unavailable:
      'The request allowance could not be verified. AI stopped safely; manual planning remains available.',
    ai_timeout:
      'The AI request timed out or was cancelled. A started request still counts toward the allowance.',
    provider_deadline_exceeded:
      'Gemini exceeded its response deadline. Nothing was saved. A started request still counts; there is no automatic retry. Manual planning remains available.',
  };
  return (
    messages[code] ??
    'The AI service could not respond. Nothing was changed; keep planning manually.'
  );
}
export interface AiStatus {
  available: boolean;
  code: string | null;
  models: { planner: string; chat: string };
  dailyBudget: number;
  clientBudget: number;
  scope: string;
}
const statusSchema = z.object({
  available: z.boolean(),
  code: z.string().nullable(),
  models: z.object({ planner: z.string(), chat: z.string() }),
  dailyBudget: z.number(),
  clientBudget: z.number(),
  scope: z.string(),
});
export async function aiStatus(signal: AbortSignal): Promise<AiStatus> {
  try {
    const response = await fetch('/api/ai/status', { signal, credentials: 'same-origin' });
    if (!response.ok) throw new Error();
    return statusSchema.parse(await response.json());
  } catch {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      available: false,
      code: 'development_only',
      models: { planner: plannerModel, chat: assistantModel },
      dailyBudget: 5,
      clientBudget: 3,
      scope: 'unavailable',
    };
  }
}
export function aiClientId() {
  const key = 'smart-travel-ai-client';
  let id = sessionStorage.getItem(key);
  if (!id || !z.uuid().safeParse(id).success) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
export async function requestAi(
  raw: AiRequest,
  signal: AbortSignal,
): Promise<AiResponse & { quota: { globalRemaining: number; clientRemaining: number } }> {
  const parsed = aiRequestSchema.safeParse(raw);
  if (!parsed.success) throw new AiClientError('invalid_request');
  const input = parsed.data;
  const deadline = aiDeadline(signal, appConfig.aiRequestTimeoutMs);
  signal = deadline.signal;
  try {
    let response: Response;
    try {
      response = await aiAbortable(
        () =>
          fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(input),
            signal,
          }),
        signal,
      );
    } catch {
      throw new AiClientError('ai_timeout');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new AiClientError('invalid_ai_response');
    let size = 0,
      body = '';
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await aiAbortable(() => reader.read(), signal);
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 131072) {
          await reader.cancel();
          throw new AiClientError('invalid_ai_response');
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
    } catch (error) {
      void reader.cancel().catch(() => undefined);
      throw error instanceof AiClientError ? error : new AiClientError('ai_timeout');
    }
    if (!response.ok) {
      let code = 'ai_unavailable';
      try {
        const json: unknown = JSON.parse(body + decoder.decode());
        if (json && typeof json === 'object' && 'code' in json && typeof json.code === 'string')
          code = json.code;
      } catch {
        /* safe generic error */
      }
      throw new AiClientError(
        code,
        Math.min(3600, Math.max(0, Number(response.headers.get('retry-after')) || 0)),
      );
    }
    try {
      const wrapper = z
        .object({
          model: z.enum([plannerModel, assistantModel]),
          plan: z.unknown(),
          chat: z.unknown(),
          quota: z
            .object({
              globalRemaining: z.number().int().min(0).max(5),
              clientRemaining: z.number().int().min(0).max(3),
            })
            .strict(),
        })
        .strict()
        .parse(JSON.parse(body + decoder.decode()));
      if (input.operation === 'chat') {
        if (wrapper.model !== assistantModel || wrapper.plan !== null) throw new Error();
        return { ...wrapper, plan: null, chat: aiChatSchema.parse(wrapper.chat) };
      }
      if (wrapper.model !== plannerModel || wrapper.chat !== null) throw new Error();
      return { ...wrapper, plan: validatePlan(wrapper.plan, input.context), chat: null };
    } catch {
      throw new AiClientError('invalid_ai_response');
    }
  } finally {
    deadline.dispose();
  }
}
