import { z } from 'zod';
import { currencyDigits, dateNumber } from '@/features/trips/domain/trip';

export const budgetCurrencies = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'KRW',
] as const;
export type Currency = (typeof budgetCurrencies)[number];
export const calendarDate = z
  .string()
  .refine((v) => Number.isFinite(dateNumber(v)), 'Enter a valid calendar date.');
export const moneySchema = z.number().int().min(0).max(100_000_000_000);
const positiveInteger = z.string().regex(/^[1-9]\d{0,14}$/);
export const rateSchema = z
  .object({
    from: z.enum(budgetCurrencies),
    to: z.enum(budgetCurrencies),
    numerator: positiveInteger,
    denominator: positiveInteger,
    referenceDate: calendarDate,
    source: z.string().trim().min(1).max(240),
  })
  .strict()
  .refine(
    (v) => v.from !== v.to || v.numerator === v.denominator,
    'Same-currency references must be 1:1.',
  );
export type ReferenceRate = z.infer<typeof rateSchema>;
export const rateDate = '2026-11-10';
export const rateSource = 'European Central Bank euro reference rates';
export const rateSourceUrl =
  'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
// Units per EUR, verified in the ECB's dated official charts. AED has no bundled quote.
export const euroRates: Partial<Record<Currency, string>> = {
  EUR: '1',
  USD: '1.1214',
  INR: '105.3315',
  JPY: '177.38',
  GBP: '0.83545',
};
function fraction(value: string) {
  const [whole, decimal = ''] = value.split('.');
  return { n: BigInt(whole! + decimal), d: 10n ** BigInt(decimal.length) };
}
export function manualRate(
  from: Currency,
  to: Currency,
  value: string,
  referenceDate: string,
): ReferenceRate {
  if (!/^\d{1,7}(\.\d{1,8})?$/.test(value) || Number(value) <= 0)
    throw new Error('Use a positive reference rate with up to eight decimal places.');
  const { n, d } = fraction(value);
  return rateSchema.parse({
    from,
    to,
    numerator: String(n),
    denominator: String(d),
    referenceDate,
    source: 'User-entered reference',
  });
}
export function referenceRate(
  from: Currency,
  to: Currency,
  rates: ReferenceRate[] = [],
): ReferenceRate | undefined {
  if (from === to)
    return {
      from,
      to,
      numerator: '1',
      denominator: '1',
      referenceDate: rateDate,
      source: 'Same currency; no conversion',
    };
  const manual = rates.find((r) => r.from === from && r.to === to);
  if (manual) return manual;
  const a = euroRates[from],
    b = euroRates[to];
  if (!a || !b) return undefined;
  const af = fraction(a),
    bf = fraction(b);
  return rateSchema.parse({
    from,
    to,
    numerator: String(bf.n * af.d),
    denominator: String(bf.d * af.n),
    referenceDate: rateDate,
    source: rateSource,
  });
}
export function roundedDivide(n: bigint, d: bigint) {
  if (n < 0n || d <= 0n) throw new Error('Invalid nonnegative calculation.');
  return (n + d / 2n) / d;
}
export function boundedMoney(n: bigint) {
  if (n > 100_000_000_000n || n < 0n)
    throw new Error('The calculated amount exceeds the supported limit. Reduce the inputs.');
  return Number(n);
}
export function convertMinor(amount: number, rate: ReferenceRate): number {
  moneySchema.parse(amount);
  rateSchema.parse(rate);
  return boundedMoney(
    roundedDivide(
      BigInt(amount) * BigInt(rate.numerator) * 10n ** BigInt(currencyDigits(rate.to)),
      BigInt(rate.denominator) * 10n ** BigInt(currencyDigits(rate.from)),
    ),
  );
}
export function amountMinor(text: string, currency: string) {
  const digits = currencyDigits(currency);
  if (!new RegExp(`^\\d{1,12}${digits ? '(\\.\\d{1,' + digits + '})?' : ''}$`).test(text))
    throw new Error(
      `Enter a nonnegative ${currency} amount with at most ${digits} decimal places.`,
    );
  const [whole, decimal = ''] = text.split('.');
  return boundedMoney(
    BigInt(whole!) * 10n ** BigInt(digits) + BigInt(decimal.padEnd(digits, '0') || '0'),
  );
}
export const amountText = (amount: number, currency: string) =>
  (amount / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency));
// Fixed-size cache: repeated expense rows reuse the same locale/currency formatter.
const moneyFormatters = new Map<Currency, Intl.NumberFormat>();
export function formatMoney(amount: number, currency: Currency) {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
    if (moneyFormatters.size < budgetCurrencies.length) moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount / 10 ** currencyDigits(currency));
}
