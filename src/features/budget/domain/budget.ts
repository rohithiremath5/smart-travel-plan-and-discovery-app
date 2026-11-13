import { z } from 'zod';
import { tripDuration, type Trip } from '@/features/trips/domain/trip';
import {
  budgetCurrencies,
  calendarDate,
  moneySchema,
  rateSchema,
  roundedDivide,
  boundedMoney,
  convertMinor,
  type Currency,
} from './currency';
export const expenseCategories = [
  'Transportation',
  'Food',
  'Accommodation',
  'Activities',
  'Other',
] as const;
export const expenseSchema = z
  .object({
    id: z.uuid(),
    amountMinor: moneySchema.refine((v) => v > 0, 'Expense must be greater than zero.'),
    currency: z.enum(budgetCurrencies),
    category: z.enum(expenseCategories),
    date: calendarDate.optional(),
    description: z.string().trim().max(160),
    conversion: rateSchema,
    convertedMinor: moneySchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    try {
      if (
        v.conversion.from !== v.currency ||
        convertMinor(v.amountMinor, v.conversion) !== v.convertedMinor
      )
        ctx.addIssue({ code: 'custom', message: 'Expense conversion is inconsistent.' });
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid expense conversion.' });
    }
  });
export type Expense = z.infer<typeof expenseSchema>;
export const assumptionsSchema = z
  .object({
    travelers: z.number().int().min(1).max(50),
    days: z.number().int().min(1).max(366),
    distanceMeters: z.number().int().min(0).max(100_000_000),
    distanceMode: z.enum(['total', 'return']),
    distanceSource: z.string().max(180),
    vehicles: z.number().int().min(1).max(50),
    transportRateMinor: moneySchema,
    meals: z.number().int().min(0).max(10),
    mealRateMinor: moneySchema,
    nights: z.number().int().min(0).max(366),
    occupants: z.number().int().min(1).max(50),
    roomRateMinor: moneySchema,
    activityRateMinor: moneySchema,
    contingencyBps: z.number().int().min(0).max(10000),
    targetMinor: moneySchema,
  })
  .strict();
export const budgetSchema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: z.uuid(),
    revision: z.number().int().min(0),
    currency: z.enum(budgetCurrencies),
    basis: z
      .object({
        travelers: z.number().int().min(1).max(50),
        startDate: calendarDate,
        endDate: calendarDate,
      })
      .strict(),
    assumptions: assumptionsSchema,
    custom: z
      .array(
        z
          .object({
            id: z.uuid(),
            label: z.string().trim().min(1).max(100),
            amountMinor: moneySchema,
          })
          .strict(),
      )
      .max(50),
    manualRates: z.array(rateSchema).max(30),
    expenses: z.array(expenseSchema).max(300),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = [...v.custom, ...v.expenses].map((x) => x.id);
    if (
      new Set(ids).size !== ids.length ||
      v.expenses.some((x) => x.conversion.to !== v.currency) ||
      new Set(v.manualRates.map((x) => x.from + ':' + x.to)).size !== v.manualRates.length ||
      v.manualRates.some((x) => x.to !== v.currency) ||
      tripDuration(v.basis.startDate, v.basis.endDate) < 1
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid budget ownership, conversion or duplicate IDs.',
      });
  });
export type Budget = z.infer<typeof budgetSchema>;
export function emptyBudget(trip: Trip): Budget {
  const india = /^(india|in)$/i.test(trip.destination.country.trim());
  const currency: Currency = india ? 'INR' : trip.currency;
  return {
    schemaVersion: 1,
    tripId: trip.id,
    revision: 0,
    currency,
    basis: { travelers: trip.travelers, startDate: trip.startDate, endDate: trip.endDate },
    assumptions: {
      travelers: trip.travelers,
      days: tripDuration(trip.startDate, trip.endDate),
      distanceMeters: 0,
      distanceMode: 'total',
      distanceSource: 'Manual distance',
      vehicles: 1,
      transportRateMinor: india ? 1000 : 0,
      meals: 3,
      mealRateMinor: india ? 25000 : 0,
      nights: Math.max(tripDuration(trip.startDate, trip.endDate) - 1, 0),
      occupants: 2,
      roomRateMinor: india ? 150000 : 0,
      activityRateMinor: india ? 30000 : 0,
      contingencyBps: 0,
      targetMinor: currency === trip.currency ? trip.budgetMinor : 0,
    },
    custom: [],
    manualRates: [],
    expenses: [],
  };
}
export function calculateBudget(budget: Budget) {
  const b = budgetSchema.parse(budget),
    a = b.assumptions;
  const transport = boundedMoney(
    roundedDivide(
      BigInt(a.distanceMeters) *
        BigInt(a.distanceMode === 'return' ? 2 : 1) *
        BigInt(a.transportRateMinor) *
        BigInt(a.vehicles),
      1000n,
    ),
  );
  const food = boundedMoney(
    BigInt(a.travelers) * BigInt(a.meals) * BigInt(a.days) * BigInt(a.mealRateMinor),
  );
  const rooms = Math.ceil(a.travelers / a.occupants);
  const accommodation = boundedMoney(BigInt(rooms) * BigInt(a.nights) * BigInt(a.roomRateMinor));
  const activities = boundedMoney(
    BigInt(a.travelers) * BigInt(a.days) * BigInt(a.activityRateMinor),
  );
  const custom = boundedMoney(b.custom.reduce((n, x) => n + BigInt(x.amountMinor), 0n));
  const subtotal =
    BigInt(transport) + BigInt(food) + BigInt(accommodation) + BigInt(activities) + BigInt(custom);
  const contingency = boundedMoney(roundedDivide(subtotal * BigInt(a.contingencyBps), 10000n));
  const total = boundedMoney(subtotal + BigInt(contingency));
  const actual = boundedMoney(b.expenses.reduce((n, x) => n + BigInt(x.convertedMinor), 0n));
  return {
    categories: {
      Transportation: transport,
      Food: food,
      Accommodation: accommodation,
      Activities: activities,
      Other: custom,
      Contingency: contingency,
    },
    rooms,
    total,
    actual,
    remaining: (a.targetMinor || total) - actual,
    overTarget: a.targetMinor ? Math.max(0, total - a.targetMinor) : 0,
    perTraveler: Number(roundedDivide(BigInt(total), BigInt(a.travelers))),
    perDay: Number(roundedDivide(BigInt(total), BigInt(a.days))),
    actualCategories: Object.fromEntries(
      expenseCategories.map((c) => [
        c,
        b.expenses.filter((x) => x.category === c).reduce((n, x) => n + x.convertedMinor, 0),
      ]),
    ),
  };
}
export function validateBudget(tripId: string, value: unknown): Budget {
  const result = budgetSchema.safeParse(value);
  if (!result.success || result.data.tripId !== tripId)
    throw new Error('Invalid or unsupported budget data. No records were changed.');
  calculateBudget(result.data);
  return result.data;
}
export function budgetContent(b: Budget) {
  const { tripId, revision, ...rest } = b;
  void tripId;
  void revision;
  return JSON.stringify({
    ...rest,
    custom: b.custom.map(({ id, ...x }) => {
      void id;
      return x;
    }),
    expenses: b.expenses.map(({ id, ...x }) => {
      void id;
      return x;
    }),
  });
}
