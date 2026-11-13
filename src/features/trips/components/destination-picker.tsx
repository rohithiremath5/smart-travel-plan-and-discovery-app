import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Check, Search } from 'lucide-react';
import { appConfig } from '@/app/config/environment';
import { Button } from '@/components/ui/button';
import { searchCurated } from '@/features/discovery/data/curated';
import {
  requestDiscovery,
  discoveryErrorMessage,
} from '@/features/discovery/services/discovery-client';
import type { TripDestination } from '../domain/trip';
import {
  destinationCacheVersion,
  type PlaceKind,
} from '../../../../supabase/functions/_shared/contracts';
import {
  destinationContext,
  destinationTypeLabel,
  destinationTypeOptions,
  isAreaDestination,
  referencePointNotice,
} from '@/features/discovery/domain/destination';
import { PlaceNameSuggestions } from '@/features/discovery/components/place-name-suggestions';

export function DestinationPicker({
  selected,
  onSelect,
}: {
  selected: TripDestination | null;
  onSelect: (destination: TripDestination) => void;
}) {
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [kind, setKind] = useState<PlaceKind>('locality');
  const [manual, setManual] = useState(selected?.source === 'manual');
  const [name, setName] = useState(selected?.source === 'manual' ? selected.name : '');
  const [country, setCountry] = useState(selected?.source === 'manual' ? selected.country : '');
  const [error, setError] = useState('');
  const results = useQuery({
    queryKey: ['trip-destination-search', destinationCacheVersion, submitted, kind],
    queryFn: ({ signal }) =>
      requestDiscovery({ operation: 'search', query: submitted, kind }, signal),
    enabled: live && !manual && submitted.length >= 3,
    staleTime: 86400000,
  });
  const items = live ? (results.data?.destinations ?? []) : searchCurated(query, 'all');
  function submitSearch() {
    setError(query.trim().length < 3 ? 'Type at least three characters.' : '');
    setSubmitted(query.trim());
  }
  return (
    <div className="destination-picker">
      <p className="step-description">
        Start with somewhere that speaks to you. Pick a place from discovery, or add your own.
      </p>
      <div className="trip-actions" role="group" aria-label="Destination source">
        <Button
          variant={!manual && !live ? 'default' : 'secondary'}
          onClick={() => {
            setManual(false);
            setLive(false);
          }}
        >
          Curated places
        </Button>
        <Button
          variant={!manual && live ? 'default' : 'secondary'}
          disabled={appConfig.runtimeMode !== 'live'}
          onClick={() => {
            setManual(false);
            setLive(true);
          }}
        >
          Worldwide search
        </Button>
        <Button variant={manual ? 'default' : 'secondary'} onClick={() => setManual(true)}>
          Enter manually
        </Button>
      </div>
      {manual ? (
        <div className="wizard-fields">
          <div>
            <label className="field-label" htmlFor="manual-name">
              Destination name
            </label>
            <input
              className="input"
              id="manual-name"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="manual-country">
              Country or region (optional)
            </label>
            <input
              className="input"
              id="manual-country"
              maxLength={100}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (name.trim().length < 2) {
                setError('Use at least two characters for the destination name.');
                return;
              }
              setError('');
              onSelect({
                id: selected?.source === 'manual' ? selected.id : 'manual-' + crypto.randomUUID(),
                name: name.trim(),
                country: country.trim(),
                source: 'manual',
              });
            }}
          >
            Use this destination
          </Button>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="picker-search">
            <label className="field-label" htmlFor="trip-place-query">
              Search destinations
            </label>
            <div>
              <input
                className="input"
                id="trip-place-query"
                value={query}
                maxLength={100}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (live) submitSearch();
                  }
                }}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSubmitted('');
                  setError('');
                }}
                placeholder={
                  live ? 'District, town, state or country' : 'City, country or interest'
                }
              />
              {live && (
                <Button variant="secondary" type="button" onClick={submitSearch}>
                  <Search aria-hidden="true" />
                  Search
                </Button>
              )}
            </div>
            {live && (
              <>
                <label className="field-label" htmlFor="trip-place-kind">
                  Destination type
                </label>
                <select
                  id="trip-place-kind"
                  className="input"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as PlaceKind);
                    setSubmitted('');
                  }}
                >
                  {destinationTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  All destinations includes districts and counties. Add a state or country for
                  similar names.
                </p>
              </>
            )}
          </div>
          {live && (
            <PlaceNameSuggestions
              query={query}
              onChoose={(value) => {
                setQuery(value);
                setKind('locality');
                setSubmitted(value);
                setError('');
              }}
            />
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {live && results.isFetching ? (
            <p role="status">Searching Geoapify…</p>
          ) : live && results.isError ? (
            <p role="alert" className="field-error">
              {discoveryErrorMessage(results.error)} You can enter a destination manually.
            </p>
          ) : (
            <div className="destination-choices" role="group" aria-label="Choose a destination">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="destination-choice"
                  aria-pressed={selected?.id === item.id}
                  onClick={() =>
                    onSelect({
                      id: item.id,
                      name: item.name,
                      country: item.country,
                      source: item.source,
                      latitude: item.latitude,
                      longitude: item.longitude,
                      kind: item.kind,
                      ...(item.state ? { state: item.state } : {}),
                      ...(item.county ? { county: item.county } : {}),
                      ...(item.district ? { district: item.district } : {}),
                    })
                  }
                >
                  <MapPin aria-hidden="true" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {destinationTypeLabel(item.kind)} ·{' '}
                      {destinationContext(item) || 'Region not supplied'} ·{' '}
                      {item.source === 'curated' ? 'Curated place' : 'Geoapify'}
                    </small>
                  </span>
                  {selected?.id === item.id && <Check aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
          {!items.length && !results.isFetching && (
            <p className="field-hint">
              {live && !submitted
                ? 'Search a district, town, state or country, or enter a place manually.'
                : 'No places found. Try All destinations, add a state or country, check the spelling, or enter your destination manually.'}
            </p>
          )}
          {live && (
            <p className="field-hint">
              Powered by{' '}
              <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
                Geoapify
              </a>{' '}
              · © OpenStreetMap contributors. Searches use the existing discovery quota.
            </p>
          )}
        </>
      )}
      {selected && (
        <p className="destination-selected" role="status">
          <Check aria-hidden="true" />
          Selected: {selected.name}
          {selected.country ? `, ${selected.country}` : ''} ·{' '}
          {selected.source === 'manual'
            ? 'Your entry'
            : selected.source === 'curated'
              ? 'Curated discovery'
              : 'Geoapify'}
        </p>
      )}
      {isAreaDestination(selected?.kind) && <p className="field-hint">{referencePointNotice}</p>}
    </div>
  );
}
