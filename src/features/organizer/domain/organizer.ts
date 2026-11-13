import { z } from 'zod';
export const noteCategories = [
  'General',
  'Accommodation',
  'Transportation',
  'Things to remember',
  'Preparation',
] as const;
export const checklistCategories = [
  'Before departure',
  'Travel documents',
  'Transportation',
  'Accommodation',
  'Reservations',
  'Health and essentials',
  'Other',
];
export const packingCategories = [
  'Clothing',
  'Toiletries',
  'Electronics',
  'Travel documents',
  'Medicines and personal care',
  'Outdoor essentials',
  'Miscellaneous',
];
const label = z.string().trim().min(1).max(160);
export const organizerNoteSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().max(80),
    category: z.enum(noteCategories),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();
export const organizerItemSchema = z
  .object({
    id: z.uuid(),
    label,
    category: z.string().trim().min(1).max(60),
    complete: z.boolean(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().trim().max(300),
  })
  .strict();
export const organizerSchema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: z.uuid(),
    revision: z.number().int().min(0),
    notes: z.array(organizerNoteSchema).max(40),
    checklist: z.array(organizerItemSchema).max(200),
    packing: z.array(organizerItemSchema).max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = [...value.notes, ...value.checklist, ...value.packing].map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Organizer IDs must be unique.' });
  });
export type Organizer = z.infer<typeof organizerSchema>;
export type OrganizerNote = z.infer<typeof organizerNoteSchema>;
export type OrganizerItem = z.infer<typeof organizerItemSchema>;
export type ListKind = 'checklist' | 'packing';
export const emptyOrganizer = (tripId: string): Organizer => ({
  schemaVersion: 1,
  tripId,
  revision: 0,
  notes: [],
  checklist: [],
  packing: [],
});
export function validateOrganizer(tripId: string, value: unknown): Organizer {
  const result = organizerSchema.safeParse(value);
  if (!result.success || result.data.tripId !== tripId)
    throw new Error('Invalid or unsupported organizer data. No records were changed.');
  return result.data;
}
export function progress(items: OrganizerItem[]) {
  const complete = items.filter((x) => x.complete).length;
  return {
    complete,
    total: items.length,
    remaining: items.length - complete,
    percent: items.length ? Math.round((complete / items.length) * 100) : 0,
  };
}
export const itemIdentity = (label: string) =>
  label.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export function organizerContent(value: Organizer) {
  return JSON.stringify({
    notes: value.notes.map(({ id, ...x }) => {
      void id;
      return x;
    }),
    checklist: value.checklist.map(({ id, ...x }) => {
      void id;
      return x;
    }),
    packing: value.packing.map(({ id, ...x }) => {
      void id;
      return x;
    }),
  });
}
export function moveItem(items: OrganizerItem[], id: string, direction: -1 | 1) {
  const next = [...items],
    index = next.findIndex((x) => x.id === id);
  if (index < 0) throw new Error('This item no longer exists. Reload before reordering.');
  const category = next[index]!.category;
  let target = index + direction;
  while (target >= 0 && target < next.length && next[target]!.category !== category)
    target += direction;
  if (target >= 0 && target < next.length)
    [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
