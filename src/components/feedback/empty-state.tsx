import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  heading = 'h2',
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action: ReactNode;
  heading?: 'h1' | 'h2';
}) {
  const Heading = heading;
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon aria-hidden="true" />
      </span>
      <Heading>{title}</Heading>
      <p>{children}</p>
      <div>{action}</div>
    </div>
  );
}
