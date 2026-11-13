// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { GenerateContentResponse, FinishReason } from '@google/genai';
import { aiInput, aiPlan, testAiConfig } from '../fixtures/ai';
import {
  aiRequestSchema,
  validatePlan,
  plannerModel,
  assistantModel,
} from '../../supabase/functions/_shared/ai/contracts';
import { configurationIssue } from '../../supabase/functions/_shared/ai/config';
import {
  generateWithGemini,
  buildPrompt,
  AiProviderError,
  systemInstruction,
} from '../../supabase/functions/_shared/ai/gemini-provider';
import { createAiHandler, type AiReservation } from '../../supabase/functions/_shared/ai/handler';
function response(value: unknown) {
  const result = new GenerateContentResponse();
  result.candidates = [
    { finishReason: FinishReason.STOP, content: { parts: [{ text: JSON.stringify(value) }] } },
  ];
  return result;
}
it('uses the real SDK serializer and one bounded HTTP transport with a mocked provider response', async () => {
  const fetchMock = vi.fn(async () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { role: 'model', parts: [{ text: JSON.stringify(aiPlan()) }] },
        },
      ],
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  try {
    const result = await generateWithGemini(aiInput(), testAiConfig, new AbortController().signal);
    expect(result.plan?.days).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(String(url)).toContain('gemini-3.8-flash:generateContent');
    const payload = JSON.parse(String(init.body));
    expect(payload.generationConfig.responseMimeType).toBe('application/json');
    expect(payload.generationConfig.maxOutputTokens).toBeLessThanOrEqual(8192);
  } finally {
    vi.unstubAllGlobals();
  }
});
it.each([
  ['trip', plannerModel],
  ['refine', plannerModel],
  ['day', plannerModel],
  ['alternatives', plannerModel],
  ['chat', assistantModel],
] as const)(
  'routes %s to only its approved model without retries, tools or continuation',
  async (operation, model) => {
    const input = aiInput(operation),
      raw =
        operation === 'chat'
          ? { answer: 'A synthetic answer, not live.', followUps: ['More gardens?'] }
          : aiPlan(input.context.dates);
    const generateContent = vi.fn().mockResolvedValue(response(raw));
    const result = await generateWithGemini(input, testAiConfig, new AbortController().signal, {
      models: { generateContent },
    });
    expect(result.model).toBe(model);
    expect(generateContent).toHaveBeenCalledOnce();
    expect(generateContent.mock.calls[0]![0]).toMatchObject({
      model,
      config: {
        responseMimeType: 'application/json',
        automaticContinuation: false,
        tools: [],
        httpOptions: { retryOptions: { attempts: 1 } },
      },
    });
    expect(generateContent.mock.calls[0]![0].contents).not.toContain(testAiConfig.apiKey);
  },
);
it('constructs preference-aware, bounded context without local IDs or private notes', () => {
  const input = aiInput();
  const prompt = buildPrompt(input);
  for (const text of ['Kyoto', '2030-03-21', 'Culture', '120000', 'Relaxed'])
    expect(prompt).toContain(text);
  expect(prompt).not.toContain(input.clientId);
  expect(prompt).not.toContain(input.requestId);
  expect(systemInstruction).toContain('Never call tools');
  expect(
    aiRequestSchema.safeParse({ ...input, context: { ...input.context, notes: 'Private note' } })
      .success,
  ).toBe(false);
});
it.each([
  'wrong days',
  'duplicate activities',
  'invented coordinates',
  'unknown place index',
] as const)('rejects %s in AI output', async (kind) => {
  const plan = aiPlan();
  if (kind === 'wrong days') plan.days.pop();
  if (kind === 'duplicate activities')
    plan.days[0]!.activities.push({ ...plan.days[0]!.activities[0]! });
  if (kind === 'invented coordinates')
    Object.assign(plan.days[0]!.activities[0]!, { latitude: 35, longitude: 135 });
  if (kind === 'unknown place index') plan.days[0]!.activities[0]!.placeIndex = 2;
  const generateContent = vi.fn().mockResolvedValue(response(plan));
  await expect(
    generateWithGemini(aiInput(), testAiConfig, new AbortController().signal, {
      models: { generateContent },
    }),
  ).rejects.toMatchObject({ code: 'invalid_ai_response' });
});
it('rejects incorrect day order, unknown fields, bad dates and oversized prompts', () => {
  const input = aiInput();
  expect(() =>
    validatePlan({ ...aiPlan(), days: [...aiPlan().days].reverse() }, input.context),
  ).toThrow('incorrect days');
  expect(aiRequestSchema.safeParse({ ...input, instruction: 'x'.repeat(801) }).success).toBe(false);
  expect(
    aiRequestSchema.safeParse({ ...input, context: { ...input.context, dates: ['2030-02-30'] } })
      .success,
  ).toBe(false);
  expect(aiRequestSchema.safeParse({ ...input, providerKey: 'not-accepted' }).success).toBe(false);
  expect(aiRequestSchema.safeParse({ ...input, operation: 'day' }).success).toBe(false);
});
it.each([
  [429, 'provider_quota'],
  [400, 'provider_request_rejected'],
  [403, 'provider_access_denied'],
  [404, 'model_unavailable'],
  [500, 'provider_unavailable'],
] as const)('sanitizes provider HTTP %s', async (status, code) => {
  await expect(
    generateWithGemini(aiInput(), testAiConfig, new AbortController().signal, {
      models: {
        generateContent: vi
          .fn()
          .mockRejectedValue({ status, message: 'DO NOT REFLECT PROVIDER BODY' }),
      },
    }),
  ).rejects.toMatchObject({ code });
});
it('handles timeout and incomplete/non-JSON output without a second model call', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    generateWithGemini(aiInput(), testAiConfig, controller.signal, {
      models: { generateContent: vi.fn().mockRejectedValue(new Error('raw network detail')) },
    }),
  ).rejects.toMatchObject({ code: 'ai_timeout' });
  const bad = response({});
  bad.candidates![0]!.finishReason = FinishReason.MAX_TOKENS;
  await expect(
    generateWithGemini(aiInput(), testAiConfig, new AbortController().signal, {
      models: { generateContent: vi.fn().mockResolvedValue(bad) },
    }),
  ).rejects.toMatchObject({ code: 'incomplete_ai_response' });
});
it('requires exact models, credentials and hard application ceilings', () => {
  expect(configurationIssue({ ...testAiConfig, apiKey: '' })).toBe('missing_key');
  expect(configurationIssue({ ...testAiConfig, model: 'gemini-flash-latest' })).toBe(
    'model_unavailable',
  );
  expect(configurationIssue({ ...testAiConfig, dailyBudget: 6 })).toBe('ai_disabled');
  expect(configurationIssue({ ...testAiConfig, clientBudget: 4 })).toBe('ai_disabled');
});
function webRequest(body: unknown, token = testAiConfig.developmentToken) {
  return new Request('http://localhost:5173/api/ai/generate', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
it.each([
  ['limited', 429, 'daily_budget'],
  ['client_limited', 429, 'client_budget'],
  ['busy', 429, 'request_busy'],
  ['duplicate', 409, 'duplicate_request'],
] as const)('fails %s before provider access', async (state, status, code) => {
  const provider = vi.fn();
  const handler = createAiHandler(
    testAiConfig,
    { reserve: vi.fn().mockResolvedValue({ state, globalRemaining: 0, clientRemaining: 0 }) },
    provider,
  );
  const result = await handler(webRequest(aiInput()));
  expect(result.status).toBe(status);
  expect(await result.json()).toEqual({ code });
  expect(provider).not.toHaveBeenCalled();
});
it('denies missing confidential development capability independently of CORS/client IDs', async () => {
  const reserve = vi.fn();
  const handler = createAiHandler(testAiConfig, { reserve });
  expect((await handler(webRequest(aiInput(), ''))).status).toBe(403);
  expect(reserve).not.toHaveBeenCalled();
});
it('rejects missing configuration, invalid requests and excess request bytes before reservation', async () => {
  const reserve = vi.fn();
  const handler = createAiHandler({ ...testAiConfig, apiKey: '' }, { reserve });
  expect((await handler(webRequest(aiInput()))).status).toBe(503);
  const configured = createAiHandler(testAiConfig, { reserve });
  expect(
    (await configured(webRequest({ ...aiInput(), privateNotes: 'not accepted' }))).status,
  ).toBe(400);
  expect((await configured(webRequest({ value: 'x'.repeat(25000) }))).status).toBe(413);
  expect(reserve).not.toHaveBeenCalled();
});
it('counts a failed request and never echoes a confidential value', async () => {
  const reservation: AiReservation = { state: 'reserved', globalRemaining: 4, clientRemaining: 2 };
  const handler = createAiHandler(
    testAiConfig,
    { reserve: vi.fn().mockResolvedValue(reservation) },
    async () => ({
      model: assistantModel,
      plan: null,
      chat: { answer: testAiConfig.apiKey, followUps: [] },
    }),
  );
  const result = await handler(webRequest(aiInput('chat')));
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain(testAiConfig.apiKey);
  const error = new AiProviderError('provider_quota', 429);
  const failed = createAiHandler(
    testAiConfig,
    { reserve: vi.fn().mockResolvedValue(reservation) },
    async () => {
      throw error;
    },
  );
  const quota = await failed(webRequest(aiInput()));
  expect(quota.status).toBe(429);
  expect(quota.headers.get('Retry-After')).toBe('60');
});
