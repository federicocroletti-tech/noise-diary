import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, signal } from '@angular/core';
import { AudioClip, AudioClipKind } from './audio/models/audio-clip.model';
import { AudioClipRepository } from './audio/audio-clip.repository';
import {
  AudioRecordingService,
  formatRecordingError,
  MAX_RECORDING_DURATION_SECONDS,
} from './audio/audio-recording.service';
import { AudioAnalysisService } from './services/audio-analysis.service';
import { NoiseStorageService } from './services/noise-storage.service';
import { NoiseEvent, NoiseEventDraft, NoiseEventType } from './domain/noise-event.model';

type SortMode = 'recent' | 'intensity' | 'room';

const EMPTY_DRAFT: NoiseEventDraft = {
  locationLabel: '',
  room: 'Soggiorno',
  eventType: 'HUM',
  continuityType: 'continuous',
  perceivedIntensity: 5,
  suspectedSource: 'ventilazione (ipotesi)',
  description: '',
  notes: '',
  tags: 'serale, casa',
  perceivedEffects: 'ronzio, vibrazione leggera',
  windowsState: 'chiusi',
  doorsState: 'chiusa',
  microphonePosition: 'davanti a finestra',
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
  protected readonly showForm = signal(true);
  protected readonly search = signal('');
  protected readonly sortMode = signal<SortMode>('recent');
  protected readonly draft = signal<NoiseEventDraft>({ ...EMPTY_DRAFT });
  protected readonly events = signal<NoiseEvent[]>([]);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly audioClips = signal<AudioClip[]>([]);
  protected readonly audioUrls = signal<Record<string, string>>({});
  protected readonly audioError = signal('');
  protected readonly audioStatus = signal('');
  protected readonly recordingKind = signal<AudioClipKind>('event');
  protected readonly recordingActive = signal(false);
  protected readonly recordingPaused = signal(false);
  protected readonly recordingPauseSupported = signal(false);
  protected readonly recordingDurationMs = signal(0);
  protected readonly maxRecordingSeconds = MAX_RECORDING_DURATION_SECONDS;

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

  protected readonly analysisBands = computed(() => {
    const event = this.selectedEvent();
    return this.audioAnalysisService.buildBands(event);
  });

  protected readonly eventTypeOptions: readonly NoiseEventType[] = [
    'HUM',
    'VIBRATION',
    'IMPACT',
    'DRAGGING',
    'MUSIC',
    'VOICES',
    'SYSTEM',
  ];

  constructor(
    private readonly storageService: NoiseStorageService,
    private readonly audioAnalysisService: AudioAnalysisService,
    private readonly audioRecordingService: AudioRecordingService,
    private readonly audioClipRepository: AudioClipRepository,
  ) {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.audioRecordingService.cancel();
    this.revokeAudioUrls();
  }

  protected toggleForm(): void {
    this.showForm.update((value) => !value);
  }

  protected onFieldChange<K extends keyof NoiseEventDraft>(field: K, value: NoiseEventDraft[K]): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected submitDraft(): void {
    const draft = this.draft();
    const timestamp = new Date().toISOString();
    const event: NoiseEvent = {
      id: `evt-${crypto.randomUUID()}`,
      startedAt: timestamp,
      endedAt: timestamp,
      duration: 120,
      createdAt: timestamp,
      updatedAt: timestamp,
      locationLabel: draft.locationLabel || 'Luogo non specificato',
      room: draft.room || 'Generico',
      microphonePosition: draft.microphonePosition,
      windowsState: draft.windowsState,
      doorsState: draft.doorsState,
      eventType: draft.eventType,
      continuityType: draft.continuityType,
      perceivedIntensity: draft.perceivedIntensity,
      perceivedEffects: draft.perceivedEffects
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      suspectedSource: draft.suspectedSource,
      description: draft.description || 'Evento registrato in modalità demo.',
      notes: draft.notes || 'Nessuna nota aggiuntiva.',
      status: 'draft',
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      attachmentIds: [],
      backgroundRecordingId: undefined,
    };

    const events = [event, ...this.events()];
    this.events.set(events);
    this.selectedEventId.set(event.id);
    this.storageService.saveEvents(events);
    this.draft.set({ ...EMPTY_DRAFT });
    this.showForm.set(false);
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
      this.addClipToEvent(clip);
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
        this.events.set(updatedEvents);
        this.storageService.saveEvents(updatedEvents);
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

  private initialize(): void {
    const storedEvents = this.storageService.loadEvents();
    const initialEvents = storedEvents.length > 0 ? storedEvents : this.audioAnalysisService.seedDemoEvents();
    this.events.set(initialEvents);
    this.selectedEventId.set(initialEvents[0]?.id ?? null);
    this.storageService.saveEvents(initialEvents);
    if (initialEvents[0]) {
      void this.loadAudioForEvent(initialEvents[0].id);
    }
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

  private addClipToEvent(clip: AudioClip): void {
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
    this.events.set(updatedEvents);
    this.storageService.saveEvents(updatedEvents);
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
