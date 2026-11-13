import type { ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Notice({
  title,
  children,
  tone = 'info',
  announce = false,
}: {
  title: string;
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
  announce?: boolean;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : CircleAlert;
  return (
    <div
      className={cn('notice', `notice-${tone}`)}
      role={announce ? (tone === 'error' ? 'alert' : 'status') : undefined}
    >
      <Icon aria-hidden="true" />
      <div>
        <p className="notice-title">{title}</p>
        <div className="notice-copy">{children}</div>
      </div>
    </div>
  );
}
