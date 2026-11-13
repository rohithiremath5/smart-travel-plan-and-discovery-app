import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/app/providers/app-providers';
import { LocationSearch } from '@/features/mapping/components/location-search';
import { requestMapping } from '@/features/mapping/services/mapping-client';
vi.mock('@/features/mapping/services/mapping-client', () => ({
  requestMapping: vi.fn(),
  mappingErrorMessage: () => 'Search unavailable; your plan is safe.',
}));
it('offers truthful curated centres without requiring a provider request', async () => {
  const select = vi.fn();
  render(
    <AppProviders>
      <LocationSearch near={{ latitude: 35, longitude: 135 }} select={select} />
    </AppProviders>,
  );
  await userEvent.click(screen.getByRole('button', { name: /Kyoto.*Curated centre coordinate/ }));
  expect(select).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Kyoto',
      source: 'curated',
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    }),
  );
  expect(requestMapping).not.toHaveBeenCalled();
});
it('debounces worldwide search and cancels an obsolete request on query change and unmount', async () => {
  const signals: AbortSignal[] = [];
  vi.mocked(requestMapping).mockImplementation((_input, signal) => {
    signals.push(signal!);
    return new Promise((_resolve, reject) =>
      signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
    );
  });
  const view = render(
    <AppProviders>
      <LocationSearch near={{ latitude: 35, longitude: 135 }} select={vi.fn()} />
    </AppProviders>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Worldwide places' }));
  fireEvent.change(screen.getByLabelText('Search for a place', { exact: true }), {
    target: { value: 'Kyoto garden' },
  });
  await waitFor(() => expect(requestMapping).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Search for a place', { exact: true }), {
    target: { value: 'Kyoto station' },
  });
  await waitFor(() => expect(requestMapping).toHaveBeenCalledTimes(2));
  expect(signals[0]!.aborted).toBe(true);
  view.unmount();
  expect(signals[1]!.aborted).toBe(true);
});
