import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRoutes } from '@/app/router/app-routes';
import '@/styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');
createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
