import { destinationSchema } from './discovery-client';
import type { Destination } from '../../../../supabase/functions/_shared/contracts';

const databaseName = 'smart-travel-discovery';
const storeName = 'saved-destinations';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Device storage is unavailable.'));
      return;
    }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' });
    };
    request.onerror = () => reject(new Error('Device storage could not be opened.'));
    request.onblocked = () =>
      reject(new Error('Close older Smart Travel tabs, then retry storage.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
export async function readSaved(): Promise<Destination[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      let records: Destination[] = [];
      request.onsuccess = () => {
        const values: unknown[] = request.result;
        const parsed = values.map((value) => destinationSchema.safeParse(value));
        if (parsed.some((value) => !value.success)) {
          reject(new Error('Saved destinations contain an unsupported record.'));
          return;
        }
        records = parsed.flatMap((value) => (value.success ? [value.data] : []));
      };
      tx.oncomplete = () => resolve(records);
      tx.onerror = () => reject(new Error('Saved destinations could not be read.'));
      tx.onabort = () => reject(new Error('Storage read was interrupted.'));
    });
  } finally {
    db.close();
  }
}
export async function writeSaved(destination: Destination, save: boolean) {
  const value = destinationSchema.parse(destination);
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (save) store.put(value);
      else store.delete(value.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error('Could not save on this device. Storage may be full or blocked.'));
      tx.onabort = () =>
        reject(new Error('Could not save on this device. Storage may be full or blocked.'));
    });
  } finally {
    db.close();
  }
}
