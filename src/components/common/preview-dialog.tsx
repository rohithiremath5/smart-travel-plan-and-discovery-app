import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function PreviewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">About this preview</Button>
      </DialogTrigger>
      <DialogContent>
        <Badge tone="accent">Foundation preview</Badge>
        <DialogTitle>A thoughtful beginning.</DialogTitle>
        <DialogDescription>
          This is the first working layer of Smart Travel: a place to explore the visual language,
          navigation, and accessible components.
        </DialogDescription>
        <div className="dialog-note">
          <ShieldCheck aria-hidden="true" />
          <p>
            No live services are connected. This preview does not create accounts, store trips, or
            send your information to travel providers.
          </p>
        </div>
        <p className="muted-text">
          Destination discovery and planning will arrive in separately approved phases.
        </p>
        <DialogClose asChild>
          <Button asChild>
            <Link to="/settings">
              View preview status <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
