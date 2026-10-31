import { Injectable } from '@angular/core';
import { AudioClip, AudioClipMetadata } from './models/audio-clip.model';
import {
  EncryptedPayload,
  isArrayBuffer,
  LocalVaultService,
} from '../services/local-vault.service';

const DATABASE_NAME = 'noise-diary';
const DATABASE_VERSION = 2;
const STORE_NAME = 'audio-clips';

interface EncryptedAudioClip extends EncryptedPayload {
  id: string;
  eventId: string;
}

@Injectable({ providedIn: 'root' })
export class AudioClipRepository {
  private databasePromise?: Promise<IDBDatabase>;
  private database?: IDBDatabase;

  constructor(private readonly vault: LocalVaultService) {}

  async save(clip: AudioClip): Promise<void> {
    const database = await this.openDatabase();
    const metadata: AudioClipMetadata = {
      id: clip.id,
      eventId: clip.eventId,
      kind: clip.kind,
      fileName: clip.fileName,
      mimeType: clip.mimeType,
      sizeBytes: clip.sizeBytes,
      durationMs: clip.durationMs,
      createdAt: clip.createdAt,
      sha256: clip.sha256,
      origin: clip.origin,
      device: clip.device,
    };
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const audioBytes = new Uint8Array(await clip.blob.arrayBuffer());
    const plaintext = new Uint8Array(4 + metadataBytes.length + audioBytes.length);
    new DataView(plaintext.buffer).setUint32(0, metadataBytes.length);
    plaintext.set(metadataBytes, 4);
    plaintext.set(audioBytes, 4 + metadataBytes.length);
    const encrypted = await this.vault.encryptBytes(plaintext);
    await this.runTransaction(database, 'readwrite', (store) =>
      store.put({ id: clip.id, eventId: clip.eventId, ...encrypted }),
    );
  }

  async listByEvent(eventId: string): Promise<AudioClip[]> {
    const database = await this.openDatabase();
    const records = await this.runTransaction<unknown[]>(database, 'readonly', (store) =>
      store.index('eventId').getAll(eventId),
    );
    const legacyClips: AudioClip[] = [];
    const clips = await Promise.all(
      records.map(async (record) => {
        if (this.isEncryptedClip(record)) {
          return this.decryptClip(record);
        }
        if (!this.isAudioClip(record)) {
          throw new Error('Una registrazione salvata non è leggibile; i dati locali non sono stati modificati.');
        }
        legacyClips.push(record);
        return record;
      }),
    );
    await Promise.all(legacyClips.map((clip) => this.save(clip)));
    return clips;
  }

  async encryptLegacyRecords(): Promise<void> {
    const database = await this.openDatabase();
    const records = await this.runTransaction<unknown[]>(database, 'readonly', (store) =>
      store.getAll(),
    );
    const legacyClips: AudioClip[] = [];
    for (const record of records) {
      if (this.isEncryptedClip(record)) {
        continue;
      }
      if (!this.isAudioClip(record)) {
        throw new Error('Una registrazione salvata non è leggibile; i dati locali non sono stati modificati.');
      }
      legacyClips.push(record);
    }
    await Promise.all(legacyClips.map((clip) => this.save(clip)));
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

  private async decryptClip(record: EncryptedAudioClip): Promise<AudioClip> {
    const plaintext = new Uint8Array(await this.vault.decryptBytes(record));
    if (plaintext.length < 4) {
      throw new Error('Una registrazione cifrata è incompleta.');
    }

    const metadataLength = new DataView(
      plaintext.buffer,
      plaintext.byteOffset,
      plaintext.byteLength,
    ).getUint32(0);
    const audioStart = 4 + metadataLength;
    if (metadataLength === 0 || audioStart > plaintext.length) {
      throw new Error('I metadati di una registrazione cifrata non sono validi.');
    }

    let metadata: unknown;
    try {
      metadata = JSON.parse(new TextDecoder().decode(plaintext.subarray(4, audioStart)));
    } catch (error) {
      throw new Error(`I metadati di una registrazione cifrata non sono leggibili: ${String(error)}`);
    }
    if (!this.isAudioClipMetadata(metadata) || metadata.id !== record.id || metadata.eventId !== record.eventId) {
      throw new Error('I metadati di una registrazione cifrata non rispettano il formato previsto.');
    }

    const audioBytes = plaintext.slice(audioStart);
    if (audioBytes.length !== metadata.sizeBytes) {
      throw new Error('La dimensione di una registrazione cifrata non corrisponde ai metadati.');
    }
    return {
      ...metadata,
      blob: new Blob([audioBytes.buffer], { type: metadata.mimeType }),
    };
  }

  private isEncryptedClip(value: unknown): value is EncryptedAudioClip {
    return (
      value !== null &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'eventId' in value &&
      typeof value.eventId === 'string' &&
      'iv' in value &&
      isArrayBuffer(value.iv) &&
      'ciphertext' in value &&
      isArrayBuffer(value.ciphertext)
    );
  }

  private isAudioClip(value: unknown): value is AudioClip {
    return (
      value !== null &&
      typeof value === 'object' &&
      'blob' in value &&
      value.blob instanceof Blob &&
      this.isAudioClipMetadata(value)
    );
  }

  private isAudioClipMetadata(value: unknown): value is AudioClipMetadata {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    const metadata = value as Record<string, unknown>;
    return (
      typeof metadata['id'] === 'string' &&
      typeof metadata['eventId'] === 'string' &&
      (metadata['kind'] === 'event' || metadata['kind'] === 'background') &&
      typeof metadata['fileName'] === 'string' &&
      typeof metadata['mimeType'] === 'string' &&
      typeof metadata['sizeBytes'] === 'number' &&
      Number.isFinite(metadata['sizeBytes']) &&
      metadata['sizeBytes'] >= 0 &&
      typeof metadata['durationMs'] === 'number' &&
      Number.isFinite(metadata['durationMs']) &&
      metadata['durationMs'] >= 0 &&
      typeof metadata['createdAt'] === 'string' &&
      Number.isFinite(Date.parse(metadata['createdAt'])) &&
      typeof metadata['sha256'] === 'string' &&
      /^[a-f0-9]{64}$/i.test(metadata['sha256']) &&
      metadata['origin'] === 'microphone' &&
      metadata['device'] !== null &&
      typeof metadata['device'] === 'object' &&
      'platform' in metadata['device'] &&
      typeof metadata['device']['platform'] === 'string'
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
