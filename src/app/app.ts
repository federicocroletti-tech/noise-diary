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
  NoiseEventDraft,
  NoiseEventType,
  PerceivedEffect,
  PERCEIVED_EFFECTS,
} from './domain/noise-event.model';

type SortMode = 'recent' | 'intensity' | 'room';

function currentLocalDateTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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
    return this.events().find((event) => event.id === selectedId) ?? this.filteredEvents()[0] ?? null;
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

  protected async importDiary(event: Event): Promise<void> {
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
      const existingIds = new Set(this.events().map((item) => item.id));
      const newEvents = importedEvents.filter((item) => !existingIds.has(item.id));
      if (newEvents.length === 0) {
        this.importStatus.set('Tutti gli episodi del file sono già presenti nel diario.');
        return;
      }

      const mergedEvents = [...this.events(), ...newEvents];
      await this.storageService.saveEvents(mergedEvents);
      this.events.set(mergedEvents);
      this.selectedEventId.set(newEvents[0].id);
      await this.loadAudioForEvent(newEvents[0].id);
      const importedMessage =
        newEvents.length === 1 ? 'Importato 1 episodio' : `Importati ${newEvents.length} episodi`;
      const duplicateCount = importedEvents.length - newEvents.length;
      const duplicateMessage =
        duplicateCount === 1 ? '1 duplicato ignorato' : `${duplicateCount} duplicati ignorati`;
      this.importStatus.set(
        `${importedMessage}; ${duplicateMessage}. Il file sorgente resta in chiaro sul dispositivo; eliminalo se non ti serve più.`,
      );
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile importare il file selezionato.',
      );
    }
  }

  protected toggleForm(): void {
    this.showForm.update((value) => !value);
  }

  protected labelFor(value: string): string {
    return this.choiceLabels[value] ?? value;
  }

  protected onFieldChange<K extends keyof NoiseEventDraft>(field: K, value: NoiseEventDraft[K]): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected async submitDraft(): Promise<void> {
    const draft = this.draft();
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
    const event: NoiseEvent = {
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

    const events = [event, ...this.events()];
    try {
      await this.storageService.saveEvents(events);
      this.events.set(events);
      this.selectedEventId.set(event.id);
      this.draft.set({ ...EMPTY_DRAFT, startedAt: currentLocalDateTime() });
      this.showForm.set(false);
      this.storageError.set('');
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
