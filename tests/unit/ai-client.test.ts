import { afterEach, it, expect, vi } from 'vitest';
import { aiStatus, requestAi, aiMessage, AiClientError } from '@/features/ai/services/ai-client';
import { aiInput, aiPlan } from '../fixtures/ai';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('turns a disconnected response stream into a safe timeout without reflecting network details', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error('PRIVATE NETWORK DIAGNOSTIC'));
    },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));
  await expect(requestAi(aiInput(), new AbortController().signal)).rejects.toMatchObject({
    code: 'ai_timeout',
  });
});
it('uses only the same-origin development endpoint and validates the complete returned plan', async () => {
  const input = aiInput(),
    fetcher = vi.fn().mockResolvedValue(
      Response.json({
        model: 'gemini-3.8-flash',
        plan: aiPlan(),
        chat: null,
        quota: { globalRemaining: 4, clientRemaining: 2 },
      }),
    );
  vi.stubGlobal('fetch', fetcher);
  expect((await requestAi(input, new AbortController().signal)).plan?.days).toHaveLength(2);
  expect(fetcher.mock.calls[0]![0]).toBe('/api/ai/generate');
  expect(fetcher.mock.calls[0]![1].headers).toEqual({ 'Content-Type': 'application/json' });
});
it('rejects the wrong model or malformed/unbounded output', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        model: 'gemini-3.5-flash-lite',
        plan: aiPlan(),
        chat: null,
        quota: { globalRemaining: 4, clientRemaining: 2 },
      }),
    ),
  );
  await expect(requestAi(aiInput(), new AbortController().signal)).rejects.toMatchObject({
    code: 'invalid_ai_response',
  });
});
it('makes preview-build/unconfigured status honest and gives safe quota/error messages', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Static preview</html>')));
  expect((await aiStatus(new AbortController().signal)).available).toBe(false);
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { code: 'daily_budget' },
          { status: 429, headers: { 'Retry-After': '3600' } },
        ),
      ),
  );
  await expect(requestAi(aiInput(), new AbortController().signal)).rejects.toMatchObject({
    code: 'daily_budget',
    retryAfter: 3600,
  });
  expect(aiMessage(new AiClientError('missing_key'))).toContain('server-side key');
  expect(aiMessage(new AiClientError('model_unavailable'))).toContain('no fallback');
});
it.each(['deadline', 'caller'] as const)(
  'cancels browser fetch by %s with exactly one request',
  async (kind) => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetcher = vi.fn(async (_url, init: RequestInit) => {
      requestSignal = init.signal!;
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    const pending = expect(requestAi(aiInput(), controller.signal)).rejects.toMatchObject({
      code: 'ai_timeout',
    });
    await vi.advanceTimersByTimeAsync(32000);
    expect(requestSignal?.aborted).toBe(false);
    if (kind === 'caller') controller.abort();
    else await vi.advanceTimersByTimeAsync(53000);
    await pending;
    expect(requestSignal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  },
);
it.each([200, 504])(
  'bounds stalled browser HTTP %s bodies with the same overall deadline',
  async (status) => {
    vi.useFakeTimers();
    const cancel = vi.fn(),
      fetcher = vi.fn(async () => new Response(new ReadableStream({ cancel }), { status }));
    vi.stubGlobal('fetch', fetcher);
    const pending = expect(
      requestAi(aiInput(), new AbortController().signal),
    ).rejects.toMatchObject({ code: 'ai_timeout' });
    await vi.advanceTimersByTimeAsync(85000);
    await pending;
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  },
);
it('does not start browser requests after cancellation and surfaces upstream deadline guidance safely', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn(async () =>
    Response.json({ code: 'provider_deadline_exceeded', upstreamStatus: 504 }, { status: 504 }),
  );
  vi.stubGlobal('fetch', fetcher);
  await expect(requestAi(aiInput(), controller.signal)).rejects.toMatchObject({
    code: 'ai_timeout',
  });
  expect(fetcher).not.toHaveBeenCalled();
  await expect(requestAi(aiInput(), new AbortController().signal)).rejects.toMatchObject({
    code: 'provider_deadline_exceeded',
  });
  expect(aiMessage(new AiClientError('provider_deadline_exceeded'))).toContain(
    'no automatic retry',
  );
  expect(fetcher).toHaveBeenCalledOnce();
});
