import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { appConfig } from '@/app/config/environment';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label={`${appConfig.appName} — home`}>
      <span className="brand-mark">
        <Compass aria-hidden="true" strokeWidth={1.6} />
      </span>
      <span>
        <span className="brand-name">
          {appConfig.appName === 'Smart Travel Plan and Discovery App'
            ? 'Smart Travel'
            : appConfig.appName}
          <span className="brand-dot">.</span>
        </span>
        <span className="brand-caption">A considered journey</span>
      </span>
    </Link>
  );
}
