import { z } from 'zod';
import type { Itinerary } from '@/features/itinerary/domain/itinerary';
import { routeKey, routeWaypoints } from '@/features/mapping/domain/map';
const point = z
  .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
  .strict();
const cached = z.object({
  fetchedAt: z.iso.datetime(),
  route: z.object({
    mode: z.enum(['walk', 'drive']),
    source: z.literal('geoapify'),
    distanceMeters: z.number().positive().max(500000),
    waypoints: z.array(point).min(2).max(6),
  }),
});
export function availableRouteDistances(
  plan: Itinerary,
  lookup: (signature: string) => unknown,
  now: number,
) {
  return plan.days.flatMap((day) => {
    const points = routeWaypoints(day.activities).filter(
      (p, i, all) =>
        !i || p.latitude !== all[i - 1]!.latitude || p.longitude !== all[i - 1]!.longitude,
    );
    return (['walk', 'drive'] as const).flatMap((mode) => {
      const value = cached.safeParse(lookup(routeKey(mode, points)));
      if (
        !value.success ||
        value.data.route.mode !== mode ||
        JSON.stringify(value.data.route.waypoints) !== JSON.stringify(points) ||
        Date.parse(value.data.fetchedAt) > now ||
        now - Date.parse(value.data.fetchedAt) >= 86400000
      )
        return [];
      return [
        {
          date: day.date,
          mode,
          distanceMeters: Math.round(value.data.route.distanceMeters),
          fetchedAt: value.data.fetchedAt,
        },
      ];
    });
  });
}
