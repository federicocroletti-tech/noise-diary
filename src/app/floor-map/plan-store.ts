export type RoomKind = 'apartment' | 'cellar' | 'attic' | 'garage' | 'other';

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  label: string;
  image: Blob;
  width: number;
  height: number;
}

export interface StoredPlan {
  fileName: string;
  savedAt: string;
  pdf: Blob;
  rooms: PlanRoom[];
}

const DB_NAME = 'noise-diary-plans';
const STORE = 'plans';
const KEY = 'current';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Impossibile aprire l’archivio planimetrie.'));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const PlanStore = {
  load: () => run<StoredPlan | undefined>('readonly', (store) => store.get(KEY)),
  save: (plan: StoredPlan) => run('readwrite', (store) => store.put(plan, KEY)),
  clear: () => run('readwrite', (store) => store.delete(KEY)),
};
