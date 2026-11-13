export const tripsDatabaseName = 'smart-travel-trips';
export const tripsDatabaseVersion = 4;
export type DatabaseFactory = () => IDBFactory | undefined;
export const defaultDatabaseFactory: DatabaseFactory = () => globalThis.indexedDB;
export const storageError =
  'Device storage could not complete this action. It may be full, blocked or unavailable. No storage was reset. Retry or restore a supported backup.';
export function openTripsDatabase(factory = defaultDatabaseFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const api = factory();
    if (!api) {
      reject(new Error(storageError));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new Error('Close older Smart Travel tabs and retry device storage.'));
    }, 5000);
    const fail = () => {
      clearTimeout(timer);
      settled = true;
      reject(new Error(storageError));
    };
    let request: IDBOpenDBRequest;
    try {
      request = api.open(tripsDatabaseName, tripsDatabaseVersion);
    } catch {
      fail();
      return;
    }
    request.onupgradeneeded = (event) => {
      if (settled) {
        request.transaction?.abort();
        return;
      }
      const db = request.result;
      // Additive migrations: existing v1 trip records are never rewritten or removed.
      if (event.oldVersion < 1) db.createObjectStore('trips', { keyPath: 'id' });
      if (event.oldVersion < 2) db.createObjectStore('itineraries', { keyPath: 'tripId' });
      if (event.oldVersion < 3) db.createObjectStore('organizers', { keyPath: 'tripId' });
      if (event.oldVersion < 4) db.createObjectStore('budgets', { keyPath: 'tripId' });
    };
    request.onerror = fail;
    request.onblocked = () => {
      clearTimeout(timer);
      settled = true;
      reject(new Error('Close older Smart Travel tabs and retry device storage.'));
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) {
        request.result.close();
        return;
      }
      const db = request.result;
      db.onversionchange = () => db.close();
      if (
        !['trips', 'itineraries', 'organizers', 'budgets'].every((name) =>
          db.objectStoreNames.contains(name),
        )
      ) {
        db.close();
        reject(new Error(storageError));
        return;
      }
      resolve(db);
    };
  });
}
export async function tripsTransaction<T>(
  factory: DatabaseFactory,
  stores: string[],
  mode: IDBTransactionMode,
  action: (tx: IDBTransaction, finish: (value: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  const db = await openTripsDatabase(factory);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T;
      let error: Error | undefined;
      const fail = (reason: Error) => {
        error = reason;
        tx.abort();
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(error ?? new Error(storageError));
      tx.onabort = () => reject(error ?? new Error(storageError));
      try {
        action(
          tx,
          (result) => {
            value = result;
          },
          fail,
        );
      } catch {
        fail(new Error(storageError));
      }
    });
  } finally {
    db.close();
  }
}
