import { beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRoutes } from '@/app/router/app-routes';
import { tripRepository } from '@/features/trips/services/trip-repository';
import { itineraryRepository } from '@/features/itinerary/services/itinerary-repository';

beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
async function setup() {
  const trip = await tripRepository.create({
    title: 'A local journey',
    destination: { id: 'kyoto', name: 'Kyoto', country: 'Japan', source: 'curated' },
    startDate: '2030-03-20',
    endDate: '2030-03-21',
    travelers: 1,
    groupType: 'Solo',
    budgetMinor: 10000,
    currency: 'USD',
    budgetPreference: 'Value',
    interests: ['Culture'],
    pace: 'Balanced',
    status: 'Planning',
  });
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[`/trips/${trip.id}/itinerary`]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
  await screen.findByRole('heading', { name: trip.title, level: 1 }, { timeout: 5000 });
  return trip;
}
it('validates activity entries, persists a real activity and provides keyboard move controls', async () => {
  const trip = await setup();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add activity' }));
  await user.click(screen.getByRole('button', { name: 'Add to day' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('two characters');
  fireEvent.change(screen.getByLabelText('Activity title', { exact: true }), {
    target: { value: 'A garden walk' },
  });
  await user.click(screen.getByRole('button', { name: 'Add to day' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(await screen.findByRole('heading', { name: 'A garden walk' })).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add activity' })).toHaveFocus());
  expect(screen.getByRole('button', { name: 'Move A garden walk up' })).toBeDisabled();
  expect((await itineraryRepository.load(trip.id)).plan.days[0]!.activities[0]!.title).toBe(
    'A garden walk',
  );
});
it('keeps the entered activity form on a concurrent-edit conflict', async () => {
  const trip = await setup();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add activity' }));
  fireEvent.change(screen.getByLabelText('Activity title', { exact: true }), {
    target: { value: 'Keep this draft' },
  });
  await itineraryRepository.saveNotes(trip.id, '2030-03-20', 'Changed in another tab', 0);
  await user.click(screen.getByRole('button', { name: 'Add to day' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('another tab'));
  expect(screen.getByLabelText('Activity title', { exact: true })).toHaveValue('Keep this draft');
  expect((await itineraryRepository.load(trip.id)).plan.days[0]!.activities).toHaveLength(0);
});
it('guards unsaved day notes and leaves stored notes unchanged when discarding the draft', async () => {
  const trip = await setup();
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText('Day notes', { exact: true }), {
    target: { value: 'Unsaved' },
  });
  await user.click(screen.getByRole('button', { name: /Day 2/ }));
  expect(await screen.findByRole('dialog', { name: 'Keep your day notes?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Discard notes draft' }));
  expect(screen.getByLabelText('Day notes', { exact: true })).toHaveValue('');
  expect((await itineraryRepository.load(trip.id)).plan.days[0]!.notes).toBe('');
});
it('guards internal navigation away from an unsaved day-note draft', async () => {
  await setup();
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText('Day notes', { exact: true }), {
    target: { value: 'Keep until confirmed' },
  });
  await user.click(screen.getByRole('link', { name: 'Trip overview' }));
  expect(await screen.findByRole('dialog', { name: 'Keep your day notes?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Stay and save notes' }));
  expect(screen.getByLabelText('Day notes', { exact: true })).toHaveValue('Keep until confirmed');
});
