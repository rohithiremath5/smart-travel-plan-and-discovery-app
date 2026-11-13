import { Button } from '@/components/ui/button';
import { placeNameSuggestions } from '../data/place-names';
export function PlaceNameSuggestions({
  query,
  onChoose,
}: {
  query: string;
  onChoose: (query: string) => void;
}) {
  const enteredName = query.split(',')[0]?.normalize('NFKC').trim().toLocaleLowerCase('en');
  const suggestions = placeNameSuggestions(query).filter(
    (item) => item.name.toLocaleLowerCase('en') !== enteredName,
  );
  if (!suggestions.length) return null;
  return (
    <div className="place-name-suggestions" aria-label="Place name alternatives">
      {suggestions.map((item) => (
        <div key={item.name}>
          <p>
            {item.spelling
              ? 'Possible spelling, not a documented alternative name.'
              : 'A place can have more than one name.'}{' '}
            Your search stays unchanged until you choose.
          </p>
          <Button variant="secondary" onClick={() => onChoose(item.query)}>
            Search all destinations for {item.name}
          </Button>
          <small>
            {item.region}, {item.country} ·{' '}
            <a href={item.source} target="_blank" rel="noreferrer">
              Official name reference
            </a>
            {!item.spelling && ` · Also known as ${item.aliases.join(' / ')}`}
          </small>
        </div>
      ))}
    </div>
  );
}
