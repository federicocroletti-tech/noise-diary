import { Injectable } from '@angular/core';
import { AudioClip, AudioClipMetadata } from './models/audio-clip.model';

const DATABASE_NAME = 'noise-diary';
const DATABASE_VERSION = 2;
const STORE_NAME = 'audio-clips';

@Injectable({ providedIn: 'root' })
export class AudioClipRepository {
  private databasePromise?: Promise<IDBDatabase>;
  private database?: IDBDatabase;

  async save(clip: AudioClip): Promise<void> {
    const database = await this.openDatabase();
    await this.runTransaction(database, 'readwrite', (store) => store.put(clip));
  }

  async listByEvent(eventId: string): Promise<AudioClip[]> {
    const database = await this.openDatabase();
    return this.runTransaction<AudioClip[]>(database, 'readonly', (store) =>
      store.index('eventId').getAll(eventId),
    );
  }

  async getMetadataByEvent(eventId: string): Promise<AudioClipMetadata[]> {
    const clips = await this.listByEvent(eventId);
    return clips.map(({ blob, ...metadata }) => {
      void blob;
      return metadata;
    });
  }

  async delete(id: string): Promise<void> {
    const database = await this.openDatabase();
    await this.runTransaction(database, 'readwrite', (store) => store.delete(id));
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
    this.databasePromise = undefined;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB non è disponibile in questo browser.'));
    }

    this.databasePromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('eventId', 'eventId', { unique: false });
        }
        if (!database.objectStoreNames.contains('noise-events')) {
          database.createObjectStore('noise-events', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.database = request.result;
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('Impossibile aprire IndexedDB.'));
      request.onblocked = () => reject(new Error('Aggiornamento IndexedDB bloccato da un’altra scheda.'));
    });

    return this.databasePromise;
  }

  private runTransaction<T>(
    database: IDBDatabase,
    mode: IDBTransactionMode,
    requestFactory: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = requestFactory(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('Operazione audio locale non riuscita.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Transazione audio locale annullata.'));
    });
  }
}
