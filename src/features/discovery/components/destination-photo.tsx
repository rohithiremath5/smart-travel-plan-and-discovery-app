import { useState } from 'react';
import { Mountain } from 'lucide-react';
import { photography, type PhotoKey } from '../data/photography';

export function DestinationPhoto({
  photo,
  priority = false,
}: {
  photo?: PhotoKey | undefined;
  priority?: boolean;
}) {
  const [failedPhoto, setFailedPhoto] = useState<PhotoKey | null>(null);
  const failed = !!photo && failedPhoto === photo;
  const asset = photo ? photography[photo] : null;
  return (
    <figure className="destination-photo">
      {asset && !failed ? (
        <img
          src={`/images/${photo}-1280.jpg`}
          srcSet={`/images/${photo}-640.jpg 640w, /images/${photo}-1280.jpg 1280w`}
          sizes={
            priority
              ? '(max-width: 767px) 100vw, 58vw'
              : '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw'
          }
          width={1280}
          height={853}
          alt={asset.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailedPhoto(photo ?? null)}
        />
      ) : (
        <div className="photo-fallback">
          <Mountain aria-hidden="true" />
          <span>{failed ? 'Photograph unavailable' : 'A place to picture for yourself'}</span>
        </div>
      )}
      {asset && (
        <figcaption>
          Photo:{' '}
          <a href={asset.source} target="_blank" rel="noreferrer">
            {asset.creator} / Pexels<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      )}
    </figure>
  );
}
