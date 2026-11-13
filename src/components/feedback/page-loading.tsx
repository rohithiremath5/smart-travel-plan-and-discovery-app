import { Skeleton } from '@/components/ui/skeleton';

export function PageLoading() {
  return (
    <div className="container page-loading" role="status">
      <p>Loading this page…</p>
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-line" />
    </div>
  );
}
