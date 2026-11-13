import { ArrowLeft, Signpost } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';

export function NotFoundPage() {
  return (
    <div className="container not-found-page">
      <p className="eyebrow">404 · A SMALL DETOUR</p>
      <EmptyState
        heading="h1"
        icon={Signpost}
        title="This path ends here."
        action={
          <Button asChild>
            <Link to="/">
              <ArrowLeft aria-hidden="true" /> Back to overview
            </Link>
          </Button>
        }
      >
        We couldn’t find that page. Head back to the overview and find your way from there.
      </EmptyState>
    </div>
  );
}
