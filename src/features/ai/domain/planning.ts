import type {
  ItineraryState,
  ActivityBatchItem,
} from '@/features/itinerary/services/itinerary-repository';
import type { ActivityInput } from '@/features/itinerary/domain/itinerary';
import {
  aiContextSchema,
  type AiContext,
  type AiPlan,
  type AiActivity,
} from '../../../../supabase/functions/_shared/ai/contracts';
import type { MapLocation } from '@/features/mapping/domain/map';
export interface AiSuggestion {
  id: string;
  date: string;
  activity: AiActivity;
  selected: boolean;
  replaceId: string;
  place: MapLocation | null;
}
export function savedAiPlaces(state: ItineraryState, dates: string[]): MapLocation[] {
  const known = state.plan.days
    .filter((d) => dates.includes(d.date))
    .flatMap((d) => d.activities)
    .filter((a) => a.locationName && a.latitude !== undefined && a.longitude !== undefined);
  return [
    ...new Map(
      known.map((a) => [
        `${a.locationName}:${a.latitude}:${a.longitude}`,
        {
          id: a.id,
          name: a.locationName,
          address: 'Saved coordinate selected or entered by you',
          latitude: a.latitude!,
          longitude: a.longitude!,
          source: 'curated' as const,
        },
      ]),
    ).values(),
  ].slice(0, 12);
}
export function planningContext(
  state: ItineraryState,
  dates: string[],
  pace: AiContext['pace'],
  includeNames: boolean,
): AiContext {
  const { trip, plan } = state;
  const result = aiContextSchema.safeParse({
    destination: trip.destination.name,
    country: trip.destination.country,
    dates,
    travelers: trip.travelers,
    budgetMinor: trip.budgetMinor,
    currency: trip.currency,
    interests: trip.interests,
    pace,
    existing: plan.days
      .filter((d) => dates.includes(d.date))
      .flatMap((d) =>
        d.activities.map((a) => ({
          date: d.date,
          title: includeNames ? a.title : '',
          durationMinutes: a.durationMinutes,
          startTime: a.startTime ?? null,
        })),
      ),
    places: savedAiPlaces(state, dates).map((p) => ({ name: p.name })),
  });
  if (!result.success)
    throw new Error(
      'This brief exceeds AI’s context limits. Try a single day or a shorter brief; your saved itinerary is unchanged.',
    );
  return result.data;
}
export function suggestionsFromPlan(plan: AiPlan, places: MapLocation[]): AiSuggestion[] {
  return plan.days.flatMap((day) =>
    day.activities.map((activity) => ({
      id: crypto.randomUUID(),
      date: day.date,
      activity,
      selected: false,
      replaceId: '',
      place: activity.placeIndex === null ? null : (places[activity.placeIndex] ?? null),
    })),
  );
}
export function selectedActivityBatch(
  state: ItineraryState,
  suggestions: AiSuggestion[],
): ActivityBatchItem[] {
  return suggestions
    .filter((s) => s.selected)
    .map((s) => {
      const existing = s.replaceId
        ? state.plan.days
            .find((d) => d.date === s.date)
            ?.activities.find((a) => a.id === s.replaceId)
        : undefined;
      if (s.replaceId && !existing) throw new Error('The replacement target no longer exists.');
      const { id: _id, ...original } = existing ?? { id: '' };
      void _id;
      const input: ActivityInput = {
        description: 'AI idea — details unverified. ' + s.activity.description,
        notes: '',
        currency: state.trip.currency,
        locationName: s.activity.locationName,
        ...original,
        date: s.date,
        title: s.activity.title,
        durationMinutes: s.activity.durationMinutes,
        category: s.activity.category,
      };
      // A replacement keeps original notes, costs and coordinates unless a new place is explicitly chosen.
      input.description = 'AI idea — details unverified. ' + s.activity.description;
      if (s.activity.startTime) input.startTime = s.activity.startTime;
      else delete input.startTime;
      if (s.place) {
        input.locationName = s.place.name;
        input.latitude = s.place.latitude;
        input.longitude = s.place.longitude;
      }
      return { input, ...(s.replaceId ? { replaceId: s.replaceId } : {}) };
    });
}
