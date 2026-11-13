export const appConfig = __PUBLIC_CONFIG__;

export const previewCapabilities = [
  { label: 'Application shell', detail: 'Navigation and responsive layouts', available: true },
  { label: 'Design system', detail: 'Interactive component preview', available: true },
  {
    label: 'Destination discovery',
    detail: 'Curated collection and configured Geoapify search',
    available: true,
  },
  { label: 'Saved destinations', detail: 'IndexedDB storage on this device', available: true },
  { label: 'Guest trips', detail: 'Local dashboard, trip wizard and JSON backup', available: true },
  {
    label: 'Manual itinerary',
    detail: 'Day plans, activities, local times and notes',
    available: true,
  },
  {
    label: 'Accounts and cloud synchronization',
    detail: 'Final Phase 10; not implemented',
    available: false,
  },
  {
    label: 'Interactive maps',
    detail: 'OpenFreeMap with configured secure location search and routes',
    available: true,
  },
  {
    label: 'AI planning',
    detail: 'Controlled local development only; checks availability when opened',
    available: true,
  },
] as const;
