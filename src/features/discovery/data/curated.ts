import type {
  Attraction,
  Destination,
  Interest,
} from '../../../../supabase/functions/_shared/contracts';
import type { PhotoKey } from './photography';

export interface CuratedGuide {
  destination: Destination;
  photo: PhotoKey;
  headline: string;
  description: string;
  interests: Interest[];
  keywords: string[];
  attractions: Attraction[];
  guideUrl: string;
}
const destination = (
  id: string,
  name: string,
  country: string,
  latitude: number,
  longitude: number,
): Destination => ({
  id,
  name,
  country,
  latitude,
  longitude,
  kind: ['bali', 'dolomites'].includes(id) ? 'region' : 'city',
  source: 'curated',
  fetchedAt: '2026-11-04T00:00:00.000Z',
});
export const curatedGuides: CuratedGuide[] = [
  {
    destination: destination('kyoto', 'Kyoto', 'Japan', 35.0116, 135.7681),
    photo: 'kyoto',
    headline: 'Follow a quieter path.',
    description:
      'Temple gardens, wooden lanes, and small moments worth slowing down for. Start with a neighborhood, then leave room to wander.',
    interests: ['culture', 'city'],
    keywords: ['temples', 'gardens', 'heritage', 'tea', 'asia'],
    guideUrl: 'https://kyoto.travel/en/',
    attractions: [
      {
        id: 'kyoto-fushimi',
        name: 'Fushimi Inari Taisha',
        description:
          'A shrine known for its paths of vermilion torii gates. Respect worshippers and stay on permitted paths.',
        address: 'Fushimi, Kyoto',
        category: 'sights',
      },
      {
        id: 'kyoto-arashiyama',
        name: 'Arashiyama',
        description:
          'Explore the western district and its bamboo-lined paths; consider quieter surrounding streets.',
        address: 'Western Kyoto',
        category: 'nature',
      },
      {
        id: 'kyoto-nishiki',
        name: 'Nishiki Market',
        description:
          'A covered market with food shops. Check individual vendors and follow local eating etiquette.',
        address: 'Central Kyoto',
        category: 'food',
      },
    ],
  },
  {
    destination: destination('lisbon', 'Lisbon', 'Portugal', 38.7223, -9.1393),
    photo: 'lisbon',
    headline: 'Take the long way uphill.',
    description:
      'Tiled facades, steep streets, and a river horizon. Lisbon rewards unhurried walks and a stop at a neighborhood café.',
    interests: ['city', 'culture', 'coast'],
    keywords: ['architecture', 'cafes', 'europe', 'tiles', 'river'],
    guideUrl: 'https://www.visitlisboa.com/en',
    attractions: [
      {
        id: 'lisbon-alfama',
        name: 'Alfama',
        description:
          'A historic hillside neighborhood of narrow lanes. Be considerate of residents while exploring.',
        address: 'Lisbon',
        category: 'sights',
      },
      {
        id: 'lisbon-belem',
        name: 'Belém waterfront',
        description:
          'Walk by the Tagus and discover the district’s maritime heritage. Venue access varies.',
        address: 'Belém, Lisbon',
        category: 'nature',
      },
      {
        id: 'lisbon-market',
        name: 'Mercado da Ribeira',
        description:
          'A market setting for exploring local food; check current vendor schedules directly.',
        address: 'Cais do Sodré, Lisbon',
        category: 'food',
      },
    ],
  },
  {
    destination: destination('dolomites', 'The Dolomites', 'Italy', 46.4983, 11.3548),
    photo: 'dolomites',
    headline: 'A little closer to the wild.',
    description:
      'Pale peaks, alpine lakes, and trails that invite a different pace. This is a regional starting point; check weather, trail access, and transport before setting out.',
    interests: ['nature'],
    keywords: ['mountains', 'hiking', 'lakes', 'alpine', 'europe', 'outdoors'],
    guideUrl: 'https://www.dolomiti.org/en/',
    attractions: [
      {
        id: 'dolomites-tre-cime',
        name: 'Tre Cime di Lavaredo',
        description:
          'A mountain area known for its three peaks. Routes and seasonal access require current local advice.',
        address: 'Dolomites, Italy',
        category: 'nature',
      },
      {
        id: 'dolomites-braies',
        name: 'Lago di Braies',
        description:
          'An alpine lake with seasonal access arrangements. Verify local restrictions before visiting.',
        address: 'South Tyrol, Italy',
        category: 'nature',
      },
    ],
  },
  {
    destination: destination('bali', 'Bali', 'Indonesia', -8.4095, 115.1889),
    photo: 'bali',
    headline: 'Find your island rhythm.',
    description:
      'Coastlines, rice-growing landscapes, and living traditions. Explore with care, respect temple customs, and leave space for the everyday life around you.',
    interests: ['coast', 'nature', 'culture'],
    keywords: ['island', 'beaches', 'surf', 'rice', 'asia', 'tropical'],
    guideUrl: 'https://www.indonesia.travel/gb/en/destinations/bali-nusa-tenggara/bali',
    attractions: [
      {
        id: 'bali-ubud',
        name: 'Ubud',
        description:
          'A starting point for galleries, local crafts, and surrounding landscapes. Confirm access with local hosts.',
        address: 'Central Bali',
        category: 'sights',
      },
      {
        id: 'bali-sanur',
        name: 'Sanur coastline',
        description:
          'A coastal area with a seaside path. Check sea conditions and use designated access points.',
        address: 'Southeast Bali',
        category: 'nature',
      },
    ],
  },
];
export const interests: { value: Interest | 'all'; label: string }[] = [
  { value: 'all', label: 'All places' },
  { value: 'culture', label: 'Culture & heritage' },
  { value: 'nature', label: 'Into nature' },
  { value: 'coast', label: 'By the water' },
  { value: 'city', label: 'City wandering' },
];
export function getGuide(id: string) {
  return curatedGuides.find((guide) => guide.destination.id === id);
}
export function searchCurated(query: string, interest: string = 'all') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return curatedGuides
    .filter(
      (guide) =>
        (interest === 'all' || guide.interests.some((value) => value === interest)) &&
        words.every((word) =>
          [guide.destination.name, guide.destination.country, ...guide.keywords, ...guide.interests]
            .join(' ')
            .toLocaleLowerCase()
            .includes(word),
        ),
    )
    .map((guide) => guide.destination);
}
