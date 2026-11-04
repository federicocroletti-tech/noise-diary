import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, signal } from '@angular/core';
import { AudioClip, AudioClipKind } from './audio/models/audio-clip.model';
import { AudioClipRepository } from './audio/audio-clip.repository';
import {
  AudioRecordingService,
  formatRecordingError,
  MAX_RECORDING_DURATION_SECONDS,
} from './audio/audio-recording.service';
import { LocalVaultService } from './services/local-vault.service';
import { NoiseStorageService } from './services/noise-storage.service';
import {
  CONTINUITY_TYPES,
  EVENT_STATUSES,
  NoiseEvent,
  NoiseEventCorrection,
  NoiseEventDraft,
  NoiseEventType,
  PerceivedEffect,
  PERCEIVED_EFFECTS,
} from './domain/noise-event.model';

type SortMode = 'recent' | 'intensity' | 'room';
type DiaryView = 'list' | 'form' | 'detail';
type ImportChoice = 'keep-current' | 'use-file';

interface ImportConflict {
  current: NoiseEvent;
  incoming: NoiseEvent;
  choice: ImportChoice;
}

interface PendingAppendImport {
  additions: NoiseEvent[];
  conflicts: ImportConflict[];
  duplicateCount: number;
}

function currentLocalDateTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return currentLocalDateTime();
  }
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, item]) => [key, normalizeJson(item)]),
    );
  }
  return value;
}

function sameEvent(first: NoiseEvent, second: NoiseEvent): boolean {
  return JSON.stringify(normalizeJson(first)) === JSON.stringify(normalizeJson(second));
}

