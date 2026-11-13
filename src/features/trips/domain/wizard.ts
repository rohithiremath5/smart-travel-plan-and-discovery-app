import {
  currencyDigits,
  parseBudget,
  tripDuration,
  tripInputSchema,
  type Trip,
  type TripDestination,
  type TripInput,
} from './trip';
export const wizardSteps = [
  'Destination',
  'Travel dates',
  'Travelers',
  'Budget',
  'Interests',
  'Travel pace',
  'Review & create',
] as const;
export type TripDraft = Omit<TripInput, 'destination' | 'budgetMinor'> & {
  destination: TripDestination | null;
  budgetAmount: string;
};
export function initialDraft(trip?: Trip): TripDraft {
  return trip
    ? {
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        groupType: trip.groupType,
        budgetAmount: (trip.budgetMinor / 10 ** currencyDigits(trip.currency)).toFixed(
          currencyDigits(trip.currency),
        ),
        currency: trip.currency,
        budgetPreference: trip.budgetPreference,
        interests: trip.interests,
        pace: trip.pace,
        status: trip.status,
      }
    : {
        title: '',
        destination: null,
        startDate: '',
        endDate: '',
        travelers: 1,
        groupType: 'Solo',
        budgetAmount: '',
        currency: 'USD',
        budgetPreference: 'Flexible',
        interests: [],
        pace: 'Balanced',
        status: 'Planning',
      };
}
export function draftInput(draft: TripDraft) {
  const { budgetAmount, ...rest } = draft;
  return { ...rest, budgetMinor: parseBudget(budgetAmount, draft.currency) };
}
const fields = [
  ['destination'],
  ['startDate', 'endDate'],
  ['travelers', 'groupType'],
  ['budgetMinor', 'currency', 'budgetPreference'],
  ['interests'],
  ['pace'],
  ['title', 'status'],
];
export function validateStep(draft: TripDraft, step: number) {
  const result = tripInputSchema.safeParse(draftInput(draft));
  const errors: Record<string, string> = {};
  if (!result.success)
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (step === 6 || fields[step]?.includes(key))
        errors[key] =
          key === 'destination'
            ? 'Choose a destination or add a place manually.'
            : key === 'budgetMinor'
              ? 'Enter a valid non-negative amount with the correct currency decimals.'
              : issue.message;
    }
  if (step === 1 || step === 6) {
    const days = tripDuration(draft.startDate, draft.endDate);
    if (Number.isFinite(days) && (days < 1 || days > 366))
      errors.endDate = 'End date must be on or after the start, with at most 366 days.';
  }
  return errors;
}
