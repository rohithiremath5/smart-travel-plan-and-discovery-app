import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '@/app/router/app-routes';
import { AppProviders } from '@/app/providers/app-providers';

async function renderRoute(route = '/') {
  const view = render(
    <AppProviders>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
  await screen.findByRole('heading', { level: 1 });
  return view;
}

describe('foundation interactions', () => {
  it('navigates directly to the guest workspace without a login gate', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await user.click(screen.getByRole('link', { name: 'My trips' }));
    expect(await screen.findByRole('heading', { name: /Welcome to your/ })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create new trip' })).toHaveAttribute(
      'href',
      '/trips/new',
    );
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
  it('provides a working return path for missing pages', async () => {
    await renderRoute('/a-missing-route');
    expect(screen.getByRole('heading', { name: 'This path ends here.' })).toBeVisible();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to overview' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Somewhere new.');
  });
  it('opens and dismisses a named dialog using the keyboard', async () => {
    const user = userEvent.setup();
    await renderRoute('/design-system');
    const trigger = screen.getByRole('button', { name: 'Try a dialog' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'A moment of focus.' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('validates a local component example, applies changes, and resets them', async () => {
    const user = userEvent.setup();
    await renderRoute('/design-system');
    const input = screen.getByRole('textbox', { name: 'Preview label' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Update sample' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 2 characters.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.type(input, 'A different perspective');
    await user.click(screen.getByRole('button', { name: 'Update sample' }));
    expect(await screen.findByText('Sample updated for this page only.')).toBeVisible();
    expect(screen.getByText('A different perspective')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reset sample' }));
    expect(input).toHaveValue('A considered journey');
  });
  it('supports keyboard tab selection and disables unavailable examples', async () => {
    const user = userEvent.setup();
    await renderRoute('/design-system');
    expect(screen.getByRole('button', { name: 'Disabled example' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Loading example' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Loading example' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    screen.getByRole('tab', { name: 'Components' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Design tokens' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Grounded in warmth.' })).toBeVisible();
  });
  it('never presents configuration as an implemented cloud connection', async () => {
    await renderRoute('/settings');
    expect(screen.getByText('Local demo')).toBeVisible();
    expect(screen.getByText('No live connection configured')).toBeVisible();
    expect(screen.getByText('IndexedDB in this browser; no cloud backup')).toBeVisible();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
