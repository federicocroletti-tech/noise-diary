import { Injectable } from '@angular/core';
import { AudioClip } from '../audio/models/audio-clip.model';
import { encryptAudioClip } from '../audio/audio-clip.repository';
import { isNoiseEvent, NoiseEvent } from '../domain/noise-event.model';
import { EncryptedPayload, isArrayBuffer, LocalVaultService } from './local-vault.service';

const DATABASE_NAME = 'noise-diary';
const DATABASE_VERSION = 2;
const STORE_NAME = 'noise-events';
const AUDIO_STORE_NAME = 'audio-clips';

@Injectable({ providedIn: 'root' })
export class NoiseEventRepository {
  private databasePromise?: Promise<IDBDatabase>;
  private database?: IDBDatabase;

  constructor(private readonly vault: LocalVaultService) {}

  async getAll(): Promise<NoiseEvent[]> {
    const database = await this.openDatabase();
    const records = await this.runTransaction<unknown[]>(database, 'readonly', (store) =>
      store.getAll(),
    );
    const needsMigration: NoiseEvent[] = [];
    const events = await Promise.all(
      records.map(async (record) => {
        if (this.isEncryptedEvent(record)) {
          const event = await this.vault.decryptJson(record, isNoiseEvent);
          if (event.id !== record.id) {
            throw new Error('Un episodio cifrato non corrisponde al suo ID di archivio.');
          }
          return event;
        }
        if (!isNoiseEvent(record)) {
          throw new Error('Un episodio salvato non è leggibile; i dati locali non sono stati modificati.');
        }
        needsMigration.push(record);
        return record;
      }),
    );
    if (needsMigration.length > 0) {
      await this.saveAll(events);
    }
    return events;
  }

  async saveAll(events: NoiseEvent[]): Promise<void> {
    const database = await this.openDatabase();
    const encryptedEvents = await Promise.all(
      events.map(async (event) => ({
        id: event.id,
        ...(await this.vault.encryptJson(event)),
      })),
    );
    await this.runTransaction(database, 'readwrite', (store) => {
      store.clear();
      for (const event of encryptedEvents) {
        store.put(event);
      }
      return store.getAllKeys();
    });
  }

  async saveAllWithAudio(
    events: NoiseEvent[],
    clips: AudioClip[],
    replaceAudio = false,
  ): Promise<void> {
    const eventIds = new Set(events.map((event) => event.id));
    if (clips.some((clip) => !eventIds.has(clip.eventId))) {
      throw new Error('Una registrazione audio non è associata a un episodio del diario.');
    }
    if (new Set(clips.map((clip) => clip.id)).size !== clips.length) {
      throw new Error('Il backup contiene ID registrazione duplicati; i dati locali non sono stati modificati.');
    }

    const [encryptedEvents, encryptedClips] = await Promise.all([
      Promise.all(
        events.map(async (event) => ({
          id: event.id,
          ...(await this.vault.encryptJson(event)),
        })),
      ),
      Promise.all(clips.map((clip) => encryptAudioClip(clip, this.vault))),
    ]);
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, AUDIO_STORE_NAME], 'readwrite');
      const eventStore = transaction.objectStore(STORE_NAME);
      eventStore.clear();
      for (const event of encryptedEvents) {
        eventStore.put(event);
      }
      const audioStore = transaction.objectStore(AUDIO_STORE_NAME);
      if (replaceAudio) {
        audioStore.clear();
      }
      for (const clip of encryptedClips) {
        audioStore.put(clip);
      }

      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Importazione del diario annullata.'));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Importazione del diario non riuscita.'));
    });
  }

  async deleteEventAndAudio(eventId: string): Promise<void> {
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, AUDIO_STORE_NAME], 'readwrite');
      transaction.objectStore(STORE_NAME).delete(eventId);

      const audioStore = transaction.objectStore(AUDIO_STORE_NAME);
      const request = audioStore.index('eventId').openKeyCursor(IDBKeyRange.only(eventId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          audioStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Impossibile trovare le registrazioni associate.'));

      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Eliminazione episodio annullata.'));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Eliminazione episodio non riuscita.'));
    });
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
    this.databasePromise = undefined;
  }

  private isEncryptedEvent(value: unknown): value is EncryptedPayload & { id: string } {
    return (
      value !== null &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'iv' in value &&
      isArrayBuffer(value.iv) &&
      'ciphertext' in value &&
      isArrayBuffer(value.ciphertext)
    );
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
