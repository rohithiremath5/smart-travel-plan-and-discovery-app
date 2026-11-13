import type {
  Destination,
  DestinationKind,
  PlaceKind,
} from '../../../../supabase/functions/_shared/contracts';
export const destinationTypeOptions: { value: PlaceKind; label: string }[] = [
  { value: 'locality', label: 'All destinations' },
  { value: 'city', label: 'Cities, towns & villages' },
  { value: 'state', label: 'States & provinces' },
  { value: 'country', label: 'Countries' },
];
export function destinationTypeLabel(kind: DestinationKind) {
  const labels: Record<DestinationKind, string> = {
    country: 'Country',
    state: 'State / province',
    county: 'District / county',
    district: 'District',
    city: 'City',
    town: 'Town',
    village: 'Village',
    locality: 'Locality',
    region: 'Region',
  };
  return labels[kind];
}
export function destinationContext(
  destination: Pick<Destination, 'name' | 'country' | 'state' | 'county' | 'district'>,
) {
  const seen = new Set([destination.name.toLocaleLowerCase('en')]);
  return [destination.district, destination.county, destination.state, destination.country]
    .filter((value): value is string => {
      if (!value || seen.has(value.toLocaleLowerCase('en'))) return false;
      seen.add(value.toLocaleLowerCase('en'));
      return true;
    })
    .join(' · ');
}
export function isAreaDestination(kind: DestinationKind | undefined) {
  return !!kind && ['country', 'state', 'county', 'district', 'region'].includes(kind);
}
export const referencePointNotice =
  'This coordinate is a geographic reference point, not the boundary of the district, state or region. Nearby places cover only the area around this point.';
