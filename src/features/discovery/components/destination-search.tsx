import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useDebounced } from '../hooks/use-debounced';
import { searchCurated } from '../data/curated';
import { discoveryErrorMessage, requestDiscovery } from '../services/discovery-client';
import type { PlaceKind } from '../../../../supabase/functions/_shared/contracts';
import { destinationCacheVersion } from '../../../../supabase/functions/_shared/contracts';
import { destinationContext, destinationTypeLabel } from '../domain/destination';
import { PlaceNameSuggestions } from './place-name-suggestions';

export function DestinationSearch({
  initialQuery = '',
  live = false,
  kind = 'locality',
  onSearch,
  onAlternative,
}: {
  initialQuery?: string;
  live?: boolean;
  kind?: PlaceKind;
  onSearch: (query: string) => void;
  onAlternative?: (query: string) => void;
}) {
  const id = useId();
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(value.trim());
  const query = useQuery({
    queryKey: ['autocomplete', destinationCacheVersion, debounced, kind],
    queryFn: ({ signal }) =>
      requestDiscovery({ operation: 'autocomplete', query: debounced, kind }, signal),
    enabled: live && open && debounced.length >= 3 && debounced === value.trim(),
    staleTime: 86400000,
    gcTime: 86400000,
  });
  const suggestions = live
    ? debounced === value.trim()
      ? (query.data?.destinations ?? [])
      : []
    : searchCurated(value).slice(0, 5);
  const expanded = open && value.trim().length >= 3;
  function submit() {
    setOpen(false);
    onSearch(value.trim());
  }
  function choose(index: number) {
    const result = suggestions[index];
    if (result) {
      setOpen(false);
      navigate(`/destinations/${encodeURIComponent(result.id)}`);
    }
  }
  return (
    <div className="destination-search-wrap">
      <form
        role="search"
        className="destination-search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={id}>Where would you like to go?</label>
        <div className="search-input-row">
          <Search aria-hidden="true" />
          <input
            id={id}
            role="combobox"
            type="text"
            value={value}
            maxLength={100}
            autoComplete="off"
            placeholder={
              live ? 'District, town, state or country…' : 'Try Kyoto, Portugal, or mountains…'
            }
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={`${id}-options`}
            aria-activedescendant={
              expanded && active >= 0 && suggestions[active] ? `${id}-option-${active}` : undefined
            }
            aria-describedby={`${id}-hint`}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false);
                setActive(-1);
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                setActive((previous) => Math.min(previous + 1, suggestions.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((previous) => Math.max(previous - 1, 0));
              }
              if (event.key === 'Enter' && expanded && active >= 0 && suggestions[active]) {
                event.preventDefault();
                choose(active);
              }
            }}
          />
          <Button type="submit">
            Explore <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
        <p id={`${id}-hint`} className="search-hint">
          {live
            ? 'Add a state or country to distinguish similar names. Type at least 3 characters.'
            : 'A small, considered collection. Search places, countries, or interests.'}
        </p>
        {expanded && (
          <div className="suggestion-panel">
            <ul id={`${id}-options`} role="listbox" aria-label="Destination suggestions">
              {suggestions.map((destination, index) => (
                <li
                  id={`${id}-option-${index}`}
                  key={destination.id}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                >
                  <span>{destination.name}</span>
                  <small>
                    {destinationTypeLabel(destination.kind)} ·{' '}
                    {destinationContext(destination) || 'Region not supplied'}
                  </small>
                </li>
              ))}
            </ul>
            <p role="status">
              {live && query.isFetching
                ? 'Finding suggestions…'
                : live && query.isError
                  ? discoveryErrorMessage(query.error)
                  : !suggestions.length
                    ? 'No suggestions. Submit your search to see results.'
                    : 'Use ↑ and ↓ to choose, Enter to open, or submit to see all results.'}
            </p>
          </div>
        )}
      </form>
      {live && onAlternative && <PlaceNameSuggestions query={value} onChoose={onAlternative} />}
    </div>
  );
}
