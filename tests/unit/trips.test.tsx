import { beforeEach, describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRoutes } from '@/app/router/app-routes';
import { tripRepository } from '@/features/trips/services/trip-repository';
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
});
function route(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
describe('guest trip experience', () => {
  it('shows an honest empty dashboard without authentication or provider requests', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    route('/trips');
    expect(await screen.findByRole('heading', { name: /Welcome to your/ })).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'The world is still unwritten.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create new trip' })).toHaveAttribute(
      'href',
      '/trips/new',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('validates, preserves backward navigation and creates a local trip after final review', async () => {
    const user = userEvent.setup();
    route('/trips/new');
    await screen.findByRole('heading', { name: 'Destination', level: 2 });
    await user.click(screen.getByRole('button', { name: 'Next: Travel dates' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a destination');
    await user.click(screen.getByRole('button', { name: /Kyoto.*Japan/ }));
    await user.click(screen.getByRole('button', { name: 'Next: Travel dates' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2028-03-20' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2028-03-18' } });
    await user.click(screen.getByRole('button', { name: 'Next: Travelers' }));
    expect(screen.getByRole('alert')).toHaveTextContent('End date must');
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2028-03-23' } });
    await user.click(screen.getByRole('button', { name: 'Next: Travelers' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Start date')).toHaveValue('2028-03-20');
    await user.click(screen.getByRole('button', { name: 'Next: Travelers' }));
    await user.clear(screen.getByLabelText('Number of travelers'));
    await user.type(screen.getByLabelText('Number of travelers'), '2');
    await user.selectOptions(screen.getByLabelText('Travel group'), 'Friends');
    await user.click(screen.getByRole('button', { name: 'Next: Budget' }));
    await user.type(screen.getByLabelText('Total trip budget'), '1200.50');
    await user.click(screen.getByRole('button', { name: 'Next: Interests' }));
    await user.click(screen.getByRole('button', { name: 'Next: Travel pace' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one');
    await user.click(screen.getByLabelText('Culture'));
    await user.click(screen.getByRole('button', { name: 'Next: Travel pace' }));
    await user.click(screen.getByLabelText(/Slow mornings/));
    await user.click(screen.getByRole('button', { name: 'Next: Review & create' }));
    expect(screen.getByText('4 days, including arrival and departure')).toBeVisible();
    await user.clear(screen.getByLabelText('Trip name'));
    await user.type(screen.getByLabelText('Trip name'), 'Spring in Kyoto');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByRole('heading', { name: 'Spring in Kyoto', level: 1 })).toBeVisible();
    expect(await tripRepository.list()).toMatchObject([
      { title: 'Spring in Kyoto', travelers: 2, budgetMinor: 120050, pace: 'Relaxed' },
    ]);
  });
  it('shows storage errors and never displays a fake identity', async () => {
    vi.stubGlobal('indexedDB', undefined);
    route('/trips');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.getByRole('button', { name: 'Retry storage' })).toBeEnabled();
    expect(screen.queryByText(/Welcome back, /)).not.toBeInTheDocument();
  });
  it('provides a working manual destination fallback without a provider', async () => {
    const user = userEvent.setup();
    route('/trips/new');
    await user.click(await screen.findByRole('button', { name: 'Enter manually' }));
    await user.type(screen.getByLabelText('Destination name'), 'A quiet village');
    await user.click(screen.getByRole('button', { name: 'Use this destination' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Selected: A quiet village'),
    );
    expect(screen.getByRole('button', { name: 'Worldwide search' })).toBeDisabled();
  });
});
