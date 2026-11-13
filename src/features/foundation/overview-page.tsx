import { ArrowDown, ArrowUpRight, Check, Compass, Layers3, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PreviewDialog } from '@/components/common/preview-dialog';
import { CompassArt } from './compass-art';

export function OverviewPage() {
  return (
    <div className="container overview-page">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> A THOUGHTFUL BEGINNING
          </div>
          <h1 id="overview-title">
            Good journeys
            <br />
            start with{' '}
            <em>
              room
              <br className="desktop-break" /> to dream.
            </em>
          </h1>
          <p className="hero-description">
            A calm, considered space for the places you’ll go.
            <br className="desktop-break" /> Our journey starts with the essentials.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/design-system">
                Explore the foundation <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <PreviewDialog />
          </div>
          <div className="hero-footnote">
            <span className="status-dot" /> Local preview <span className="footnote-divider" /> No
            account or API keys needed
          </div>
        </div>
        <CompassArt />
      </section>
      <section className="foundation-section" aria-labelledby="foundation-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONSIDERED, FROM THE START</p>
            <h2 id="foundation-title">
              A place for everything.
              <br />
              <em>One step at a time.</em>
            </h2>
          </div>
          <p>
            This edition sets the tone. The travel features will follow, thoughtfully built and
            ready when they’re ready.
          </p>
          <ArrowDown className="section-arrow" aria-hidden="true" />
        </div>
        <div className="foundation-grid">
          <Link to="/design-system" className="foundation-tile foundation-tile-featured">
            <div className="tile-top">
              <Layers3 aria-hidden="true" />
              <Badge tone="accent">
                <Check aria-hidden="true" /> Ready to explore
              </Badge>
            </div>
            <div>
              <span className="tile-number">01 — THE ESSENTIALS</span>
              <h3>A shared visual language.</h3>
              <p>Thoughtful details, accessible interactions, and room to breathe.</p>
            </div>
            <span className="tile-link">
              Explore the design system <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
          <Link to="/discover" className="foundation-tile">
            <div className="tile-top">
              <Compass aria-hidden="true" />
              <Badge>Coming in Phase 2</Badge>
            </div>
            <div>
              <span className="tile-number">02 — WHAT’S NEXT</span>
              <h3>Possibility, on the horizon.</h3>
              <p>Destination discovery has its own place. For now, a clearly marked preview.</p>
            </div>
            <span className="tile-link">
              View discovery placeholder <MoveUpRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
