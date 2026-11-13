export interface PrintOptions {
  activities: boolean;
  checklist: boolean;
  packing: boolean;
  dayNotes: boolean;
  activityDetails: boolean;
  itemNotes: boolean;
  noteIds: string[];
  budget: boolean;
  expenses: boolean;
}
export const defaultPrintOptions: PrintOptions = {
  activities: true,
  checklist: true,
  packing: true,
  dayNotes: false,
  activityDetails: false,
  itemNotes: false,
  noteIds: [],
  budget: false,
  expenses: false,
};
