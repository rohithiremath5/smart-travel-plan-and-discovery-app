import { amountMinor, amountText } from './currency';
import { assumptionsSchema, type Budget } from './budget';
export const moneyKeys = [
  'transportRateMinor',
  'mealRateMinor',
  'roomRateMinor',
  'activityRateMinor',
  'targetMinor',
] as const;
export const estimateLabels = {
  travelers: 'Travelers in this estimate',
  days: 'Travel days',
  distanceMeters: 'Distance (km)',
  vehicles: 'Number of vehicles',
  transportRateMinor: 'Price per vehicle-km',
  meals: 'Meals per person per day',
  mealRateMinor: 'Price per meal',
  nights: 'Accommodation nights',
  occupants: 'People per room',
  roomRateMinor: 'Price per room per night',
  activityRateMinor: 'Activity spending per person per day',
  contingencyBps: 'Contingency (%)',
  targetMinor: 'Overall spending target',
};
export type EstimateKey = keyof typeof estimateLabels;
export function estimateFields(budget: Budget) {
  return Object.fromEntries(
    Object.entries(budget.assumptions)
      .filter(([k]) => k in estimateLabels)
      .map(([k, v]) => [
        k,
        moneyKeys.includes(k as (typeof moneyKeys)[number])
          ? amountText(v as number, budget.currency)
          : String(
              k === 'distanceMeters'
                ? (v as number) / 1000
                : k === 'contingencyBps'
                  ? (v as number) / 100
                  : v,
            ),
      ]),
  );
}
export function parseEstimateFields(fields: Record<string, string>, budget: Budget) {
  const result = { ...budget.assumptions };
  for (const key of Object.keys(estimateLabels) as EstimateKey[]) {
    const text = fields[key] ?? '';
    if (moneyKeys.includes(key as (typeof moneyKeys)[number]))
      result[key] = amountMinor(text, budget.currency);
    else if (key === 'distanceMeters' || key === 'contingencyBps') {
      const places = key === 'distanceMeters' ? 3 : 2;
      if (!new RegExp(`^\\d{1,6}(\\.\\d{1,${places}})?$`).test(text))
        throw new Error(
          `${estimateLabels[key]} requires a nonnegative decimal number (up to ${places} decimal places).`,
        );
      const [whole, decimal = ''] = text.split('.');
      result[key] = Number(
        BigInt(whole!) * 10n ** BigInt(places) + BigInt(decimal.padEnd(places, '0')),
      );
    } else {
      if (!/^\d+$/.test(text)) throw new Error(`${estimateLabels[key]} requires a whole number.`);
      result[key] = Number(text);
    }
  }
  const parsed = assumptionsSchema.safeParse(result);
  if (!parsed.success)
    throw new Error(
      'Check bounds: 1–50 travelers/vehicles/occupants, 1–366 days, 0–366 nights, 0–10 meals, 0–100% contingency and bounded amounts.',
    );
  return parsed.data;
}
