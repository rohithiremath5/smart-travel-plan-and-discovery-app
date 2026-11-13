import {
  itemIdentity,
  type ListKind,
  type Organizer,
  type OrganizerItem,
} from '../domain/organizer';
export const organizerTemplates = [
  {
    id: 'essentials',
    title: 'General travel essentials',
    description: 'A calm place to begin, whatever the journey.',
    checklist: [
      'Review your reservations',
      'Share your travel plans with someone you trust',
      'Check document expiry dates',
    ],
    packing: ['Everyday clothing', 'Phone and charger', 'Personal care essentials'],
  },
  {
    id: 'weekend',
    title: 'Weekend getaway',
    description: 'A lighter list for a short break.',
    checklist: ['Confirm your arrival plans', 'Arrange care for home or pets'],
    packing: ['A change of clothes', 'Comfortable shoes', 'A small day bag'],
  },
  {
    id: 'beach',
    title: 'Beach vacation',
    description: 'Generic ideas for time by the water.',
    checklist: ['Review local beach access and safety guidance'],
    packing: ['Swimwear', 'Sun protection', 'Reusable water bottle', 'Beach towel'],
  },
  {
    id: 'mountain',
    title: 'Hill station or mountain trip',
    description: 'A starting point; check actual conditions yourself.',
    checklist: ['Check current conditions and access', 'Review your planned walking distances'],
    packing: ['Layers', 'Walking shoes', 'Rain protection', 'Day bag'],
  },
  {
    id: 'business',
    title: 'Business travel',
    description: 'Room for work and the journey around it.',
    checklist: ['Confirm meeting arrangements', 'Prepare materials for your meetings'],
    packing: ['Work clothing', 'Laptop and charger', 'Notebook'],
  },
  {
    id: 'family',
    title: 'Family vacation',
    description: 'Adapt these ideas to the people travelling with you.',
    checklist: ['Review everyone’s travel arrangements', 'Agree a meeting point'],
    packing: ['Spare clothing', 'Activities for the journey', 'Personal care essentials'],
  },
] as const;
export type OrganizerTemplate = (typeof organizerTemplates)[number];
export function templateItems(template: OrganizerTemplate, kind: ListKind) {
  return template[kind].map((label) => ({
    label,
    category: kind === 'packing' ? 'Miscellaneous' : 'Before departure',
  }));
}
export function applyTemplate(
  organizer: Organizer,
  kind: ListKind,
  items: { label: string; category: string }[],
): Organizer {
  const seen = new Set(organizer[kind].map((x) => itemIdentity(x.label)));
  const additions: OrganizerItem[] = [];
  for (const item of items) {
    const identity = itemIdentity(item.label);
    if (!seen.has(identity)) {
      seen.add(identity);
      additions.push({ ...item, id: crypto.randomUUID(), complete: false, quantity: 1, notes: '' });
    }
  }
  return { ...organizer, [kind]: [...organizer[kind], ...additions] };
}
