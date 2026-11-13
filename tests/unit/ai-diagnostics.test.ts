// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import {
  generateWithGemini,
  type AiDiagnostic,
  type AiProviderError,
} from '../../supabase/functions/_shared/ai/gemini-provider';
import { createAiHandler } from '../../supabase/functions/_shared/ai/handler';
import { aiInput, aiPlan, testAiConfig } from '../fixtures/ai';
afterEach(() => vi.unstubAllGlobals());
const envelope = (text: string) => ({
  candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }],
});
async function failure() {
  try {
    await generateWithGemini(aiInput(), testAiConfig, new AbortController().signal);
  } catch (error) {
    return error as AiProviderError;
  }
  throw new Error('Expected a sanitized failure.');
}
it.each([
  [400, 'provider_http_400'],
  [401, 'provider_http_401_403'],
  [403, 'provider_http_401_403'],
  [404, 'provider_http_404'],
  [429, 'provider_http_429'],
  [500, 'provider_http_5xx'],
  [503, 'provider_http_5xx'],
  [504, 'provider_deadline_exceeded'],
] as const)(
  'records upstream HTTP %s before the SDK can lose it parsing a malformed error body',
  async (status, category) => {
    const fetcher = vi.fn(
      async () =>
        new Response('{invalid private provider body', {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const error = await failure();
    expect(error.diagnostic).toEqual({ category, stage: 'http_headers', upstreamStatus: status });
    expect(error.upstreamStatus).toBe(status);
    if (status === 504)
      expect(error).toMatchObject({ code: 'provider_deadline_exceeded', status: 504 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify(error)).not.toContain('private provider body');
  },
);
it.each(['network', 'TLS'])(
  'distinguishes %s transport failure before upstream headers without exposing its cause',
  async (kind) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new TypeError('PRIVATE ' + kind + ' ' + testAiConfig.apiKey, {
          cause: { code: 'CERT_HAS_EXPIRED' },
        }),
      ),
    );
    const error = await failure();
    expect(error.diagnostic).toEqual({ category: 'network_or_tls', stage: 'request_send' });
    expect(error.upstreamStatus).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain(testAiConfig.apiKey);
  },
);
it('retains HTTP 200 when the transport stream fails after upstream headers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.error(new Error('private connection detail'));
            },
          }),
        ),
    ),
  );
  expect((await failure()).diagnostic).toEqual({
    category: 'network_or_tls',
    stage: 'response_body',
    upstreamStatus: 200,
  });
});
it('distinguishes an SDK preparation/serialization error before HTTP from a network failure', async () => {
  await expect(
    generateWithGemini(aiInput(), testAiConfig, new AbortController().signal, {
      models: {
        generateContent: vi.fn().mockRejectedValue(new TypeError('private SDK argument detail')),
      },
    }),
  ).rejects.toMatchObject({ diagnostic: { category: 'sdk_serialization', stage: 'sdk_prepare' } });
});
it('honors the SDK abort signal as well as the outer handler signal', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init: RequestInit | undefined) => {
      expect(init?.signal).toBeDefined();
      return new Promise<Response>((_resolve, reject) =>
        init!.signal!.addEventListener('abort', () => reject(new Error('private abort detail')), {
          once: true,
        }),
      );
    }),
  );
  const controller = new AbortController();
  const pending = generateWithGemini(aiInput(), testAiConfig, controller.signal);
  setTimeout(() => controller.abort(), 10);
  await expect(pending).rejects.toMatchObject({
    code: 'ai_timeout',
    diagnostic: { category: 'timeout', stage: 'request_send' },
  });
});
it('honors the extended provider deadline without aborting its caller or making a second request', async () => {
  vi.useFakeTimers();
  try {
    const fetcher = vi.fn(
      async (_url, init: RequestInit | undefined) =>
        new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener(
            'abort',
            () => reject(new Error('private timeout details')),
            { once: true },
          ),
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    const outer = new AbortController();
    const pending = expect(
      generateWithGemini(aiInput(), testAiConfig, outer.signal),
    ).rejects.toMatchObject({
      code: 'ai_timeout',
      diagnostic: { category: 'timeout', stage: 'request_send' },
    });
    await vi.advanceTimersByTimeAsync(32000);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(43010);
    await pending;
    expect(outer.signal.aborted).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});
it.each([
  ['not-json', 'sdk_decode', 'invalid_structured_output'],
  [JSON.stringify(envelope('not-json')), 'output_parse', 'invalid_structured_output'],
  [
    JSON.stringify(envelope(JSON.stringify({ summary: 'wrong date shape', days: [] }))),
    'output_validate',
    'validation_failure',
  ],
] as const)(
  'distinguishes envelope, structured JSON and Zod failures (%s)',
  async (body, stage, category) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { headers: { 'content-type': 'application/json' } })),
    );
    expect((await failure()).diagnostic).toEqual({ stage, category, upstreamStatus: 200 });
  },
);
it('observes only stages/status while the real SDK serializes the documented free Developer API request', async () => {
  const events: AiDiagnostic[] = [],
    fetcher = vi.fn(async () => Response.json(envelope(JSON.stringify(aiPlan()))));
  vi.stubGlobal('fetch', fetcher);
  await generateWithGemini(
    aiInput(),
    testAiConfig,
    new AbortController().signal,
    undefined,
    (event) => events.push(event),
  );
  const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
  expect(new URL(url).pathname).toBe('/v1beta/models/gemini-3.8-flash:generateContent');
  expect(new Headers(init.headers).get('x-server-timeout')).toBe('75');
  const payload = JSON.parse(String(init.body));
  expect(payload.tools).toEqual([]);
  expect(payload.generationConfig).toMatchObject({
    thinkingConfig: { thinkingLevel: 'LOW' },
    responseMimeType: 'application/json',
    maxOutputTokens: 2048,
  });
  expect(payload.generationConfig).not.toHaveProperty('temperature');
  expect(payload.generationConfig).not.toHaveProperty('candidateCount');
  expect(
    payload.generationConfig.responseJsonSchema.properties.days.items.properties.activities.items
      .properties.startTime.type,
  ).toEqual(['string', 'null']);
  expect(events.at(-1)).toEqual({ stage: 'complete', upstreamStatus: 200 });
  expect(JSON.stringify(events)).not.toContain('Kyoto');
  expect(JSON.stringify(events)).not.toContain(testAiConfig.apiKey);
});
it('returns safe HTTP diagnostics through the shared handler without raw content or headers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('PRIVATE ' + testAiConfig.apiKey, { status: 503 })),
  );
  const handler = createAiHandler(testAiConfig, {
    reserve: async () => ({ state: 'reserved', globalRemaining: 4, clientRemaining: 2 }),
  });
  const result = await handler(
    new Request('http://localhost:5173', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        authorization: 'Bearer ' + testAiConfig.developmentToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify(aiInput()),
    }),
  );
  const text = await result.text();
  expect(JSON.parse(text)).toEqual({
    code: 'provider_unavailable',
    upstreamStatus: 503,
    diagnostic: { category: 'provider_http_5xx', stage: 'http_headers', upstreamStatus: 503 },
  });
  expect(text).not.toContain(testAiConfig.apiKey);
  expect(text).not.toContain(testAiConfig.developmentToken);
});
it('classifies an independently expired SDK abort timer without claiming an upstream HTTP error', async () => {
  vi.useFakeTimers();
  const schedule = globalThis.setTimeout;
  let providerTimers = 0;
  // Keep the outer application timer at 75s; expire only the real SDK timer early.
  const timerSpy = vi
    .spyOn(globalThis, 'setTimeout')
    .mockImplementation((callback, delay, ...args) => {
      const milliseconds = delay === 75000 && ++providerTimers === 2 ? 1000 : delay;
      return schedule(callback, milliseconds, ...args);
    });
  try {
    const outer = new AbortController(),
      fetcher = vi.fn(
        async (_url, init: RequestInit | undefined) =>
          new Promise<Response>((_resolve, reject) =>
            init!.signal!.addEventListener(
              'abort',
              () => reject(new Error('private SDK timeout')),
              { once: true },
            ),
          ),
      );
    vi.stubGlobal('fetch', fetcher);
    const pending = expect(
      generateWithGemini(aiInput(), testAiConfig, outer.signal),
    ).rejects.toMatchObject({
      code: 'ai_timeout',
      status: 504,
      diagnostic: { category: 'timeout', stage: 'request_send' },
      upstreamStatus: undefined,
    });
    await vi.advanceTimersByTimeAsync(1100);
    await pending;
    expect(outer.signal.aborted).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(providerTimers).toBe(2);
  } finally {
    timerSpy.mockRestore();
    vi.useRealTimers();
  }
});
