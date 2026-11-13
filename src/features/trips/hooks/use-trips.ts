import { useQuery } from '@tanstack/react-query';
import { tripRepository } from '../services/trip-repository';
export const tripQueryKey = ['local-trips'] as const;
export function useTrips() {
  return useQuery({ queryKey: tripQueryKey, queryFn: () => tripRepository.list(), staleTime: 0 });
}
