import { z } from 'zod';

export const plannerModel = 'gemini-3.8-flash';
export const assistantModel = 'gemini-3.5-flash-lite';
export const maximumAiDays = 14;
export const aiCategories = [
  'Sightseeing',
  'Food',
  'Nature',
  'Adventure',
  'Culture',
  'Shopping',
  'Relaxation',
  'Other',
] as const;
const clean = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) =>
      [...value].every(
        (char) => char.charCodeAt(0) >= 32 || char === '\n' || char === '\t' || char === '\r',
      ),
    );
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const n = Date.parse(value + 'T00:00:00Z');
    return (
      Number.isFinite(n) &&
      new Date(n).toISOString().slice(0, 10) === value &&
      value >= '1900-01-01' &&
      value <= '2199-12-31'
    );
  });
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const aiContextSchema = z
  .object({
    destination: clean(100).min(2),
    country: clean(100),
    dates: z.array(dateOnly).min(1).max(maximumAiDays),
    travelers: z.number().int().min(1).max(50),
    budgetMinor: z.number().int().min(0).max(100_000_000_000),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW']),
    interests: z.array(clean(30).min(1)).min(1).max(10),
    pace: z.enum(['Relaxed', 'Balanced', 'Packed']),
    existing: z
      .array(
        z
          .object({
            date: dateOnly,
            title: clean(120),
            durationMinutes: z.number().int().min(1).max(1440),
            startTime: time.nullable(),
          })
          .strict(),
      )
      .max(100),
    places: z.array(z.object({ name: clean(120).min(1) }).strict()).max(12),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (let i = 1; i < value.dates.length; i++)
      if (Date.parse(value.dates[i]!) - Date.parse(value.dates[i - 1]!) !== 86400000)
        ctx.addIssue({ code: 'custom', message: 'Choose consecutive destination-local dates.' });
    if (value.existing.some((a) => !value.dates.includes(a.date)))
      ctx.addIssue({
        code: 'custom',
        message: 'Existing activities must belong to the requested dates.',
      });
  });
export const aiRequestSchema = z
  .object({
    requestId: z.uuid(),
    clientId: z.uuid(),
    operation: z.enum(['trip', 'day', 'alternatives', 'refine', 'chat']),
    context: aiContextSchema,
    instruction: clean(800),
    messages: z
      .array(z.object({ role: z.enum(['user', 'model']), text: clean(1200).min(1) }).strict())
      .max(6),
    consent: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (['day', 'alternatives'].includes(value.operation) && value.context.dates.length !== 1)
      ctx.addIssue({ code: 'custom', message: 'Day suggestions require exactly one date.' });
    if (
      value.operation === 'chat' &&
      (!value.messages.length || value.messages.at(-1)?.role !== 'user')
    )
      ctx.addIssue({ code: 'custom', message: 'Ask a travel question.' });
    if (value.operation !== 'chat' && value.messages.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Planning requests do not accept conversation history.',
      });
    for (let i = 1; i < value.messages.length; i++)
      if (value.messages[i]!.role === value.messages[i - 1]!.role)
        ctx.addIssue({ code: 'custom', message: 'Conversation roles must alternate.' });
    if (
      /AIza[\w-]{30,}|sb_(?:secret|publishable)_[\w-]{16,}|sbp_[\w-]{20,}|-----BEGIN.*PRIVATE KEY/.test(
        JSON.stringify(value),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Remove credentials from planning text.' });
  });
export const aiActivitySchema = z
  .object({
    title: clean(120).min(2),
    description: clean(600).min(1),
    durationMinutes: z.number().int().min(10).max(720),
    startTime: time.nullable(),
    category: z.enum(aiCategories),
    locationName: clean(120),
    placeIndex: z.number().int().min(0).max(11).nullable(),
  })
  .strict();
export const aiPlanSchema = z
  .object({
    summary: clean(800).min(1),
    days: z
      .array(
        z.object({ date: dateOnly, activities: z.array(aiActivitySchema).min(1).max(6) }).strict(),
      )
      .min(1)
      .max(maximumAiDays),
  })
  .strict();
export const aiChatSchema = z
  .object({ answer: clean(3600).min(1), followUps: z.array(clean(140).min(1)).max(3) })
  .strict();
export type AiRequest = z.infer<typeof aiRequestSchema>;
export type AiContext = z.infer<typeof aiContextSchema>;
export type AiPlan = z.infer<typeof aiPlanSchema>;
export type AiActivity = z.infer<typeof aiActivitySchema>;
export type AiChat = z.infer<typeof aiChatSchema>;
export interface AiResponse {
  model: typeof plannerModel | typeof assistantModel;
  plan: AiPlan | null;
  chat: AiChat | null;
}
export function validatePlan(raw: unknown, context: AiContext): AiPlan {
  const plan = aiPlanSchema.parse(raw);
  if (JSON.stringify(plan.days.map((day) => day.date)) !== JSON.stringify(context.dates))
    throw new Error('AI returned incorrect days.');
  for (const day of plan.days) {
    const names = day.activities.map((a) =>
      a.title.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim(),
    );
    if (new Set(names).size !== names.length) throw new Error('AI returned duplicate activities.');
    if (day.activities.some((a) => a.placeIndex !== null && a.placeIndex >= context.places.length))
      throw new Error('AI referenced an unknown place.');
  }
  return plan;
}
// Intentionally simple provider schemas; application Zod validation enforces all bounds/relationships.
const activityProperties = {
  title: { type: 'string' },
  description: { type: 'string' },
  durationMinutes: { type: 'integer' },
  startTime: { type: ['string', 'null'] },
  category: { type: 'string', enum: [...aiCategories] },
  locationName: { type: 'string' },
  placeIndex: { type: ['integer', 'null'] },
};
export const planJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: activityProperties,
              required: Object.keys(activityProperties),
              additionalProperties: false,
            },
          },
        },
        required: ['date', 'activities'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'days'],
  additionalProperties: false,
};
export const chatJsonSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    followUps: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'followUps'],
  additionalProperties: false,
};
