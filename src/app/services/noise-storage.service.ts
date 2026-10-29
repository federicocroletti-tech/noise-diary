import { Injectable } from '@angular/core';
import {
  CONTINUITY_TYPES,
  EVENT_STATUSES,
  NOISE_EVENT_TYPES,
  NoiseEvent,
  PerceivedEffect,
  PERCEIVED_EFFECTS,
} from '../domain/noise-event.model';
import { NoiseEventRepository } from './noise-event.repository';

const LEGACY_STORAGE_KEY = 'noise-diary.events';
const DEMO_EVENT_IDS = new Set(['evt-101', 'evt-102']);
const DEMO_ATTACHMENT_IDS = new Set(['bg-001', 'rec-001']);
const LEGACY_EFFECTS: Record<string, PerceivedEffect> = {
  'ronzio costante': 'simple-observation',
  'sensazione di vibrazione': 'vibration-perceived',
  'colpo secco': 'other',
  'rumore nello spigolo': 'other',
};

@Injectable({ providedIn: 'root' })
export class NoiseStorageService {
  constructor(private readonly repository: NoiseEventRepository) {}

  async loadEvents(): Promise<NoiseEvent[]> {
    const storedEvents = await this.repository.getAll();
    if (storedEvents.length > 0) {
      storedEvents.forEach((event) => this.validateEvent(event));
      return storedEvents;
    }

    const legacyEvents = this.readLegacyEvents();
    if (legacyEvents.length === 0) {
      return [];
    }

    const migratedEvents = legacyEvents
      .filter((event) => !this.isDemoEvent(event))
      .map((event, index) => this.normalizeEvent(event, index));
    await this.repository.saveAll(migratedEvents);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migratedEvents;
  }

  async saveEvents(events: NoiseEvent[]): Promise<void> {
    for (const event of events) {
      this.validateEvent(event);
    }
    await this.repository.saveAll(events);
  }

  private readLegacyEvents(): unknown[] {
    const value = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!value) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(
        `I vecchi dati del diario non sono leggibili; sono rimasti intatti nel browser. Dettaglio: ${String(error)}`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error('I vecchi dati del diario non hanno il formato previsto; non sono stati modificati.');
    }
    return parsed;
  }

  private isDemoEvent(value: unknown): boolean {
    if (!value || typeof value !== 'object' || !('id' in value)) {
      return false;
    }
    if (typeof value.id !== 'string' || !DEMO_EVENT_IDS.has(value.id)) {
      return false;
    }
    return (
      !('attachmentIds' in value) ||
      !Array.isArray(value.attachmentIds) ||
      value.attachmentIds.every(
        (id) => typeof id === 'string' && DEMO_ATTACHMENT_IDS.has(id),
      )
    );
  }

  private normalizeEvent(value: unknown, index = 0): NoiseEvent {
    if (!value || typeof value !== 'object') {
      throw new Error(`L’episodio legacy alla posizione ${index + 1} non è valido.`);
    }

    const source = value as Partial<NoiseEvent> & Record<string, unknown>;
    const startedAt = typeof source.startedAt === 'string' ? source.startedAt : '';
    const intensity = Number(source.perceivedIntensity);
    const eventType = this.normalizeChoice(source.eventType, NOISE_EVENT_TYPES, 'UNKNOWN');
    const continuityType = this.normalizeContinuity(source.continuityType);
    const status = this.normalizeStatus(source.status);
    const effects = Array.isArray(source.perceivedEffects)
      ? source.perceivedEffects.map((effect) => this.normalizeEffect(effect))
      : [];
    const normalized: NoiseEvent = {
      id: typeof source.id === 'string' && source.id ? source.id : `legacy-${index}-${crypto.randomUUID()}`,
      startedAt,
      endedAt: typeof source.endedAt === 'string' ? source.endedAt : undefined,
      duration: this.optionalNumber(source.duration),
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : startedAt,
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : startedAt,
      locationLabel: typeof source.locationLabel === 'string' ? source.locationLabel : '',
      room: typeof source.room === 'string' ? source.room : '',
      microphonePosition: this.optionalString(source.microphonePosition),
      windowsState: this.optionalString(source.windowsState),
      doorsState: this.optionalString(source.doorsState),
      eventType,
      continuityType,
      perceivedIntensity: Number.isFinite(intensity)
        ? Math.min(5, Math.max(1, Math.round(intensity / 2)))
        : 1,
      perceivedEffects: [...new Set(effects)],
      suspectedSource: this.withHypothesis(
        typeof source.suspectedSource === 'string' ? source.suspectedSource : '',
      ),
      description: typeof source.description === 'string' ? source.description : '',
      notes: typeof source.notes === 'string' ? source.notes : '',
      witnessesCount: this.optionalNumber(source.witnessesCount),
      status,
      tags: Array.isArray(source.tags) ? source.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      attachmentIds: Array.isArray(source.attachmentIds)
        ? source.attachmentIds.filter((id): id is string => typeof id === 'string')
        : [],
      backgroundRecordingId: this.optionalString(source.backgroundRecordingId),
      deletedAt: this.optionalString(source.deletedAt),
    };
    this.validateEvent(normalized);
    return normalized;
  }

  private normalizeChoice<T extends string>(
    value: unknown,
    choices: readonly T[],
    fallback: T,
  ): T {
    return typeof value === 'string' && choices.includes(value as T) ? (value as T) : fallback;
  }

  private normalizeContinuity(value: unknown): NoiseEvent['continuityType'] {
    if (value === 'single') {
      return 'impulsive';
    }
    return this.normalizeChoice(value, CONTINUITY_TYPES, 'unknown');
  }

  private normalizeStatus(value: unknown): NoiseEvent['status'] {
    if (value === 'recorded') {
      return 'complete';
    }
    if (value === 'reviewed') {
      return 'to-review';
    }
    return this.normalizeChoice(value, EVENT_STATUSES, 'draft');
  }

  private normalizeEffect(value: unknown): PerceivedEffect {
    if (typeof value !== 'string') {
      return 'other';
    }
    if (PERCEIVED_EFFECTS.includes(value as PerceivedEffect)) {
      return value as PerceivedEffect;
    }
    return LEGACY_EFFECTS[value.toLowerCase()] ?? 'other';
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private withHypothesis(value: string): string {
    const source = value.trim();
    if (!source) {
      return 'Non specificata (ipotesi)';
    }
    return /ipotesi/i.test(source) ? source : `${source} (ipotesi)`;
  }

  private validateEvent(event: NoiseEvent): void {
    if (!event.id || !Number.isFinite(Date.parse(event.startedAt))) {
      throw new Error('Ogni episodio deve avere un ID e una data di inizio valida.');
    }
    if (!Number.isInteger(event.perceivedIntensity) || event.perceivedIntensity < 1 || event.perceivedIntensity > 5) {
      throw new Error('L’intensità percepita deve essere un numero intero da 1 a 5.');
    }
    if (!NOISE_EVENT_TYPES.includes(event.eventType)) {
      throw new Error('La tipologia dell’episodio non è valida.');
    }
    if (!CONTINUITY_TYPES.includes(event.continuityType) || !EVENT_STATUSES.includes(event.status)) {
      throw new Error('Andamento o stato dell’episodio non valido.');
    }
    if (!/ipotesi/i.test(event.suspectedSource)) {
      throw new Error('La sorgente sospetta deve essere presentata come ipotesi.');
    }
    if (event.duration !== undefined && (!Number.isFinite(event.duration) || event.duration <= 0)) {
      throw new Error('La durata dell’episodio deve essere maggiore di zero.');
    }
  }
}
