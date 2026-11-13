import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowUpRight, MapPin, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/feedback/notice';
import { EmptyState } from '@/components/feedback/empty-state';
import { getGuide } from '../data/curated';
import { useSaved } from '../hooks/use-saved';
import { DestinationPhoto } from '../components/destination-photo';
import { SaveButton } from '../components/save-button';
import { SourceNote } from '../components/source-note';
import { QueryFeedback } from '../components/query-feedback';
import { requestDiscovery } from '../services/discovery-client';
import type { AttractionCategory } from '../../../../supabase/functions/_shared/contracts';
import { destinationCacheVersion } from '../../../../supabase/functions/_shared/contracts';
import {
  destinationContext,
  destinationTypeLabel,
  isAreaDestination,
  referencePointNotice,
} from '../domain/destination';

export function DestinationPage() {
  const { destinationId = '' } = useParams();
  return <DestinationDetails key={destinationId} id={destinationId} />;
}
function DestinationDetails({ id }: { id: string }) {
  const guide = getGuide(id);
  const live = id.startsWith('geo-');
  const { saved } = useSaved();
  const [category, setCategory] = useState<AttractionCategory>('sights');
  const [placesRequested, setPlacesRequested] = useState(false);
  const query = useQuery({
    queryKey: ['destination', destinationCacheVersion, id],
    queryFn: ({ signal }) => requestDiscovery({ operation: 'detail', id }, signal),
    enabled: live,
    staleTime: 86400000,
    gcTime: 86400000,
  });
  const snapshot = saved.find((value) => value.id === id);
  const destination = guide?.destination ?? query.data?.destinations[0] ?? snapshot;
  const places = useQuery({
    queryKey: ['destination-places', id, category],
    queryFn: ({ signal }) =>
      requestDiscovery(
        {
          operation: 'places',
          latitude: destination!.latitude,
          longitude: destination!.longitude,
          category,
        },
        signal,
      ),
    enabled: live && !!destination && placesRequested,
    staleTime: 86400000,
    gcTime: 86400000,
  });
  const attractions = guide
    ? guide.attractions.filter((item) => item.category === category)
    : (places.data?.attractions ?? []);
  return (
    <div className="container destination-page">
      <Link className="back-link" to={`/discover?source=${live ? 'live' : 'demo'}`}>
        <ArrowLeft aria-hidden="true" />
        Back to discovery
      </Link>
      {!destination ? (
        live && query.isPending ? (
          <div className="discovery-page-heading">
            <h1 role="status">Opening this destination…</h1>
          </div>
        ) : live && query.isError ? (
          <div>
            <div className="discovery-page-heading">
              <h1>Destination unavailable.</h1>
            </div>
            <QueryFeedback
              error={query.error}
              updatedAt={query.errorUpdatedAt}
              retry={() => {
                void query.refetch();
              }}
            />
          </div>
        ) : (
          <EmptyState
            heading="h1"
            icon={Compass}
            title="This place is still out there."
            action={
              <Button asChild>
                <Link to="/discover?source=demo">Explore destinations</Link>
              </Button>
            }
          >
            We could not find this destination. Try another place in discovery.
          </EmptyState>
        )
      ) : (
        <>
          <div className="destination-intro">
            <div>
              <p className="eyebrow">
                <MapPin aria-hidden="true" />
                {destinationContext(destination) || destination.country || 'Region not supplied'}
              </p>
              <h1>{destination.name}</h1>
              <p>{guide?.headline ?? 'A new place to get to know.'}</p>
            </div>
            <SaveButton destination={destination} />
          </div>
          <DestinationPhoto photo={guide?.photo} priority />
          <div className="destination-detail-grid">
            <section className="destination-story">
              <Badge tone="accent">{guide ? 'Curated demo guide' : 'Geoapify destination'}</Badge>
              {!guide && <p>{destinationTypeLabel(destination.kind)}</p>}
              <h2>{guide ? 'Let curiosity set the pace.' : 'Start with the place.'}</h2>
              <p>
                {guide?.description ??
                  'Explore nearby sights, natural places, and food spots using public place data. Coverage varies; confirm details directly before visiting.'}
              </p>
              {isAreaDestination(destination.kind) && (
                <p className="destination-reference-note">{referencePointNotice}</p>
              )}
              {query.isError && snapshot && (
                <Notice title="Showing your saved snapshot" tone="warning">
                  Live details could not be refreshed. This record was retrieved on{' '}
                  {new Date(snapshot.fetchedAt).toLocaleDateString()}. Your save remains on this
                  device.
                </Notice>
              )}
              {guide && (
                <a className="text-link" href={guide.guideUrl} target="_blank" rel="noreferrer">
                  Read the destination guide <ArrowUpRight aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <SourceNote
                live={live}
                fetchedAt={query.data?.fetchedAt ?? destination.fetchedAt}
                cached={query.data?.cached}
              />
            </section>
            <aside className="visit-note">
              <Compass aria-hidden="true" />
              <h2>A note before you go.</h2>
              <p>
                Opening hours, access, and conditions change. Check official local sources before
                visiting. No ratings, prices, or bookings are implied.
              </p>
              <p>Saved destinations stay in this browser. Clearing browser data removes them.</p>
              {guide && (
                <p>
                  Image: {guide.photo === 'dolomites' ? 'regional landscape' : 'destination scene'},
                  not every place listed below.
                </p>
              )}
            </aside>
          </div>
          <section className="attractions-section" aria-labelledby="attractions-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">GET TO KNOW THE PLACE</p>
                <h2 id="attractions-title">A few paths to explore.</h2>
              </div>
            </div>
            <div className="interest-filters" role="group" aria-label="Attraction category">
              {(
                [
                  { value: 'sights', label: 'Sights & culture' },
                  { value: 'nature', label: 'Nature & outdoors' },
                  { value: 'food', label: 'Food & cafés' },
                ] as const
              ).map((item) => (
                <Button
                  key={item.value}
                  variant={category === item.value ? 'default' : 'secondary'}
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            {live && !placesRequested ? (
              <div className="nearby-prompt">
                <p>
                  Find up to 20 places within 5 km of this destination’s reference point. This
                  covers that point, not an entire district, state or country.
                </p>
                <Button onClick={() => setPlacesRequested(true)}>Find nearby places</Button>
              </div>
            ) : places.isFetching ? (
              <p role="status">Finding nearby places…</p>
            ) : places.isError ? (
              <QueryFeedback
                error={places.error}
                updatedAt={places.errorUpdatedAt}
                retry={() => {
                  void places.refetch();
                }}
              />
            ) : attractions.length ? (
              <div className="attraction-grid">
                {attractions.map((attraction, index) => (
                  <article className="attraction-card" key={attraction.id}>
                    <span className="attraction-number">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{attraction.name}</h3>
                    <p>
                      {attraction.description ||
                        'Public place record. Confirm current access and details directly.'}
                    </p>
                    <p className="muted-text">{attraction.address}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="nearby-prompt">
                No places listed in this category. Try another category; coverage is incomplete.
              </p>
            )}
            {live && places.data && (
              <SourceNote live fetchedAt={places.data.fetchedAt} cached={places.data.cached} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
