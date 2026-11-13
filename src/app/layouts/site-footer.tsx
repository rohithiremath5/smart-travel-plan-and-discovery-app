import { ArrowUpRight, Compass } from 'lucide-react';
import { Link } from 'react-router';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-wordmark">
            <Compass aria-hidden="true" /> Made for the journey ahead.
          </div>
          <p>Space to dream. Room to make it your own.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/design-system">
            Design system <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link to="/settings">
            Preview status <ArrowUpRight aria-hidden="true" />
          </Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>Smart Travel · Guest workspace</span>
        <span>Your plans. Saved on this device.</span>
      </div>
    </footer>
  );
}
