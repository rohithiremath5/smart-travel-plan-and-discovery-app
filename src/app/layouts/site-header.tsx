import { useState } from 'react';
import { ArrowUpRight, Menu, Settings2 } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Brand } from '@/components/common/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/discover', label: 'Discover' },
  { to: '/trips', label: 'My trips' },
  { to: '/saved', label: 'Saved' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <Badge className="header-preview">Guest workspace</Badge>
          <Button asChild variant="ghost" size="icon">
            <Link to="/settings" aria-label="Preview settings">
              <Settings2 aria-hidden="true" />
            </Link>
          </Button>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu-trigger"
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="navigation-sheet">
              <DialogTitle>Find your way</DialogTitle>
              <DialogDescription>Find a place, or return to one you saved.</DialogDescription>
              <nav aria-label="Mobile navigation" className="mobile-nav">
                {[
                  ...navigation,
                  { to: '/design-system', label: 'Design system' },
                  { to: '/settings', label: 'Preview settings' },
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn('mobile-nav-link', isActive && 'nav-link-active')
                    }
                  >
                    {item.label}
                    <ArrowUpRight aria-hidden="true" />
                  </NavLink>
                ))}
              </nav>
              <p className="muted-text">Saved places stay on this device.</p>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
