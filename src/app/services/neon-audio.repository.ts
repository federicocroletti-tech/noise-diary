import { Injectable } from '@angular/core';
import {
  AudioClip,
  AudioClipMetadata,
  isAudioClipMetadata,
} from '../audio/models/audio-clip.model';
import { NeonAuthService } from './neon-auth.service';
import { NEON_AUDIO_FUNCTION_URL } from './neon-config';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

interface AudioRow {
  id: string;
  event_id: string;
  payload: unknown;
}

interface StorageResponse {
  url?: string;
  success?: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class NeonAudioRepository {
  constructor(private readonly auth: NeonAuthService) {}

  async save(clip: AudioClip): Promise<void> {
    this.validateClip(clip);
    const url = await this.storageUrl('upload', clip.id, {
      mimeType: clip.mimeType,
      sizeBytes: clip.sizeBytes,
    });
    const uploaded = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': clip.mimeType },
      body: clip.blob,
    });
    if (!uploaded.ok) {
      throw new Error(`Caricamento audio non riuscito (HTTP ${uploaded.status}).`);
    }

    const { blob: _blob, ...metadata } = clip;
    const client = await this.databaseClient();
    const { error } = await client.from('diary_audio_clips').upsert(
      { id: clip.id, event_id: clip.eventId, payload: metadata },
      { onConflict: 'user_id,id' },
    );
    if (error) {
      try {
        await this.storageUrl('delete', clip.id);
      } catch (cleanupError) {
        console.error('Unable to remove an audio object after metadata save failed.', cleanupError);
      }
      throw new Error(`Audio caricato ma metadati non salvati: ${error.message}`);
    }
  }

  async listByEvent(eventId: string): Promise<AudioClip[]> {
    const client = await this.databaseClient();
    const { data, error } = await client
      .from('diary_audio_clips')
      .select('id,event_id,payload')
      .eq('event_id', eventId);
    if (error) {
      throw new Error(`Impossibile leggere le registrazioni: ${error.message}`);
    }
    return this.downloadRows(data ?? []);
  }

  async getByIds(ids: string[]): Promise<AudioClip[]> {
    if (ids.length === 0) {
      return [];
    }
    const client = await this.databaseClient();
    const { data, error } = await client
      .from('diary_audio_clips')
      .select('id,event_id,payload')
      .in('id', ids);
    if (error) {
      throw new Error(`Impossibile leggere le registrazioni richieste: ${error.message}`);
    }
    return this.downloadRows(data ?? []);
  }

  async listAll(): Promise<AudioClip[]> {
    const client = await this.databaseClient();
    const { data, error } = await client
      .from('diary_audio_clips')
      .select('id,event_id,payload');
    if (error) {
      throw new Error(`Impossibile leggere le registrazioni: ${error.message}`);
    }
    return this.downloadRows(data ?? []);
  }

  async delete(id: string): Promise<void> {
    await this.storageUrl('delete', id);
    const client = await this.databaseClient();
    const { error } = await client.from('diary_audio_clips').delete().eq('id', id);
    if (error) {
      throw new Error(`Registrazione rimossa dallo storage ma metadati non eliminati: ${error.message}`);
    }
  }

  async deleteByEvent(eventId: string): Promise<void> {
    const client = await this.databaseClient();
    const { data, error } = await client
      .from('diary_audio_clips')
      .select('id')
      .eq('event_id', eventId);
    if (error) {
      throw new Error(`Impossibile individuare le registrazioni dell’episodio: ${error.message}`);
    }
    for (const clip of data ?? []) {
      await this.delete(clip.id);
    }
  }

  async saveAll(clips: AudioClip[], replaceAudio = false): Promise<void> {
    const existing = replaceAudio ? await this.listAll() : [];
    for (const clip of clips) {
      await this.save(clip);
    }
    if (replaceAudio) {
      const retained = new Set(clips.map((clip) => clip.id));
      for (const clip of existing) {
        if (!retained.has(clip.id)) {
          await this.delete(clip.id);
        }
      }
    }
  }

  private async downloadRows(rows: AudioRow[]): Promise<AudioClip[]> {
    const clips: AudioClip[] = [];
    for (const row of rows) {
      if (!isAudioClipMetadata(row.payload) || row.payload.id !== row.id || row.payload.eventId !== row.event_id) {
        throw new Error('I metadati audio remoti non sono validi; nessun dato è stato modificato.');
      }
      const url = await this.storageUrl('download', row.id);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download audio non riuscito (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      if (blob.size !== row.payload.sizeBytes) {
        throw new Error('La dimensione di una registrazione remota non corrisponde ai metadati.');
      }
      await this.verifyHash(blob, row.payload.sha256);
      clips.push({ ...row.payload, blob });
    }
    return clips;
  }

  private async storageUrl(
    action: 'upload' | 'download' | 'delete',
    clipId: string,
    metadata?: { mimeType: string; sizeBytes: number },
  ): Promise<string> {
    if (!NEON_AUDIO_FUNCTION_URL) {
      throw new Error('Il servizio sicuro per le registrazioni non è ancora configurato.');
    }
    const token = await this.auth.getAccessToken();
    const response = await fetch(NEON_AUDIO_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, clipId, ...metadata }),
    });
    let result: StorageResponse;
    try {
      result = (await response.json()) as StorageResponse;
    } catch (error) {
      throw new Error(`Risposta non valida dal servizio audio: ${String(error)}`);
    }
    if (!response.ok) {
      throw new Error(result.error ?? `Servizio audio non disponibile (HTTP ${response.status}).`);
    }
    if (action === 'delete') {
      return '';
    }
    if (typeof result.url !== 'string' || !result.url.startsWith('https://')) {
      throw new Error('Il servizio audio ha restituito un URL non valido.');
    }
    return result.url;
  }

  private validateClip(clip: AudioClip): void {
    const { blob: _blob, ...metadata } = clip;
    if (
      !isAudioClipMetadata(metadata) ||
      clip.blob.size !== clip.sizeBytes ||
      clip.sizeBytes < 1 ||
      clip.sizeBytes > MAX_AUDIO_BYTES
    ) {
      throw new Error('Registrazione non valida o superiore al limite di 50 MiB.');
    }
  }

  private async verifyHash(blob: Blob, expectedHash: string): Promise<void> {
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()),
    );
    const actualHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (actualHash !== expectedHash.toLowerCase()) {
      throw new Error('Una registrazione remota non supera il controllo SHA-256.');
    }
  }

  private async databaseClient() {
    const { neonClient } = await import('./neon-client');
    return neonClient;
  }
}
