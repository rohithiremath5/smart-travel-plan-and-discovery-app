import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);
configure({ asyncUtilTimeout: 5000 });
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}
