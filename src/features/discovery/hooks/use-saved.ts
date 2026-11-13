import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSaved, writeSaved } from '../services/saved-repository';
import type { Destination } from '../../../../supabase/functions/_shared/contracts';

export function useSaved() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['saved-destinations'],
    queryFn: readSaved,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const mutation = useMutation({
    mutationKey: ['saved-destinations'],
    mutationFn: ({ destination, save }: { destination: Destination; save: boolean }) =>
      writeSaved(destination, save),
    onSuccess: () => client.invalidateQueries({ queryKey: ['saved-destinations'] }),
  });
  return { ...query, saved: query.data ?? [], mutation };
}
