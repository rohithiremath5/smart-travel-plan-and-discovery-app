// Names only, with official references. No IDs/coordinates or fabricated provider results.
const names = [
  {
    name: 'Chikkamagaluru',
    aliases: ['Chikmagalur'],
    region: 'Karnataka',
    country: 'India',
    source: 'https://chikkamagaluru.nic.in/en/about-district/',
  },
  {
    name: 'Kodagu',
    aliases: ['Coorg'],
    region: 'Karnataka',
    country: 'India',
    source: 'https://kodagu.nic.in/en/about-district/',
  },
  {
    name: 'Mysuru',
    aliases: ['Mysore'],
    region: 'Karnataka',
    country: 'India',
    source: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1489165&lang=1&reg=3',
  },
  {
    name: 'Belagavi',
    aliases: ['Belgaum'],
    region: 'Karnataka',
    country: 'India',
    source: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1489165&lang=1&reg=3',
  },
  {
    name: 'Udhagamandalam',
    aliases: ['Ooty'],
    region: 'Tamil Nadu',
    country: 'India',
    source: 'https://nilgiris.nic.in/tourist-place/raj-bhavan-ooty/',
  },
  {
    name: 'Munich',
    aliases: ['München'],
    region: 'Bavaria',
    country: 'Germany',
    source: 'https://www.munich.travel/en/',
  },
] as const;
const normalize = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
export function placeNameSuggestions(query: string) {
  const [head, ...context] = query.split(',').map(normalize);
  const spelling = head === 'chikmangalur';
  return names
    .filter((place) => {
      const matches =
        normalize(place.name) === head ||
        place.aliases.some((alias) => normalize(alias) === head) ||
        (spelling && place.name === 'Chikkamagaluru');
      return (
        matches &&
        context.every(
          (part) => !part || [normalize(place.region), normalize(place.country)].includes(part),
        )
      );
    })
    .map((place) => ({
      ...place,
      query: `${place.name}, ${place.region}, ${place.country}`,
      spelling,
    }));
}
