import { Injectable } from '@angular/core';
import { AudioClip } from '../audio/models/audio-clip.model';
import { isNoiseEvent, NoiseEvent } from '../domain/noise-event.model';
import { NeonAudioRepository } from './neon-audio.repository';

@Injectable({ providedIn: 'root' })
export class NeonDiaryService {
  constructor(private readonly audio: NeonAudioRepository) {}

  async loadEvents(): Promise<NoiseEvent[]> {
    const client = await this.databaseClient();
    const { data, error } = await client
      .from('diary_events')
      .select('id,payload');
    if (error) {
      throw new Error(`Impossibile caricare il diario dell’account: ${error.message}`);
    }
    const events = (data ?? []).map(({ id, payload }) => {
      if (!isNoiseEvent(payload) || payload.id !== id) {
        throw new Error('Un episodio remoto non rispetta il formato previsto.');
      }
      return payload;
    });
    if (new Set(events.map((event) => event.id)).size !== events.length) {
      throw new Error('Il diario remoto contiene ID episodio duplicati.');
    }
    return events;
  }

  async saveEvents(events: NoiseEvent[]): Promise<void> {
    const ids = events.map((event) => event.id);
    if (
      !events.every(isNoiseEvent) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error('Il diario contiene episodi non validi o ID duplicati; nessun dato è stato salvato.');
    }
    if (events.length === 0) {
      return;
    }
    const client = await this.databaseClient();
    const { error } = await client
      .from('diary_events')
      .upsert(
        events.map((event) => ({ id: event.id, payload: event })),
        { onConflict: 'user_id,id' },
      );
    if (error) {
      throw new Error(`Impossibile salvare il diario nell’account: ${error.message}`);
    }
  }

  async saveEventsAndClips(
    events: NoiseEvent[],
    clips: AudioClip[],
    replaceAudio = false,
  ): Promise<void> {
    const previousEvents = replaceAudio ? await this.loadEvents() : [];
    const previousClips = replaceAudio ? await this.audio.listAll() : [];
    await this.saveEvents(events);
    await this.audio.saveAll(clips);
    if (replaceAudio) {
      const retainedClipIds = new Set(clips.map((clip) => clip.id));
      for (const clip of previousClips) {
        if (!retainedClipIds.has(clip.id)) {
          await this.audio.delete(clip.id);
        }
      }
      const retainedEventIds = new Set(events.map((event) => event.id));
      const removedEventIds = previousEvents
        .map((event) => event.id)
        .filter((id) => !retainedEventIds.has(id));
      if (removedEventIds.length > 0) {
        const client = await this.databaseClient();
        const { error } = await client
          .from('diary_events')
          .delete()
          .in('id', removedEventIds);
        if (error) {
          throw new Error(`Backup applicato parzialmente: impossibile rimuovere gli episodi precedenti: ${error.message}`);
        }
      }
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.audio.deleteByEvent(eventId);
    const client = await this.databaseClient();
    const { error } = await client.from('diary_events').delete().eq('id', eventId);
    if (error) {
      throw new Error(`Registrazioni eliminate ma episodio non eliminato: ${error.message}`);
    }
  }

  async deleteAll(): Promise<void> {
    const events = await this.loadEvents();
    const clips = await this.audio.listAll();
    for (const clip of clips) {
      await this.audio.delete(clip.id);
    }
    if (events.length > 0) {
      const client = await this.databaseClient();
      const { error } = await client
        .from('diary_events')
        .delete()
        .in(
          'id',
          events.map((event) => event.id),
        );
      if (error) {
        throw new Error(`Registrazioni eliminate ma diario non eliminato: ${error.message}`);
      }
    }
  }

  private async databaseClient() {
    const { neonClient } = await import('./neon-client');
    return neonClient;
  }
}
