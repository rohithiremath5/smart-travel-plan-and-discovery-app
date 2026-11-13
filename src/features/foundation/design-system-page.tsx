import { ArrowDown, ArrowLeft, ArrowUpRight, Check, CircleDashed, Layers3 } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Notice } from '@/components/feedback/notice';
import { PreviewForm } from './preview-form';

const swatches = [
  { name: 'Warm canvas', value: '#F7F5F0' },
  { name: 'Paper surface', value: '#FFFFFF' },
  { name: 'Ocean teal', value: '#0B6764' },
  { name: 'Deep ink', value: '#182F32' },
  { name: 'Quiet sage', value: '#DDEEE9' },
  { name: 'Secondary ink', value: '#526568' },
  { name: 'Focus blue', value: '#1259B5' },
  { name: 'Error red', value: '#AD2834' },
];

function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          Try a dialog <ArrowUpRight aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Badge tone="accent">
          <Layers3 aria-hidden="true" /> Component example
        </Badge>
        <DialogTitle>A moment of focus.</DialogTitle>
        <DialogDescription>
          A calm space for a clear decision. This reusable dialog supports keyboard navigation,
          Escape to close, and focus returning to the button that opened it.
        </DialogDescription>
        <Notice title="Just a component preview">
          Closing this dialog does not change or save any travel information.
        </Notice>
        <DialogClose asChild>
          <Button>
            All clear <Check aria-hidden="true" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function DesignSystemPage() {
  return (
    <div className="container design-system-page">
      <Link to="/" className="back-link">
        <ArrowLeft aria-hidden="true" /> Back to overview
      </Link>
      <div className="page-heading">
        <p className="eyebrow">THE FOUNDATION COLLECTION</p>
        <h1>
          Small details.
          <br />
          <em>A considered whole.</em>
        </h1>
        <p>
          The building blocks of Smart Travel. Try the interactions, follow the focus, and get a
          feel for what’s to come.
        </p>
      </div>
      <Tabs defaultValue="components">
        <div className="collection-toolbar">
          <TabsList aria-label="Foundation collection">
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="tokens">Design tokens</TabsTrigger>
          </TabsList>
          <Badge tone="accent">Phase 1 · Interactive preview</Badge>
        </div>
        <TabsContent value="components">
          <div className="component-grid">
            <Card>
              <CardHeader>
                <span className="tile-number">01 / ACTIONS</span>
                <CardTitle>Clear invitations to interact.</CardTitle>
                <p>Consistent actions, with space for focus.</p>
              </CardHeader>
              <CardContent>
                <div className="button-examples">
                  <DialogExample />
                  <Button asChild variant="secondary">
                    <Link to="/settings">
                      Preview status <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <a href="#feedback">
                      View feedback <ArrowDown aria-hidden="true" />
                    </a>
                  </Button>
                </div>
                <div className="component-divider" />
                <p className="field-label">Non-interactive state examples</p>
                <div className="button-examples state-examples">
                  <Button disabled>Disabled example</Button>
                  <Button loading>Loading example</Button>
                </div>
                <p className="field-hint">
                  These examples demonstrate unavailable and busy states.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <span className="tile-number">02 / FORM FIELDS</span>
                <CardTitle>A little guidance goes a long way.</CardTitle>
                <p>Visible labels, useful hints, and clear validation.</p>
              </CardHeader>
              <CardContent>
                <PreviewForm />
              </CardContent>
            </Card>
            <Card id="feedback">
              <CardHeader>
                <span className="tile-number">03 / FEEDBACK</span>
                <CardTitle>Always know where you stand.</CardTitle>
                <p>Meaningful feedback, beyond color alone.</p>
              </CardHeader>
              <CardContent className="feedback-examples">
                <Notice tone="success" title="Success state example">
                  A quiet confirmation, with a clear message.
                </Notice>
                <Notice tone="warning" title="Warning state example">
                  Important context stays visible.
                </Notice>
                <Notice tone="error" title="Error state example">
                  A useful explanation of what needs attention.
                </Notice>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <span className="tile-number">04 / LOADING & UNAVAILABLE</span>
                <CardTitle>Considered in every state.</CardTitle>
                <p>Stable layouts and honest availability.</p>
              </CardHeader>
              <CardContent>
                <div className="loading-example" role="img" aria-label="Loading layout example">
                  <Skeleton className="skeleton-icon" />
                  <div>
                    <Skeleton className="skeleton-title" />
                    <Skeleton className="skeleton-line" />
                  </div>
                </div>
                <div className="component-divider" />
                <label className="field-label" htmlFor="unavailable-field">
                  Unavailable input example
                </label>
                <Input id="unavailable-field" disabled value="This field is disabled" readOnly />
                <div className="availability-example">
                  <CircleDashed aria-hidden="true" />
                  <span>Future features are clearly marked.</span>
                  <Badge>Coming later</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="tokens">
          <section className="token-section" aria-labelledby="color-title">
            <p className="eyebrow">01 / THE PALETTE</p>
            <h2 id="color-title">Grounded in warmth.</h2>
            <p className="muted-text">
              Warm paper, deep ink, and an ocean-teal accent. Semantic colors give feedback a
              familiar voice.
            </p>
            <div className="swatch-grid">
              {swatches.map((swatch) => (
                <div className="swatch" key={swatch.name}>
                  <span className="swatch-color" style={{ backgroundColor: swatch.value }} />
                  <div>
                    <h3>{swatch.name}</h3>
                    <code>{swatch.value}</code>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="type-specimen" aria-labelledby="type-title">
            <div>
              <p className="eyebrow">02 / TYPOGRAPHY</p>
              <h2 id="type-title">
                A story worth
                <br />
                <em>taking your time with.</em>
              </h2>
            </div>
            <div>
              <p className="type-body-sample">
                Editorial headings meet clear, practical interface text. System fonts keep the
                experience quick, private, and comfortable across devices.
              </p>
              <p className="field-hint">
                Serif display · Sans-serif interface · 16 px body · Generous line height
              </p>
            </div>
          </section>
          <section className="spacing-specimen" aria-labelledby="spacing-title">
            <p className="eyebrow">03 / RHYTHM & ACCESS</p>
            <h2 id="spacing-title">Give the details room.</h2>
            <p className="muted-text">
              A 4 px spacing scale, 44 px action targets, visible focus, and reduced-motion support.
            </p>
            <div className="spacing-bars" aria-label="Spacing scale">
              {[4, 8, 12, 16, 24, 32, 48, 64].map((size) => (
                <div key={size}>
                  <span style={{ height: size }} />
                  <code>{size}</code>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>
      <p className="collection-footnote">
        A working component collection. No destination search, trip creation, or live integrations
        are included.
      </p>
    </div>
  );
}
