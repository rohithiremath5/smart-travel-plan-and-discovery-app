import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRoutes } from '@/app/router/app-routes';
import { curatedGuides, searchCurated } from '@/features/discovery/data/curated';
import { readSaved, writeSaved } from '@/features/discovery/services/saved-repository';
import { DestinationPhoto } from '@/features/discovery/components/destination-photo';
import { fireEvent } from '@testing-library/react';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
});
const destination = curatedGuides[0]!.destination;
function route(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
describe('destination discovery', () => {
  it('combines country, keyword and interest predicates without fabricated results', () => {
    expect(searchCurated('Japan', 'culture').map((value) => value.id)).toEqual(['kyoto']);
    expect(searchCurated('mountains', 'nature').map((value) => value.id)).toEqual(['dolomites']);
    expect(searchCurated('Portugal', 'nature')).toEqual([]);
    expect(searchCurated('zzzz')).toEqual([]);
  });
  it('supports combobox keyboard selection and source-specific details', async () => {
    const user = userEvent.setup();
    route('/');
    const search = screen.getByRole('combobox');
    await user.type(search, 'Japan');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(await screen.findByRole('heading', { name: 'Kyoto', level: 1 })).toBeVisible();
    expect(screen.getByText('Curated demo guide')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Nature & outdoors' }));
    expect(screen.getByRole('heading', { name: 'Arashiyama' })).toBeVisible();
  });
  it('saves only after a completed transaction and can remove a persisted record', async () => {
    await writeSaved(destination, true);
    expect(await readSaved()).toEqual([destination]);
    await writeSaved(destination, true);
    expect(await readSaved()).toHaveLength(1);
    await writeSaved(destination, false);
    expect(await readSaved()).toEqual([]);
  });
  it('persists the save action and renders its truthful confirmation', async () => {
    const user = userEvent.setup();
    route('/destinations/kyoto');
    const button = await screen.findByRole('button', { name: 'Save Kyoto' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(await screen.findByText('Saved on this device.')).toBeVisible();
    expect(await readSaved()).toHaveLength(1);
  });
  it('surfaces unavailable storage without claiming a save', async () => {
    vi.stubGlobal('indexedDB', undefined);
    route('/saved');
    expect(await screen.findByText('Device storage is unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry storage' })).toBeEnabled();
    await expect(writeSaved(destination, true)).rejects.toThrow('unavailable');
  });
  it('gives failed live deep links an accessible heading and a retry path', async () => {
    route('/destinations/geo-' + 'b'.repeat(40));
    expect(
      await screen.findByRole('heading', { name: 'Destination unavailable.', level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
  it('retains attribution and replaces a failed photograph accessibly', () => {
    render(<DestinationPhoto photo="kyoto" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Photograph unavailable')).toBeVisible();
    expect(screen.getByRole('link', { name: /Satoshi Hirayama/ })).toHaveAttribute(
      'href',
      expect.stringContaining('pexels.com/photo/'),
    );
  });
});
