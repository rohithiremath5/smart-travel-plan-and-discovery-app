import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { appConfig } from '@/app/config/environment';
import { Notice } from '@/components/feedback/notice';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

const titles: Record<string, string> = {
  '/': 'A considered journey',
  '/discover': 'Discover',
  '/trips': 'My trips',
  '/saved': 'Saved',
  '/settings': 'Preview settings',
  '/design-system': 'Design system',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const tripTitle =
      pathname === '/trips/new'
        ? 'Create trip'
        : pathname.endsWith('/edit')
          ? 'Edit trip'
          : pathname.endsWith('/itinerary')
            ? 'Trip itinerary'
            : pathname.endsWith('/budget')
              ? 'Budget and weather'
              : pathname.endsWith('/organizer')
                ? 'Trip organizer'
                : pathname.endsWith('/print')
                  ? 'Travel summary'
                  : 'Your trip';
    document.title = `${titles[pathname] ?? (pathname.startsWith('/destinations/') ? 'Destination' : pathname.startsWith('/trips/') ? tripTitle : 'Page not found')} · ${appConfig.appName}`;
    if (previousPath.current !== pathname) {
      window.scrollTo(0, 0);
      mainRef.current?.focus();
      previousPath.current = pathname;
    }
  }, [pathname]);
  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {appConfig.runtimeMode === 'unavailable' && (
          <div className="container live-mode-notice">
            <Notice title="Worldwide discovery is not configured" tone="warning">
              Public Supabase configuration is missing. Browse the explicitly labeled curated
              collection while backend setup is unavailable.
            </Notice>
          </div>
        )}
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
