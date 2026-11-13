// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { aiConfig, configurationIssue } from '../../supabase/functions/_shared/ai/config';
import { aiAbortable, aiDeadline, aiTimeouts } from '../../supabase/functions/_shared/ai/timeouts';
import { createAiHandler, type AiReservation } from '../../supabase/functions/_shared/ai/handler';
import { generateWithGemini } from '../../supabase/functions/_shared/ai/gemini-provider';
import { readPublicEnvironment } from '../../config/public-env';
import { aiInput, testAiConfig } from '../fixtures/ai';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const reserved: AiReservation = { state: 'reserved', globalRemaining: 4, clientRemaining: 2 };
function request(signal = new AbortController().signal) {
  return new Request('http://localhost:5173/api/ai/generate', {
    method: 'POST',
    signal,
    headers: {
      origin: 'http://localhost:5173',
      authorization: 'Bearer ' + testAiConfig.developmentToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify(aiInput()),
  });
}
it('derives consistent defaults/overrides and exposes only the non-secret browser duration', () => {
  expect(testAiConfig.timeouts).toEqual({ providerMs: 75000, handlerMs: 80000, browserMs: 85000 });
  const env = { AI_PROVIDER_TIMEOUT_MS: '90000', GEMINI_API_KEY: 'private-test-value' };
  expect(aiConfig(env).timeouts).toEqual({
    providerMs: 90000,
    handlerMs: 95000,
    browserMs: 100000,
  });
  expect(readPublicEnvironment(env).aiRequestTimeoutMs).toBe(100000);
  expect(JSON.stringify(readPublicEnvironment(env))).not.toContain('private-test-value');
});
it.each(['', '0', '-1', 'Infinity', 'NaN', '100000.1', '100001'])(
  'rejects invalid/excessive timeout %s without exposing values',
  (value) => {
    expect(
      configurationIssue(aiConfig({ GEMINI_API_KEY: 'synthetic', AI_PROVIDER_TIMEOUT_MS: value })),
    ).toBe('ai_disabled');
    expect(() => readPublicEnvironment({ AI_PROVIDER_TIMEOUT_MS: value })).toThrow(
      'AI_PROVIDER_TIMEOUT_MS',
    );
  },
);
it('bounds the maximum total to 110s, leaving at least 40s against Free wall/idle limits', () => {
  expect(configurationIssue({ ...testAiConfig, timeouts: aiTimeouts(100000) })).toBeNull();
  expect(aiTimeouts(100000).browserMs).toBe(110000);
});
it('does not start an operation after cancellation and clears deadline timers on completion', async () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  parent.abort();
  const deadline = aiDeadline(parent.signal, 75000),
    run = vi.fn();
  await expect(aiAbortable(run, deadline.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(run).not.toHaveBeenCalled();
  deadline.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it('handler caps the entire operation including a stalled quota reservation and never calls the provider', async () => {
  vi.useFakeTimers();
  const reserve = vi.fn(() => new Promise<AiReservation>(() => {})),
    provider = vi.fn();
  const pending = createAiHandler(testAiConfig, { reserve }, provider)(request());
  await vi.waitFor(() => expect(reserve).toHaveBeenCalledOnce());
  await vi.advanceTimersByTimeAsync(80000);
  expect((await pending).status).toBe(504);
  expect(provider).not.toHaveBeenCalled();
});
it.each(['deadline', 'caller'] as const)(
  'handler propagates %s cancellation and counts only one reservation',
  async (kind) => {
    vi.useFakeTimers();
    const controller = new AbortController(),
      reserve = vi.fn(async () => reserved);
    let providerSignal: AbortSignal | undefined;
    const provider = vi.fn(async (_input, _config, signal: AbortSignal) => {
      providerSignal = signal;
      return new Promise<never>(() => {});
    });
    const pending = createAiHandler(
      testAiConfig,
      { reserve },
      provider,
    )(request(controller.signal));
    await vi.waitFor(() => expect(provider).toHaveBeenCalledOnce());
    if (kind === 'caller') controller.abort();
    else await vi.advanceTimersByTimeAsync(80000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ code: 'ai_timeout' });
    expect(providerSignal?.aborted).toBe(true);
    expect(reserve).toHaveBeenCalledOnce();
    expect(provider).toHaveBeenCalledOnce();
  },
);
it('does not reserve quota or call Gemini for an already cancelled handler request', async () => {
  const controller = new AbortController();
  controller.abort();
  const reserve = vi.fn(),
    provider = vi.fn();
  expect(
    (await createAiHandler(testAiConfig, { reserve }, provider)(request(controller.signal))).status,
  ).toBe(504);
  expect(reserve).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});
it('provider cancels a stalled HTTP 200 body at its deadline and preserves the observed upstream status', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn(),
    fetcher = vi.fn(async () => new Response(new ReadableStream({ cancel })));
  vi.stubGlobal('fetch', fetcher);
  const pending = expect(
    generateWithGemini(aiInput(), testAiConfig, new AbortController().signal),
  ).rejects.toMatchObject({
    status: 504,
    code: 'ai_timeout',
    upstreamStatus: 200,
    diagnostic: { category: 'timeout', stage: 'response_body', upstreamStatus: 200 },
  });
  await vi.advanceTimersByTimeAsync(75000);
  await pending;
  expect(cancel).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
});
it('returns a real upstream 504 distinctly from a locally aborted SDK request', async () => {
  const fetcher = vi.fn(async () => new Response('PRIVATE raw provider message', { status: 504 }));
  vi.stubGlobal('fetch', fetcher);
  const response = await createAiHandler(testAiConfig, { reserve: async () => reserved })(
    request(),
  );
  expect(response.status).toBe(504);
  expect(await response.json()).toEqual({
    code: 'provider_deadline_exceeded',
    upstreamStatus: 504,
    diagnostic: {
      category: 'provider_deadline_exceeded',
      stage: 'http_headers',
      upstreamStatus: 504,
    },
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
