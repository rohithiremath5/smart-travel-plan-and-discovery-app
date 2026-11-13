import { ArrowRight, ArrowUpRight, Bookmark, Compass, Leaf } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { DestinationSearch } from '../components/destination-search';
import { DestinationPhoto } from '../components/destination-photo';
import { DestinationCard } from '../components/destination-card';
import { SourceNote } from '../components/source-note';
import { curatedGuides } from '../data/curated';

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="container discovery-landing">
      <section className="travel-hero" aria-labelledby="hero-title">
        <div className="travel-hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" /> THE ART OF GOING SOMEWHERE
          </p>
          <h1 id="hero-title">
            Somewhere new.
            <br />
            <em>Something you.</em>
          </h1>
          <p className="hero-description">
            Find the places that stay with you.
            <br className="desktop-break" /> Start with a little curiosity. Make room for the
            unexpected.
          </p>
          <DestinationSearch
            onSearch={(query) => navigate(`/discover?source=demo&q=${encodeURIComponent(query)}`)}
          />
          <div className="hero-trust">
            <Compass aria-hidden="true" />
            <span>Explore freely.</span>
            <span className="trust-dot">·</span>
            <span>Save on your device.</span>
          </div>
        </div>
        <div className="travel-hero-visual">
          <DestinationPhoto photo="dolomites" priority />
          <div className="hero-location">
            <span>THE QUIETER SIDE OF ITALY</span>
            <Link to="/destinations/dolomites">
              The Dolomites <ArrowUpRight aria-hidden="true" />
            </Link>
            <p>High peaks. A different pace.</p>
          </div>
          <span className="photo-edition">FIELD NOTES / 01</span>
        </div>
      </section>
      <section className="curated-section" aria-labelledby="curated-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FEW PLACES TO BEGIN</p>
            <h2 id="curated-title">Follow your curiosity.</h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/discover?source=demo">
              View the collection <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="destination-grid">
          {curatedGuides
            .filter((guide) => guide.destination.id !== 'dolomites')
            .map((guide) => (
              <DestinationCard key={guide.destination.id} destination={guide.destination} />
            ))}
        </div>
        <SourceNote />
      </section>
      <section className="discovery-values" aria-label="A considered way to explore">
        <div>
          <Compass aria-hidden="true" />
          <h3>A starting point, not a script.</h3>
          <p>Browse a curated collection or search cities and countries worldwide.</p>
        </div>
        <div>
          <Bookmark aria-hidden="true" />
          <h3>Keep what catches your eye.</h3>
          <p>Your saved places stay in this browser, ready when inspiration returns.</p>
        </div>
        <div>
          <Leaf aria-hidden="true" />
          <h3>Travel with a little more care.</h3>
          <p>Look beyond the photograph. Check local guidance and respect the places you visit.</p>
        </div>
      </section>
    </div>
  );
}
