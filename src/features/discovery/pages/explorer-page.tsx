import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, SearchX, Globe2 } from 'lucide-react';
import { useState } from 'react';
import { appConfig } from '@/app/config/environment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { DestinationSearch } from '../components/destination-search';
import { DestinationCard } from '../components/destination-card';
import { SourceNote } from '../components/source-note';
import { QueryFeedback } from '../components/query-feedback';
import { interests, searchCurated } from '../data/curated';
import { requestDiscovery } from '../services/discovery-client';
import { destinationTypeOptions } from '../domain/destination';
import {
  destinationCacheVersion,
  type PlaceKind,
} from '../../../../supabase/functions/_shared/contracts';
import { Link } from 'react-router';

function InterestFilters({
  interest,
  onSelect,
}: {
  interest: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="interest-filters" aria-label="Travel interests">
      {interests.map((item) => (
        <Button
          key={item.value}
          variant={interest === item.value ? 'default' : 'secondary'}
          aria-pressed={interest === item.value}
          onClick={() => onSelect(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

export function ExplorerPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const source = params.get('source') ?? (appConfig.runtimeMode === 'live' ? 'live' : 'demo');
  const live = source === 'live';
  const query = (params.get('q') ?? '').slice(0, 100);
  const kind: PlaceKind = destinationTypeOptions.some((item) => item.value === params.get('kind'))
    ? (params.get('kind') as PlaceKind)
    : 'locality';
  const interest = interests.some((item) => item.value === params.get('interest'))
    ? params.get('interest')!
    : 'all';
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value);
      else next.delete(key);
    setParams(next);
  }
  const available = appConfig.runtimeMode === 'live';
  const results = useQuery({
    queryKey: ['discovery-search', destinationCacheVersion, query, kind],
    queryFn: ({ signal }) => requestDiscovery({ operation: 'search', query, kind }, signal),
    enabled: live && available && query.trim().length >= 3,
    staleTime: 86400000,
    gcTime: 86400000,
  });
  const destinations = live ? (results.data?.destinations ?? []) : searchCurated(query, interest);
  const filters = (
    <InterestFilters
      interest={interest}
      onSelect={(value) => {
        update({ interest: value === 'all' ? '' : value });
        setFiltersOpen(false);
      }}
    />
  );
  return (
    <div className="container explorer-page">
      <div className="discovery-page-heading">
        <div>
          <p className="eyebrow">LEAVE A LITTLE ROOM FOR WONDER</p>
          <h1>Where to next?</h1>
          <p>A place for every kind of curious.</p>
        </div>
        <Badge tone="accent">{live ? 'Worldwide · Geoapify' : 'Curated demo collection'}</Badge>
      </div>
      <div className="source-switch" role="group" aria-label="Discovery source">
        <Button
          variant={!live ? 'default' : 'secondary'}
          aria-pressed={!live}
          onClick={() => update({ source: 'demo', q: '', interest: '' })}
        >
          Curated collection
        </Button>
        <Button
          variant={live ? 'default' : 'secondary'}
          aria-pressed={live}
          onClick={() => update({ source: 'live', q: '', interest: '' })}
        >
          <Globe2 aria-hidden="true" />
          Worldwide search
        </Button>
      </div>
      <div className="explorer-search-row">
        <DestinationSearch
          key={`${query}:${live}:${kind}`}
          initialQuery={query}
          live={live}
          kind={kind}
          onSearch={(value) => update({ q: value })}
          onAlternative={(value) => update({ q: value, kind: 'locality' })}
        />
        {live && (
          <div className="place-kind">
            <label htmlFor="place-kind">Search for</label>
            <select
              id="place-kind"
              value={kind}
              onChange={(event) => update({ kind: event.target.value })}
            >
              {destinationTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {!live && (
        <>
          <div className="desktop-interest-filters">{filters}</div>
          <div className="mobile-filter-control">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <SlidersHorizontal aria-hidden="true" />
                  Filters · {interests.find((item) => item.value === interest)?.label}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Find your kind of place</DialogTitle>
                <DialogDescription>
                  Combine a travel interest with your destination or keyword search.
                </DialogDescription>
                {filters}
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
      <section
        className="explorer-results"
        aria-label="Destination results"
        aria-busy={live && results.isFetching}
      >
        {live && !available ? (
          <EmptyState
            icon={Globe2}
            title="Worldwide discovery is not ready."
            action={
              <Button onClick={() => update({ source: 'demo', q: '' })}>
                Browse the curated collection
              </Button>
            }
          >
            Demo mode or missing public configuration keeps live search unavailable. No account is
            needed for the curated collection.
          </EmptyState>
        ) : live && query.trim().length < 3 ? (
          <EmptyState
            icon={Globe2}
            title="The world is a good starting point."
            action={<p>Search districts, states, towns, villages or countries above.</p>}
          >
            Enter at least three characters. Live searches use Geoapify; interest keywords belong to
            the curated collection.
          </EmptyState>
        ) : live && results.isPending ? (
          <div role="status" className="results-loading">
            <p>Finding places for your next chapter…</p>
            <div className="destination-grid">
              {[1, 2, 3].map((value) => (
                <div className="destination-skeleton" key={value} />
              ))}
            </div>
          </div>
        ) : live && results.isError ? (
          <QueryFeedback
            error={results.error}
            updatedAt={results.errorUpdatedAt}
            retry={() => {
              void results.refetch();
            }}
          />
        ) : (
          <>
            <div className="results-heading">
              <p role="status">
                {destinations.length} {destinations.length === 1 ? 'place' : 'places'}
                {query ? ` for “${query}”` : ' to spark an idea'}
              </p>
              {(query || interest !== 'all') && (
                <Button variant="ghost" onClick={() => update({ q: '', interest: '' })}>
                  Clear search & filters
                </Button>
              )}
            </div>
            {destinations.length ? (
              <div className="destination-grid">
                {destinations.map((destination) => (
                  <DestinationCard key={destination.id} destination={destination} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={SearchX}
                title="A different direction, perhaps?"
                action={
                  <Button variant="secondary" onClick={() => update({ q: '', interest: '' })}>
                    Clear search & filters
                  </Button>
                }
              >
                {live ? (
                  <>
                    No destinations found. Try All destinations, add a state or country, or check
                    another spelling. <Link to="/trips/new">Plan a destination manually</Link>.
                  </>
                ) : (
                  'No places match this combination. Try a city, country, or a broader interest.'
                )}
              </EmptyState>
            )}
          </>
        )}
      </section>
      <SourceNote live={live} fetchedAt={results.data?.fetchedAt} cached={results.data?.cached} />
    </div>
  );
}
