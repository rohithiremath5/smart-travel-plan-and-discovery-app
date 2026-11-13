import { ArrowLeft, ArrowUpRight, Bookmark, Compass, Luggage } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';

const placeholders = {
  discover: {
    title: 'A world waiting to be discovered.',
    label: 'Destination discovery',
    phase: 2,
    icon: Compass,
    description:
      'Destination search, curated places, and photography will arrive in Phase 2. This route is a navigation placeholder; it contains no destinations or live results.',
  },
  trips: {
    title: 'Room for your next adventure.',
    label: 'My trips',
    phase: 3,
    icon: Luggage,
    description:
      'Guest trips are available from My trips. Authentication and cloud synchronization wait until final Phase 10. This legacy foundation preview is not an active product route.',
  },
  saved: {
    title: 'Keep a little inspiration.',
    label: 'Saved places',
    phase: 2,
    icon: Bookmark,
    description:
      'Saving destinations will arrive with discovery in Phase 2. This is a route placeholder, and no places have been saved or stored.',
  },
} as const;

export function PlaceholderPage({ feature }: { feature: keyof typeof placeholders }) {
  const item = placeholders[feature];
  return (
    <div className="container placeholder-page">
      <Link to="/" className="back-link">
        <ArrowLeft aria-hidden="true" /> Back to overview
      </Link>
      <div className="placeholder-meta">
        <span className="eyebrow">{item.label}</span>
        <Badge>Planned · Phase {item.phase}</Badge>
      </div>
      <div className="placeholder-panel">
        <Badge tone="accent">Future feature placeholder</Badge>
        <EmptyState
          heading="h1"
          icon={item.icon}
          title={item.title}
          action={
            <Button asChild variant="secondary">
              <Link to="/design-system">
                Explore the foundation <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {item.description}
        </EmptyState>
      </div>
      <p className="placeholder-caption">
        A working route today. A new chapter in a separately approved phase.
      </p>
    </div>
  );
}