const EMPTY_DRAFT: NoiseEventDraft = {
  locationLabel: '',
  room: '',
  eventType: 'HUM',
  continuityType: 'unknown',
  perceivedIntensity: 3,
  suspectedSource: '',
  description: '',
  notes: '',
  tags: '',
  perceivedEffects: 'simple-observation',
  windowsState: '',
  doorsState: '',
  microphonePosition: '',
  startedAt: currentLocalDateTime(),
  durationMinutes: null,
  status: 'draft',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly title = signal('Diario Rumore');
  protected readonly authMode = signal<'loading' | 'setup' | 'locked' | 'unavailable' | 'unlocked'>(
    'loading',
  );
  protected readonly passwordInput = signal('');
  protected readonly passwordConfirmation = signal('');
  protected readonly authError = signal('');
  protected readonly authBusy = signal(false);
  protected readonly showForm = signal(true);
  protected readonly activeView = signal<DiaryView>('list');
  protected readonly editingEventId = signal<string | null>(null);
  protected readonly correctionReason = signal('');
  protected readonly intensityUnreported = signal(false);
  protected readonly effectsUnreported = signal(false);
  protected readonly pendingAppendImport = signal<PendingAppendImport | null>(null);
  protected readonly loadingEvents = signal(true);
  protected readonly storageError = signal('');
  protected readonly search = signal('');
  protected readonly sortMode = signal<SortMode>('recent');
  protected readonly draft = signal<NoiseEventDraft>({ ...EMPTY_DRAFT });
  protected readonly events = signal<NoiseEvent[]>([]);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly audioClips = signal<AudioClip[]>([]);
  protected readonly audioUrls = signal<Record<string, string>>({});
  protected readonly audioError = signal('');
  protected readonly audioStatus = signal('');
  protected readonly importStatus = signal('');
  protected readonly recordingKind = signal<AudioClipKind>('event');
  protected readonly recordingActive = signal(false);
  protected readonly recordingPaused = signal(false);
  protected readonly recordingPauseSupported = signal(false);
  protected readonly recordingDurationMs = signal(0);
  protected readonly maxRecordingSeconds = MAX_RECORDING_DURATION_SECONDS;
  protected readonly averageIntensity = computed(() => {
    const values = this.events()
      .map((event) => event.perceivedIntensity)
      .filter((value): value is number => value !== null);
    if (values.length === 0) {
      return 'Non disponibile';
    }
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  });

  protected readonly filteredEvents = computed(() => {
    const query = this.search().trim().toLowerCase();
    const sorted = [...this.events()].filter((event) => {
      if (!query) {
        return true;
      }

      const haystack = [
        event.locationLabel,
        event.room,
        event.description,
        event.notes,
        event.suspectedSource,
        event.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    switch (this.sortMode()) {
      case 'intensity':
        return sorted.sort((a, b) => (b.perceivedIntensity ?? 0) - (a.perceivedIntensity ?? 0));
      case 'room':
        return sorted.sort((a, b) => a.room.localeCompare(b.room));
      case 'recent':
      default:
        return sorted.sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        );
    }
  });

  protected readonly selectedEvent = computed(() => {
    const selectedId = this.selectedEventId();
    return this.events().find((event) => event.id === selectedId) ?? null;
  });

  protected readonly eventTypeOptions: readonly NoiseEventType[] = [
    'HUM',
    'VIBRATION',
    'IMPACT',
    'DRAGGING',
    'MUSIC',
    'VOICES',
    'SYSTEM',
    'APPLIANCE',
    'TRAFFIC',
    'UNKNOWN',
    'OTHER',
  ];
  protected readonly continuityOptions = CONTINUITY_TYPES;
  protected readonly statusOptions = EVENT_STATUSES;
  protected readonly perceivedEffectOptions: readonly PerceivedEffect[] = PERCEIVED_EFFECTS;
  protected readonly choiceLabels: Record<string, string> = {
    HUM: 'Ronzio',
    VIBRATION: 'Vibrazione',
    IMPACT: 'Impatto',
    DRAGGING: 'Trascinamento',
    MUSIC: 'Musica',
    VOICES: 'Voci',
    SYSTEM: 'Impianto',
    APPLIANCE: 'Elettrodomestico',
    TRAFFIC: 'Traffico',
    UNKNOWN: 'Non identificato',
    OTHER: 'Altro',
    continuous: 'Continuo',
    intermittent: 'Intermittente',
    impulsive: 'Impulsivo',
    periodic: 'Periodico',
    variable: 'Variabile',
    unknown: 'Non specificato',
    draft: 'Bozza',
    complete: 'Completo',
    'to-review': 'Da verificare',
    corrected: 'Corretto',
    exported: 'Esportato',
    archived: 'Archiviato',
    awakening: 'Risveglio',
    'difficulty-falling-asleep': 'Difficoltà ad addormentarsi',
    'activity-interruption': 'Interruzione attività',
    'vibration-perceived': 'Vibrazione percepita',
    'concentration-difficulty': 'Difficoltà di concentrazione',
    'simple-observation': 'Sola osservazione',
    other: 'Altro',
  };

  constructor(
    private readonly storageService: NoiseStorageService,
    private readonly audioRecordingService: AudioRecordingService,
    private readonly audioClipRepository: AudioClipRepository,
    private readonly vault: LocalVaultService,
  ) {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.audioRecordingService.cancel();
    this.vault.lock();
    this.revokeAudioUrls();
  }

  protected async submitVaultAccess(): Promise<void> {
    this.authError.set('');
    const password = this.passwordInput();
    const mode = this.authMode();
    if (mode === 'setup') {
      if (password.length < 12) {
        this.authError.set('Scegli una password di almeno 12 caratteri.');
        return;
      }
      if (password !== this.passwordConfirmation()) {
        this.authError.set('Le password non coincidono.');
        return;
      }
    } else if (mode !== 'locked') {
      return;
    }

    this.authBusy.set(true);
    try {
      if (mode === 'setup') {
        await this.vault.create(password);
        this.authMode.set('locked');
      } else {
        await this.vault.unlock(password);
      }
      await this.loadPrivateDiary();
      this.authMode.set('unlocked');
      this.passwordInput.set('');
      this.passwordConfirmation.set('');
      this.authError.set('');
    } catch (error) {
      this.vault.lock();
      this.clearPrivateDiary();
      this.passwordInput.set('');
      this.passwordConfirmation.set('');
      this.authError.set(
        error instanceof Error ? error.message : 'Impossibile sbloccare il diario locale.',
      );
    } finally {
      this.authBusy.set(false);
    }
  }

  protected lockDiary(): void {
    if (this.recordingActive()) {
      this.audioError.set('Ferma la registrazione prima di bloccare il diario.');
      return;
    }
    this.vault.lock();
    this.clearPrivateDiary();
    this.authMode.set('locked');
    this.passwordInput.set('');
    this.passwordConfirmation.set('');
    this.authError.set('');
    this.storageError.set('');
    this.audioError.set('');
    this.audioStatus.set('');
    this.importStatus.set('');
  }

  protected async importDiary(event: Event, mode: 'replace' | 'append'): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      this.storageError.set('Seleziona un file JSON valido da importare.');
      return;
    }
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.storageError.set('Seleziona un file con estensione .json.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.storageError.set('Il file supera il limite di 5 MB.');
      return;
    }

    this.storageError.set('');
    this.importStatus.set('');
    try {
      const importedEvents = this.storageService.parseImport(
        JSON.parse(await file.text()) as unknown,
      );

      if (mode === 'replace') {
        if (
          !confirm(
            'Sostituire tutti gli episodi locali con quelli del file? Le registrazioni audio locali esistenti verranno eliminate.',
          )
        ) {
          return;
        }
        const existingClips: AudioClip[] = [];
        for (const existingEvent of this.events()) {
          existingClips.push(...(await this.audioClipRepository.listByEvent(existingEvent.id)));
        }
        await this.storageService.saveEvents(importedEvents);
        this.events.set(importedEvents);
        this.selectedEventId.set(importedEvents[0]?.id ?? null);
        this.activeView.set('list');
        this.revokeAudioUrls();
        this.audioClips.set([]);
        for (const clip of existingClips) {
          await this.audioClipRepository.delete(clip.id);
        }
        this.importStatus.set(`Sostituiti tutti gli episodi con ${importedEvents.length} elementi dal file.`);
        return;
      }

      const currentById = new Map(this.events().map((item) => [item.id, item]));
      const additions: NoiseEvent[] = [];
      const conflicts: ImportConflict[] = [];
      let duplicateCount = 0;
      for (const incoming of importedEvents) {
        const current = currentById.get(incoming.id);
        if (!current) {
          additions.push(incoming);
        } else if (sameEvent(current, incoming)) {
          duplicateCount += 1;
        } else {
          conflicts.push({ current, incoming, choice: 'keep-current' });
        }
      }

      if (conflicts.length > 0) {
        this.pendingAppendImport.set({ additions, conflicts, duplicateCount });
        this.importStatus.set('Rivedi gli episodi con lo stesso ID prima di completare l’importazione.');
        return;
      }
      await this.applyAppendImport(additions, [], duplicateCount);
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile importare il file selezionato.',
      );
    }
  }

  protected resolveImportConflict(eventId: string, choice: ImportChoice): void {
    this.pendingAppendImport.update((pending) =>
      pending
        ? {
            ...pending,
            conflicts: pending.conflicts.map((conflict) =>
              conflict.current.id === eventId ? { ...conflict, choice } : conflict,
            ),
          }
        : null,
    );
  }

  protected cancelAppendImport(): void {
    this.pendingAppendImport.set(null);
    this.importStatus.set('Importazione annullata; nessun episodio è stato modificato.');
  }

  protected async confirmAppendImport(): Promise<void> {
    const pending = this.pendingAppendImport();
    if (!pending) {
      return;
    }
    try {
      await this.applyAppendImport(pending.additions, pending.conflicts, pending.duplicateCount);
      this.pendingAppendImport.set(null);
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile completare l’importazione.',
      );
    }
  }

  private async applyAppendImport(
    additions: NoiseEvent[],
    conflicts: ImportConflict[],
    duplicateCount: number,
  ): Promise<void> {
    const mergedById = new Map(this.events().map((item) => [item.id, item]));
    for (const addition of additions) {
      mergedById.set(addition.id, addition);
    }
    for (const conflict of conflicts) {
      if (conflict.choice === 'use-file') {
        mergedById.set(conflict.incoming.id, conflict.incoming);
      }
    }
    const mergedEvents = [...mergedById.values()];
    await this.storageService.saveEvents(mergedEvents);
    this.events.set(mergedEvents);
    const importedCount = additions.length + conflicts.filter((item) => item.choice === 'use-file').length;
    const nextSelectedId = additions[0]?.id ?? conflicts.find((item) => item.choice === 'use-file')?.incoming.id;
    if (nextSelectedId) {
      this.selectedEventId.set(nextSelectedId);
      await this.loadAudioForEvent(nextSelectedId);
    }
    this.activeView.set('list');
    const duplicateSummary = duplicateCount + conflicts.filter((item) => item.choice === 'keep-current').length;
    const importedMessage =
      importedCount === 1
        ? 'Aggiunto o aggiornato 1 episodio'
        : `Aggiunti o aggiornati ${importedCount} episodi`;
    const retainedMessage =
      duplicateSummary === 1
        ? 'mantenuto 1 elemento locale non sostituito'
        : `mantenuti ${duplicateSummary} elementi locali non sostituiti`;
    this.importStatus.set(
      `${importedMessage}; ${retainedMessage}.`,
    );
  }

  protected toggleForm(): void {
    if (this.editingEventId()) {
      return;
    }
    this.showForm.update((value) => !value);
  }

  protected beginEdit(event: NoiseEvent): void {
    if (this.recordingActive()) {
      this.storageError.set('Ferma la registrazione prima di modificare un episodio.');
      return;
    }

    this.editingEventId.set(event.id);
    this.correctionReason.set('');
    this.intensityUnreported.set(event.perceivedIntensity === null);
    this.effectsUnreported.set(event.perceivedEffects.length === 0);
    this.selectedEventId.set(event.id);
    this.draft.set({
      locationLabel: event.locationLabel,
      room: event.room,
      eventType: event.eventType,
      continuityType: event.continuityType,
      perceivedIntensity: event.perceivedIntensity ?? 3,
      suspectedSource: event.suspectedSource.replace(/\s*\(ipotesi\)\s*$/i, ''),
      description: event.description,
      notes: event.notes,
      tags: event.tags.join(', '),
      perceivedEffects: event.perceivedEffects[0] ?? 'simple-observation',
      startedAt: toLocalDateTime(event.startedAt),
      durationMinutes: event.duration === undefined ? null : event.duration / 60,
      status: event.status,
      windowsState: event.windowsState ?? '',
      doorsState: event.doorsState ?? '',
      microphonePosition: event.microphonePosition ?? '',
    });
    this.showForm.set(true);
    this.storageError.set('');
  }

  protected cancelEdit(): void {
    if (!this.editingEventId()) {
      return;
    }
    this.editingEventId.set(null);
    this.correctionReason.set('');
    this.intensityUnreported.set(false);
    this.effectsUnreported.set(false);
    this.draft.set({ ...EMPTY_DRAFT, startedAt: currentLocalDateTime() });
    this.showForm.set(false);
    this.storageError.set('');
  }

  protected async deleteEvent(event: NoiseEvent): Promise<void> {
    if (this.recordingActive()) {
      this.storageError.set('Ferma la registrazione prima di eliminare un episodio.');
      return;
    }
    if (
      !confirm(
        'Eliminare definitivamente questo episodio e tutte le registrazioni audio associate da questo browser? Questa operazione non garantisce la cancellazione da backup, sincronizzazioni del profilo o altri dispositivi.',
      )
    ) {
      return;
    }

    this.storageError.set('');
    try {
      await this.storageService.deleteEvent(event.id);
      const updatedEvents = this.events().filter((item) => item.id !== event.id);
      this.events.set(updatedEvents);
      this.importStatus.set(
        'Episodio e registrazioni associate eliminati dall’archivio di questo browser.',
      );
      if (this.selectedEventId() === event.id) {
        this.revokeAudioUrls();
        this.audioClips.set([]);
        const nextEvent = [...updatedEvents].sort(
          (first, second) =>
            new Date(second.startedAt).getTime() - new Date(first.startedAt).getTime(),
        )[0];
        this.selectedEventId.set(nextEvent?.id ?? null);
        if (nextEvent) {
          await this.loadAudioForEvent(nextEvent.id);
        }
      }
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile eliminare l’episodio dal dispositivo.',
      );
    }
  }

  protected labelFor(value: string): string {
    return this.choiceLabels[value] ?? value;
  }

  protected onEventItemKeydown(event: KeyboardEvent, eventId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectEvent(eventId);
    }
  }

  protected onFieldChange<K extends keyof NoiseEventDraft>(field: K, value: NoiseEventDraft[K]): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected async submitDraft(): Promise<void> {
    const draft = this.draft();
    const editingId = this.editingEventId();
    const existingEvent = editingId
      ? this.events().find((event) => event.id === editingId)
      : undefined;
    if (editingId && !existingEvent) {
      this.storageError.set('L’episodio da modificare non è più disponibile.');
      return;
    }
    const reason = this.correctionReason().trim();
    if (editingId && !reason) {
      this.storageError.set('Indica il motivo della modifica prima di salvare la correzione.');
      return;
    }
    if (
      draft.durationMinutes !== null &&
      (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes <= 0)
    ) {
      this.storageError.set('La durata deve essere un numero di minuti maggiore di zero.');
      return;
    }
    const startedAtDate = new Date(draft.startedAt);
    if (!Number.isFinite(startedAtDate.getTime())) {
      this.storageError.set('Inserisci una data e un’ora di inizio valide.');
      return;
    }

    const startedAt = startedAtDate.toISOString();
    const timestamp = new Date().toISOString();
    const durationSeconds =
      draft.durationMinutes !== null && draft.durationMinutes > 0
        ? Math.round(draft.durationMinutes * 60)
        : undefined;
    const endedAt = durationSeconds
      ? new Date(startedAtDate.getTime() + durationSeconds * 1000).toISOString()
      : undefined;
    let event: NoiseEvent;
    let events: NoiseEvent[];
    if (existingEvent) {
      const { correctionHistory: _correctionHistory, ...previousSnapshot } = existingEvent;
      const correction: NoiseEventCorrection = {
        changedAt: timestamp,
        reason,
        previousSnapshot: JSON.stringify(previousSnapshot),
      };
      event = {
        ...existingEvent,
        startedAt,
        endedAt,
        duration: durationSeconds,
        updatedAt: timestamp,
        locationLabel: draft.locationLabel.trim(),
        room: draft.room.trim(),
        windowsState: draft.windowsState.trim() || undefined,
        doorsState: draft.doorsState.trim() || undefined,
        eventType: draft.eventType,
        continuityType: draft.continuityType,
        perceivedIntensity: this.intensityUnreported() ? null : draft.perceivedIntensity,
        perceivedEffects: this.effectsUnreported()
          ? existingEvent.perceivedEffects
          : [
              draft.perceivedEffects,
              ...existingEvent.perceivedEffects
                .slice(1)
                .filter((effect) => effect !== draft.perceivedEffects),
            ],
        suspectedSource: draft.suspectedSource.trim()
          ? `${draft.suspectedSource.trim()} (ipotesi)`
          : 'Non specificata (ipotesi)',
        description: draft.description.trim(),
        notes: draft.notes.trim(),
        status: draft.status,
        tags: draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        correctionHistory: [...(existingEvent.correctionHistory ?? []), correction],
      };
      events = this.events().map((item) => (item.id === event.id ? event : item));
    } else {
      event = {
        id: `evt-${crypto.randomUUID()}`,
        startedAt,
        endedAt,
        duration: durationSeconds,
        createdAt: timestamp,
        updatedAt: timestamp,
        locationLabel: draft.locationLabel.trim(),
        room: draft.room.trim(),
        microphonePosition: draft.microphonePosition.trim() || undefined,
        windowsState: draft.windowsState.trim() || undefined,
        doorsState: draft.doorsState.trim() || undefined,
        eventType: draft.eventType,
        continuityType: draft.continuityType,
        perceivedIntensity: draft.perceivedIntensity,
        perceivedEffects: [draft.perceivedEffects],
        suspectedSource: draft.suspectedSource.trim()
          ? `${draft.suspectedSource.trim()} (ipotesi)`
          : 'Non specificata (ipotesi)',
        description: draft.description.trim(),
        notes: draft.notes.trim(),
        status: draft.status,
        tags: draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        attachmentIds: [],
      };
      events = [event, ...this.events()];
    }

    try {
      await this.storageService.saveEvents(events);
      this.events.set(events);
      this.selectedEventId.set(event.id);
      this.draft.set({ ...EMPTY_DRAFT, startedAt: currentLocalDateTime() });
      this.editingEventId.set(null);
      this.correctionReason.set('');
      this.intensityUnreported.set(false);
      this.effectsUnreported.set(false);
      this.showForm.set(false);
      this.storageError.set('');
      this.importStatus.set(
        existingEvent ? 'Correzione salvata con il motivo e la versione precedente.' : '',
      );
      await this.loadAudioForEvent(event.id);
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile salvare l’episodio nel dispositivo.',
      );
    }
  }

  protected selectEvent(id: string): void {
    if (this.recordingActive()) {
      this.audioError.set('Ferma la registrazione prima di cambiare episodio.');
      return;
    }
    this.selectedEventId.set(id);
    this.audioError.set('');
    void this.loadAudioForEvent(id);
  }

  protected setRecordingKind(kind: AudioClipKind): void {
    this.recordingKind.set(kind);
  }

  protected async startAudioRecording(): Promise<void> {
    const event = this.selectedEvent();
    if (!event) {
      this.audioError.set('Salva o seleziona un episodio prima di avviare una registrazione.');
      return;
    }

    this.audioError.set('');
    this.audioStatus.set('');
    this.recordingDurationMs.set(0);
    try {
      await this.audioRecordingService.start(
        event.id,
        this.recordingKind(),
        (duration) => {
          this.recordingDurationMs.set(duration);
          if (duration >= this.maxRecordingSeconds * 1000 && this.recordingActive()) {
            void this.stopAudioRecording();
          }
        },
        (error) => {
          this.audioError.set(formatRecordingError(error));
          this.recordingActive.set(false);
          this.recordingPaused.set(false);
        },
      );
      this.recordingActive.set(true);
      this.recordingPauseSupported.set(this.audioRecordingService.supportsPause);
      this.audioStatus.set('Registrazione attiva: il microfono sta acquisendo audio localmente.');
    } catch (error) {
      this.audioError.set(formatRecordingError(error));
      this.recordingActive.set(false);
      this.recordingPauseSupported.set(false);
    }
  }

  protected pauseAudioRecording(): void {
    this.audioRecordingService.pause();
    this.recordingPaused.set(this.audioRecordingService.isPaused);
    this.audioStatus.set(this.recordingPaused() ? 'Registrazione in pausa.' : 'Pausa non supportata.');
  }

  protected resumeAudioRecording(): void {
    this.audioRecordingService.resume();
    this.recordingPaused.set(false);
    this.audioStatus.set('Registrazione ripresa.');
  }

  protected async stopAudioRecording(): Promise<void> {
    try {
      const clip = await this.audioRecordingService.stop();
      await this.addClipToEvent(clip);
      await this.loadAudioForEvent(clip.eventId);
      this.audioStatus.set('Registrazione salvata solo su questo dispositivo.');
    } catch (error) {
      this.audioError.set(formatRecordingError(error));
    } finally {
      this.recordingActive.set(false);
      this.recordingPaused.set(false);
      this.recordingPauseSupported.set(false);
    }
  }

  protected async deleteAudioClip(clip: AudioClip): Promise<void> {
    if (!confirm(`Eliminare definitivamente la registrazione "${clip.fileName}" da questo dispositivo?`)) {
      return;
    }

    try {
      await this.audioClipRepository.delete(clip.id);
      const event = this.events().find((item) => item.id === clip.eventId);
      if (event) {
        const updatedEvent = {
          ...event,
          attachmentIds: event.attachmentIds.filter((id) => id !== clip.id),
          backgroundRecordingId:
            event.backgroundRecordingId === clip.id ? undefined : event.backgroundRecordingId,
          updatedAt: new Date().toISOString(),
        };
        const updatedEvents = this.events().map((item) =>
          item.id === updatedEvent.id ? updatedEvent : item,
        );
        await this.storageService.saveEvents(updatedEvents);
        this.events.set(updatedEvents);
      }
      this.revokeAudioUrl(clip.id);
      this.audioClips.update((clips) => clips.filter((item) => item.id !== clip.id));
      this.audioStatus.set('Registrazione eliminata dal dispositivo.');
    } catch (error) {
      this.audioError.set(formatRecordingError(error));
    }
  }

  protected downloadAudioClip(clip: AudioClip): void {
    const url = this.getAudioUrl(clip.id);
    if (!url) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = clip.fileName;
    anchor.click();
  }

  protected getAudioUrl(clipId: string): string {
    return this.audioUrls()[clipId] ?? '';
  }

  protected formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    return `${Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  }

  protected downloadExport(): void {
    if (this.authMode() !== 'unlocked') {
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'Diario Rumore',
      events: this.events(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'diario-rumore-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private async initialize(): Promise<void> {
    try {
      this.authMode.set(this.vault.isConfigured() ? 'locked' : 'setup');
    } catch (error) {
      this.authMode.set('unavailable');
      this.authError.set(
        error instanceof Error ? error.message : 'Impossibile leggere la configurazione del diario.',
      );
    }
  }

  private async loadPrivateDiary(): Promise<void> {
    this.loadingEvents.set(true);
    try {
      const initialEvents = await this.storageService.loadEvents();
      await this.audioClipRepository.encryptLegacyRecords();
      this.events.set(initialEvents);
      this.selectedEventId.set(initialEvents[0]?.id ?? null);
      this.storageError.set('');
      if (initialEvents[0]) {
        await this.loadAudioForEvent(initialEvents[0].id);
      }
    } finally {
      this.loadingEvents.set(false);
    }
  }

  private clearPrivateDiary(): void {
    this.revokeAudioUrls();
    this.events.set([]);
    this.audioClips.set([]);
    this.selectedEventId.set(null);
    this.editingEventId.set(null);
    this.correctionReason.set('');
    this.intensityUnreported.set(false);
    this.effectsUnreported.set(false);
    this.draft.set({ ...EMPTY_DRAFT, startedAt: currentLocalDateTime() });
    this.showForm.set(true);
    this.pendingAppendImport.set(null);
    this.importStatus.set('');
    this.storageError.set('');
    this.loadingEvents.set(false);
  }

  private async loadAudioForEvent(eventId: string): Promise<void> {
    this.revokeAudioUrls();
    this.audioClips.set([]);
    try {
      const clips = await this.audioClipRepository.listByEvent(eventId);
      if (this.selectedEventId() !== eventId) {
        return;
      }
      const urls: Record<string, string> = {};
      for (const clip of clips) {
        urls[clip.id] = URL.createObjectURL(clip.blob);
      }
      this.audioUrls.set(urls);
      this.audioClips.set(clips);
    } catch (error) {
      this.audioError.set(formatRecordingError(error));
    }
  }

  private async addClipToEvent(clip: AudioClip): Promise<void> {
    const event = this.events().find((item) => item.id === clip.eventId);
    if (!event) {
      return;
    }

    const updatedEvent = {
      ...event,
      attachmentIds: [...new Set([...event.attachmentIds, clip.id])],
      backgroundRecordingId: clip.kind === 'background' ? clip.id : event.backgroundRecordingId,
      updatedAt: new Date().toISOString(),
    };
    const updatedEvents = this.events().map((item) => (item.id === event.id ? updatedEvent : item));
    await this.storageService.saveEvents(updatedEvents);
    this.events.set(updatedEvents);
  }

  private revokeAudioUrl(clipId: string): void {
    const url = this.audioUrls()[clipId];
    if (url) {
      URL.revokeObjectURL(url);
      this.audioUrls.update((current) => {
        const { [clipId]: _removed, ...remaining } = current;
        return remaining;
      });
    }
  }

  private revokeAudioUrls(): void {
    for (const url of Object.values(this.audioUrls())) {
      URL.revokeObjectURL(url);
    }
    this.audioUrls.set({});
  }
}
