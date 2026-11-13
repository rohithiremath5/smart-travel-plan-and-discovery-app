import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  exportTrips,
  parseTripBackup,
  planImport,
  maximumBackupBytes,
  type TripSnapshot,
} from '../domain/backup';
import { type Trip } from '../domain/trip';
import { downloadBackup } from '../services/download-backup';
import { tripRepository } from '../services/trip-repository';
import { tripQueryKey } from '../hooks/use-trips';

export function BackupPanel({ trips }: { trips: Trip[] }) {
  const [incoming, setIncoming] = useState<(TripSnapshot & { version: 1 | 2 | 3 | 4 }) | null>(
    null,
  );
  const [preview, setPreview] = useState<ReturnType<typeof planImport> | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  async function exportBackup() {
    setBusy(true);
    try {
      const snapshot = await tripRepository.exportSnapshot();
      downloadBackup(
        exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers, snapshot.budgets),
      );
      setError('');
      setMessage('Backup download prepared. Keep the file somewhere safe; it is not encrypted.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File | undefined) {
    setError('');
    setMessage('');
    if (!file) return;
    try {
      if (file.size > maximumBackupBytes)
        throw new Error('Choose a JSON backup smaller than 10 MB.');
      const data = parseTripBackup(await file.text());
      const current = await tripRepository.exportSnapshot();
      setPreview(
        planImport(
          current.trips,
          data.trips,
          current.itineraries,
          data.itineraries,
          current.organizers,
          data.organizers,
          current.budgets,
          data.budgets,
        ),
      );
      setIncoming(data);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  async function confirm() {
    if (!incoming) return;
    setBusy(true);
    try {
      const result = await tripRepository.import(
        incoming.trips,
        incoming.itineraries,
        incoming.organizers,
        incoming.budgets,
      );
      await client.invalidateQueries({ queryKey: tripQueryKey });
      await client.invalidateQueries({ queryKey: ['itinerary'] });
      await client.invalidateQueries({ queryKey: ['organizer'] });
      await client.invalidateQueries({ queryKey: ['budget'] });
      setMessage(
        `Import complete: ${result.added} added, ${result.copied} conflict copies, ${result.skipped} identical trips skipped. Existing trips were preserved.`,
      );
      setIncoming(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="backup-panel" aria-labelledby="backup-title">
      <div>
        <p className="eyebrow">KEEP A COPY OF THE JOURNEY</p>
        <h2 id="backup-title">A little peace of mind.</h2>
        <p>
          Download complete trips, activities, day notes and organizers as JSON, or restore a
          version 1, 2, 3 or 4 export, including budget/expense data when present. Files are
          unencrypted personal data. Keep them private. Maximum 10 MB; export individual trips from
          their itinerary pages if needed.
        </p>
      </div>
      <div className="backup-actions">
        <Button
          variant="secondary"
          disabled={!trips.length || busy}
          onClick={() => {
            void exportBackup();
          }}
        >
          <Download aria-hidden="true" />
          Export trips
        </Button>
        <label className="button button-secondary backup-file-label">
          <Upload aria-hidden="true" />
          Import trips
          <input
            ref={fileRef}
            aria-label="Import trips JSON file"
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
            }}
          />
        </label>
      </div>
      {message && (
        <p className="trip-success" role="status">
          {message}
        </p>
      )}
      {error && !incoming && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Dialog
        open={incoming !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setIncoming(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Review your import</DialogTitle>
          <DialogDescription>
            Nothing has been saved yet. Identical trips are skipped; conflicting records become
            separate copies. Existing trips are never overwritten.
          </DialogDescription>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {preview && (
            <>
              <p>
                {preview.added} to add · {preview.copied} conflict copies · {preview.skipped}{' '}
                identical trips
              </p>
              <ul className="import-trip-list">
                {incoming?.trips.slice(0, 5).map((trip) => (
                  <li key={trip.id}>
                    {trip.title} · {trip.destination.name}
                  </li>
                ))}
              </ul>
              {(incoming?.trips.length ?? 0) > 5 && (
                <p>And {(incoming?.trips.length ?? 0) - 5} more trips.</p>
              )}
              <p>
                Version {incoming?.version} ·{' '}
                {incoming?.itineraries.reduce(
                  (n, plan) => n + plan.days.reduce((sum, day) => sum + day.activities.length, 0),
                  0,
                )}{' '}
                activities.{' '}
                {incoming?.version === 1
                  ? 'Legacy metadata-only file: empty itineraries will be created. Existing itinerary content is never overwritten.'
                  : 'Activities, day notes, and order are included. Conflict copies receive new trip and activity IDs.'}
              </p>
              <p className="field-hint">
                {incoming?.organizers?.reduce(
                  (n, o) => n + o.notes.length + o.checklist.length + o.packing.length,
                  0,
                ) ?? 0}{' '}
                organizer notes and items included. Conflict copies receive new organizer IDs.
              </p>
              <p className="field-hint">
                <ShieldCheck aria-hidden="true" />
                {incoming?.budgets?.reduce((n, b) => n + b.expenses.length, 0) ?? 0} actual expenses
                included; rates and assumptions stay with their trip.
              </p>
              <p className="field-hint">
                <ShieldCheck aria-hidden="true" />
                Duplicate checks run again when you confirm, including changes from another tab.
              </p>
            </>
          )}
          <div className="trip-actions">
            <Button
              loading={busy}
              onClick={() => {
                void confirm();
              }}
            >
              Confirm import
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setIncoming(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
