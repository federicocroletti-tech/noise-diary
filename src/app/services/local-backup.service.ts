import { Injectable } from '@angular/core';
import { AudioClip, AudioClipMetadata, isAudioClipMetadata } from '../audio/models/audio-clip.model';
import { isNoiseEvent, NoiseEvent } from '../domain/noise-event.model';
import { LocalVaultService } from './local-vault.service';

interface EncodedAudioClip extends AudioClipMetadata {
  data: string;
}

interface DiaryBackupPayload {
  format: 'noise-diary-case-data';
  version: 1;
  exportedAt: string;
  events: NoiseEvent[];
  audioClips: EncodedAudioClip[];
}

export interface DecryptedDiaryBackup {
  events: NoiseEvent[];
  audioClips: AudioClip[];
}

@Injectable({ providedIn: 'root' })
export class LocalBackupService {
  constructor(private readonly vault: LocalVaultService) {}

  async encrypt(
    events: NoiseEvent[],
    audioClips: AudioClip[],
    password: string,
    source: 'local' | 'account' = 'local',
  ): Promise<string> {
    const eventIds = new Set<string>();
    for (const event of events) {
      if (!isNoiseEvent(event) || eventIds.has(event.id)) {
        throw new Error('Il diario contiene episodi non validi o ID duplicati; il backup non è stato creato.');
      }
      eventIds.add(event.id);
    }

    const clipIds = new Set<string>();
    const encodedClips: EncodedAudioClip[] = [];
    for (const clip of audioClips) {
      const { blob, ...metadata } = clip;
      if (
        !isAudioClipMetadata(metadata) ||
        clipIds.has(clip.id) ||
        !eventIds.has(clip.eventId) ||
        blob.size !== metadata.sizeBytes
      ) {
        throw new Error('Una registrazione audio non è valida o non è associata a un episodio del diario.');
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await this.assertAudioHash(bytes, metadata.sha256);
      encodedClips.push({ ...metadata, data: this.toBase64(bytes) });
      clipIds.add(clip.id);
    }

    const payload: DiaryBackupPayload = {
      format: 'noise-diary-case-data',
      version: 1,
      exportedAt: new Date().toISOString(),
      events,
      audioClips: encodedClips,
    };
    return source === 'account'
      ? this.vault.encryptPortableBackup(payload, password)
      : this.vault.encryptBackup(payload, password);
  }

  isEncryptedEnvelope(value: unknown): boolean {
    return this.vault.isEncryptedBackup(value);
  }

  async decrypt(value: unknown, password: string): Promise<DecryptedDiaryBackup> {
    const decoded = await this.vault.decryptBackup(value, password);
    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      !('format' in decoded) ||
      decoded.format !== 'noise-diary-case-data' ||
      !('version' in decoded) ||
      decoded.version !== 1 ||
      !('exportedAt' in decoded) ||
      typeof decoded.exportedAt !== 'string' ||
      !Number.isFinite(Date.parse(decoded.exportedAt)) ||
      !('events' in decoded) ||
      !Array.isArray(decoded.events) ||
      !decoded.events.every(isNoiseEvent) ||
      !('audioClips' in decoded) ||
      !Array.isArray(decoded.audioClips)
    ) {
      throw new Error('Il backup decifrato non rispetta il formato previsto; nessun dato è stato importato.');
    }

    const eventIds = new Set(decoded.events.map((event) => event.id));
    if (eventIds.size !== decoded.events.length) {
      throw new Error('Il backup contiene ID episodio duplicati; nessun dato è stato importato.');
    }

    const clipIds = new Set<string>();
    const audioClips: AudioClip[] = [];
    for (const encoded of decoded.audioClips) {
      if (encoded === null || typeof encoded !== 'object' || !('data' in encoded)) {
        throw new Error('Il backup contiene una registrazione audio non valida.');
      }
      const { data, ...metadata } = encoded;
      if (
        typeof data !== 'string' ||
        !isAudioClipMetadata(metadata) ||
        clipIds.has(metadata.id) ||
        !eventIds.has(metadata.eventId)
      ) {
        throw new Error('I metadati audio del backup non sono validi o non corrispondono agli episodi.');
      }

      const bytes = this.fromBase64(data);
      if (bytes.byteLength !== metadata.sizeBytes) {
        throw new Error('La dimensione di una registrazione del backup non corrisponde ai metadati.');
      }
      await this.assertAudioHash(bytes, metadata.sha256);
      audioClips.push({
        ...metadata,
        blob: new Blob([this.toArrayBuffer(bytes)], { type: metadata.mimeType }),
      });
      clipIds.add(metadata.id);
    }

    return { events: decoded.events, audioClips };
  }

  private async assertAudioHash(bytes: Uint8Array, expectedHash: string): Promise<void> {
    const digest = new Uint8Array(
      await globalThis.crypto.subtle.digest('SHA-256', this.toArrayBuffer(bytes)),
    );
    const actualHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (actualHash !== expectedHash.toLowerCase()) {
      throw new Error('Una registrazione audio non supera il controllo SHA-256.');
    }
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    if (
      value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
    ) {
      throw new Error('Una registrazione audio del backup contiene dati non validi.');
    }
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
  }
}
