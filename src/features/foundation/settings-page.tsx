import { ArrowLeft, ArrowUpRight, CircleCheck, CircleDashed, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { appConfig, previewCapabilities } from '@/app/config/environment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/feedback/notice';

export function SettingsPage() {
  return (
    <div className="container settings-page">
      <Link to="/" className="back-link">
        <ArrowLeft aria-hidden="true" /> Back to overview
      </Link>
      <div className="page-heading">
        <p className="eyebrow">A CLEARER PICTURE</p>
        <h1>Know where you stand.</h1>
        <p>What’s available in this edition, and how your information is handled.</p>
      </div>
      <div className="settings-grid">
        <Card className="status-card">
          <div className="card-heading-row">
            <ShieldCheck aria-hidden="true" />
            <Badge tone={appConfig.runtimeMode === 'demo' ? 'accent' : 'warning'}>
              {appConfig.runtimeMode === 'demo'
                ? 'Local demo'
                : appConfig.runtimeMode === 'live'
                  ? 'Live requests configured'
                  : 'Live unavailable'}
            </Badge>
          </div>
          <h2>Explore on your terms.</h2>
          <p>
            Curated destinations work without accounts. Worldwide searches contact a secure Geoapify
            proxy when configured. Saved places live in this browser.
          </p>
          <dl className="settings-details">
            <div>
              <dt>Requested mode</dt>
              <dd>{appConfig.requestedMode}</dd>
            </div>
            <div>
              <dt>Current edition</dt>
              <dd>Phase 6 · Guest workspace</dd>
            </div>
            <div>
              <dt>Cloud connection</dt>
              <dd>
                {appConfig.runtimeMode === 'live'
                  ? 'Configured; verified on each request'
                  : 'No live connection configured'}
              </dd>
            </div>
            <div>
              <dt>Trip data</dt>
              <dd>IndexedDB in this browser; no cloud backup</dd>
            </div>
          </dl>
          <Notice title="Configuration stays outside the source">
            Application settings come from your environment. Future credentials are never proof of a
            working connection.
          </Notice>
        </Card>
        <Card className="capability-card">
          <p className="eyebrow">IN THIS EDITION</p>
          <h2>The essentials, honestly.</h2>
          <ul className="capability-list">
            {previewCapabilities.map((item) => (
              <li key={item.label}>
                {item.available ? (
                  <CircleCheck aria-hidden="true" className="text-primary" />
                ) : (
                  <CircleDashed aria-hidden="true" />
                )}
                <div>
                  <span>{item.label}</span>
                  <p>{item.detail}</p>
                </div>
                <Badge tone={item.available ? 'accent' : 'neutral'}>
                  {item.label === 'AI planning'
                    ? 'Local dev'
                    : item.available
                      ? 'Available'
                      : 'Later'}
                </Badge>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary">
            <Link to="/design-system">
              Open the design system <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
