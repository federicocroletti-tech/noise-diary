import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
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
export class App {
  protected readonly title = signal('Diario Rumore');
  protected readonly showForm = signal(true);
  protected readonly search = signal('');
  protected readonly sortMode = signal<SortMode>('recent');
  protected readonly draft = signal<NoiseEventDraft>({ ...EMPTY_DRAFT });
  protected readonly events = signal<NoiseEvent[]>([]);
  protected readonly selectedEventId = signal<string | null>(null);

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
  ) {
    this.initialize();
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
    this.selectedEventId.set(id);
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
  }
}
