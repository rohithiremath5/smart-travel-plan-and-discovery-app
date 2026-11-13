import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/feedback/notice';
import { DiscoveryError, discoveryErrorMessage } from '../services/discovery-client';

export function QueryFeedback({
  error,
  updatedAt,
  retry,
}: {
  error: unknown;
  updatedAt: number;
  retry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const until = updatedAt + (error instanceof DiscoveryError ? error.retryAfter * 1000 : 0);
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <Notice tone="warning" title="Discovery needs a moment">
      <p>{discoveryErrorMessage(error)}</p>
      <Button variant="secondary" disabled={remaining > 0} onClick={retry}>
        {remaining > 0 ? `Try again in ${remaining}s` : 'Try again'}
      </Button>
    </Notice>
  );
}
