export function SourceNote({
  live = false,
  fetchedAt,
  cached = false,
}: {
  live?: boolean;
  fetchedAt?: string | undefined;
  cached?: boolean | undefined;
}) {
  return (
    <p className="source-note">
      {live ? (
        <>
          <span>
            Powered by{' '}
            <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
              Geoapify
            </a>{' '}
            ·{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © OpenStreetMap contributors
            </a>
            .
          </span>
          {fetchedAt && (
            <span>
              {' '}
              Retrieved {new Date(fetchedAt).toLocaleString()}
              {cached ? ' · cached response' : ''}.
            </span>
          )}
        </>
      ) : (
        <>
          Curated demo collection · editorial examples, not live search results. Photography
          licensed from Pexels.
        </>
      )}
    </p>
  );
}
