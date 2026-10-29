import { Injectable } from '@angular/core';
import { NoiseEvent } from '../domain/noise-event.model';

const DATABASE_NAME = 'noise-diary';
const DATABASE_VERSION = 2;
const STORE_NAME = 'noise-events';

@Injectable({ providedIn: 'root' })
export class NoiseEventRepository {
  private databasePromise?: Promise<IDBDatabase>;
  private database?: IDBDatabase;

  async getAll(): Promise<NoiseEvent[]> {
    const database = await this.openDatabase();
    return this.runTransaction(database, 'readonly', (store) => store.getAll());
  }

  async saveAll(events: NoiseEvent[]): Promise<void> {
    const database = await this.openDatabase();
    await this.runTransaction(database, 'readwrite', (store) => {
      store.clear();
      for (const event of events) {
        store.put(event);
      }
      return store.getAllKeys();
    });
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
        if (!database.objectStoreNames.contains('audio-clips')) {
          const audioStore = database.createObjectStore('audio-clips', { keyPath: 'id' });
          audioStore.createIndex('eventId', 'eventId', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.database = request.result;
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => {
        this.databasePromise = undefined;
        reject(request.error ?? new Error('Impossibile aprire IndexedDB per gli episodi.'));
      };
      request.onblocked = () => {
        this.databasePromise = undefined;
        reject(new Error('Aggiornamento IndexedDB bloccato da un’altra scheda. Chiudi le altre schede e riprova.'));
      };
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
      request.onerror = () => reject(request.error ?? new Error('Operazione sugli episodi non riuscita.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Transazione episodi annullata.'));
      transaction.onerror = () => reject(transaction.error ?? new Error('Errore nella transazione episodi.'));
    });
  }
}
