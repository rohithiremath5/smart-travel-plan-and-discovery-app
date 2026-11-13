export const photography = {
  kyoto: {
    id: 3753404,
    creator: 'Satoshi Hirayama',
    source: 'https://www.pexels.com/photo/photo-of-alley-during-daytime-3753404/',
    alt: 'Traditional wooden buildings along a cobbled alley in Kyoto',
    match: 'Kyoto streets; not a photograph of every attraction listed.',
  },
  lisbon: {
    id: 30917822,
    creator: 'Gonzalo Mendiola',
    source:
      'https://www.pexels.com/photo/historic-street-scene-in-central-lisbon-portugal-30917822/',
    alt: 'Historic architecture on a street in central Lisbon',
    match: 'Lisbon city streets; not an individual attraction.',
  },
  dolomites: {
    id: 33244766,
    creator: 'eberhard grossgasteiger',
    source: 'https://www.pexels.com/photo/scenic-view-of-lake-and-mountains-in-dolomites-33244766/',
    alt: 'Dolomite mountain peaks reflected in a quiet alpine lake',
    match: 'The Dolomites region in Italy; exact lake is not asserted.',
  },
  bali: {
    id: 40508694,
    creator: 'Adit Syahfiar',
    source: 'https://www.pexels.com/photo/surfer-on-bali-beach-at-sunset-40508694/',
    alt: 'A surfer carrying a board along a Bali beach at sunset',
    match: 'Bali coastline; no particular beach or endorsement is asserted.',
  },
} as const;
export type PhotoKey = keyof typeof photography;
