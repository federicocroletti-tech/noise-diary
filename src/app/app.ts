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
import { LocalBackupService } from './services/local-backup.service';

type SortMode = 'recent' | 'intensity' | 'room';
type DiaryView = 'list' | 'form' | 'detail';
type ImportChoice = 'keep-current' | 'use-file';
const MAX_BACKUP_FILE_SIZE = 120 * 1024 * 1024;

interface ImportConflict {
  current: NoiseEvent;
  incoming: NoiseEvent;
  choice: ImportChoice;
}

interface PendingAppendImport {
  additions: NoiseEvent[];
  conflicts: ImportConflict[];
  duplicateCount: number;
  audioClips: AudioClip[];
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
  protected readonly recoveryKeyInput = signal('');
  protected readonly recoveryPassword = signal('');
  protected readonly recoveryPasswordConfirmation = signal('');
  protected readonly recoveryMode = signal(false);
  protected readonly recoveryCode = signal('');
  protected readonly recoveryCodeSaved = signal(false);
  protected readonly recoveryNotice = signal('');
  protected readonly authError = signal('');
  protected readonly authStatus = signal('');
  protected readonly authBusy = signal(false);
  protected readonly deletingDiary = signal(false);
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
    private readonly backupService: LocalBackupService,
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
      let generatedRecoveryKey: string | null;
      if (mode === 'setup') {
        generatedRecoveryKey = await this.vault.create(password);
        this.authMode.set('locked');
      } else {
        generatedRecoveryKey = await this.vault.unlock(password);
      }
      await this.loadPrivateDiary();
      this.authMode.set('unlocked');
      if (generatedRecoveryKey) {
        this.presentRecoveryKey(generatedRecoveryKey);
      }
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

  protected async recoverDiary(): Promise<void> {
    this.authError.set('');
    const newPassword = this.recoveryPassword();
    if (newPassword.length < 12) {
      this.authError.set('La nuova password deve contenere almeno 12 caratteri.');
      return;
    }
    if (newPassword !== this.recoveryPasswordConfirmation()) {
      this.authError.set('Le nuove password non coincidono.');
      return;
    }

    this.authBusy.set(true);
    try {
      const newRecoveryKey = await this.vault.recover(this.recoveryKeyInput(), newPassword);
      await this.loadPrivateDiary();
      this.authMode.set('unlocked');
      this.recoveryMode.set(false);
      this.recoveryKeyInput.set('');
      this.recoveryPassword.set('');
      this.recoveryPasswordConfirmation.set('');
      this.presentRecoveryKey(newRecoveryKey);
      this.authError.set('');
    } catch (error) {
      this.vault.lock();
      this.clearPrivateDiary();
      this.authError.set(
        error instanceof Error ? error.message : 'Impossibile recuperare il diario locale.',
      );
    } finally {
      this.authBusy.set(false);
    }
  }

  protected toggleRecoveryMode(): void {
    this.recoveryMode.update((value) => !value);
    this.authError.set('');
  }

  protected finishRecoverySetup(): void {
    if (!this.recoveryCodeSaved()) {
      return;
    }
    try {
      this.vault.commitRecoveryChange();
      this.recoveryCode.set('');
      this.recoveryCodeSaved.set(false);
      this.recoveryNotice.set('Chiave di recupero salvata e attivata.');
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile attivare il recupero del diario.',
      );
    }
  }

  protected async rotateRecoveryKey(): Promise<void> {
    if (
      !window.confirm(
        'Rigenerare la chiave di recupero? Quella precedente smetterà di funzionare quando confermerai la nuova chiave.',
      )
    ) {
      return;
    }
    try {
      const recoveryKey = await this.vault.rotateRecoveryKey();
      this.presentRecoveryKey(recoveryKey);
      this.recoveryNotice.set('');
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile rigenerare la chiave di recupero.',
      );
    }
  }

  protected downloadRecoveryKey(): void {
    const recoveryKey = this.recoveryCode();
    if (!recoveryKey) {
      return;
    }
    const blob = new Blob(
      [
        `Diario Rumore - chiave di recupero\n\n${recoveryKey}\n\nConserva questo file separatamente dal dispositivo e dalla password principale. Chiunque abbia questa chiave può impostare una nuova password per il diario.\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'diario-rumore-chiave-recupero.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private presentRecoveryKey(recoveryKey: string): void {
    this.recoveryCode.set(recoveryKey);
    this.recoveryCodeSaved.set(false);
    this.recoveryNotice.set('');
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

  protected async deleteLocalDiary(): Promise<void> {
    if (this.authMode() !== 'unlocked' || this.authBusy()) {
      return;
    }
    if (this.recordingActive()) {
      this.audioError.set('Ferma la registrazione prima di cancellare il diario.');
      return;
    }

    const confirmation = window.prompt(
      'Questa operazione elimina episodi, registrazioni, chiave locale e dati legacy da questo browser. ' +
        'Non elimina backup esportati, file scaricati o copie di altri dispositivi. ' +
        'Chiudi le altre schede del diario, poi digita ELIMINA per confermare.',
    );
    if (confirmation !== 'ELIMINA') {
      return;
    }

    this.authBusy.set(true);
    this.deletingDiary.set(true);
    this.storageError.set('');
    this.authStatus.set('');
    this.audioError.set('');
    this.audioStatus.set('');
    this.importStatus.set('');
    try {
      this.audioClipRepository.close();
      await this.storageService.deleteAllLocalData(() =>
        this.storageError.set(
          'Cancellazione in attesa: chiudi le altre schede del diario per completarla.',
        ),
      );
      this.vault.deleteConfiguration();
      this.clearPrivateDiary();
      this.authMode.set('setup');
      this.passwordInput.set('');
      this.passwordConfirmation.set('');
      this.authStatus.set('Diario locale cancellato da questo browser.');
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile cancellare il diario locale.',
      );
    } finally {
      this.deletingDiary.set(false);
      this.authBusy.set(false);
    }
  }

  protected async importDiary(event: Event, mode: 'replace' | 'append'): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      this.storageError.set('Seleziona un backup Diario Rumore valido da importare.');
      return;
    }
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!/\.(?:json|ndbackup)$/i.test(file.name)) {
      this.storageError.set('Seleziona un file .ndbackup o un JSON storico.');
      return;
    }
    if (file.size > MAX_BACKUP_FILE_SIZE) {
      this.storageError.set('Il backup supera il limite di 120 MiB.');
      return;
    }

    this.storageError.set('');
    this.importStatus.set('');
    try {
      const contents: unknown = JSON.parse(await file.text());
      let importedEvents: NoiseEvent[];
      let importedClips: AudioClip[] = [];
      if (this.backupService.isEncryptedEnvelope(contents)) {
        const password = window.prompt(
          'Inserisci la password principale usata per cifrare questo backup.',
        );
        if (password === null) {
          this.importStatus.set('Importazione annullata; nessun episodio è stato modificato.');
          return;
        }
        const backup = await this.backupService.decrypt(contents, password);
        importedEvents = backup.events.length
          ? this.storageService.parseImport(backup.events)
          : [];
        importedClips = backup.audioClips;
      } else {
        if (
          !window.confirm(
            'Questo JSON storico non è cifrato e non contiene registrazioni audio. Importarlo solo se proviene da una fonte attendibile?',
          )
        ) {
          this.importStatus.set('Importazione annullata; nessun episodio è stato modificato.');
          return;
        }
        importedEvents = this.storageService.parseImport(contents);
      }

      if (mode === 'replace') {
        if (
          !confirm(
            'Sostituire tutti gli episodi e le registrazioni locali con quelli del backup? Le registrazioni locali non presenti nel backup verranno eliminate.',
          )
        ) {
          return;
        }
        await this.storageService.saveEventsAndClips(importedEvents, importedClips, true);
        this.events.set(importedEvents);
        this.selectedEventId.set(importedEvents[0]?.id ?? null);
        this.activeView.set('list');
        this.revokeAudioUrls();
        this.audioClips.set([]);
        if (importedEvents[0]) {
          await this.loadAudioForEvent(importedEvents[0].id);
        }
        this.importStatus.set(
          `Sostituiti gli episodi con ${importedEvents.length} elementi e importate ${importedClips.length} registrazioni audio dal backup.`,
        );
        return;
      }

      if (importedEvents.length === 0) {
        this.importStatus.set('Il backup non contiene episodi; nessun dato è stato modificato.');
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
        this.pendingAppendImport.set({ additions, conflicts, duplicateCount, audioClips: importedClips });
        this.importStatus.set('Rivedi gli episodi con lo stesso ID prima di completare l’importazione.');
        return;
      }
      await this.applyAppendImport(additions, [], duplicateCount, importedClips);
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
      await this.applyAppendImport(
        pending.additions,
        pending.conflicts,
        pending.duplicateCount,
        pending.audioClips,
      );
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
    audioClips: AudioClip[],
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
    const retainedEventIds = new Set(
      conflicts.filter((conflict) => conflict.choice === 'keep-current').map((conflict) => conflict.current.id),
    );
    const acceptedClips = audioClips.filter((clip) => !retainedEventIds.has(clip.eventId));
    const existingClips = await this.audioClipRepository.getByIds(
      acceptedClips.map((clip) => clip.id),
    );
    const existingById = new Map(existingClips.map((clip) => [clip.id, clip]));
    const clipsToSave: AudioClip[] = [];
    for (const clip of acceptedClips) {
      const existing = existingById.get(clip.id);
      if (!existing) {
        clipsToSave.push(clip);
      } else if (
        existing.eventId !== clip.eventId ||
        existing.sha256 !== clip.sha256 ||
        existing.sizeBytes !== clip.sizeBytes
      ) {
        throw new Error(
          `La registrazione "${clip.fileName}" ha un ID già usato per contenuti diversi; nessun dato è stato importato.`,
        );
      }
    }
    if (clipsToSave.length > 0) {
      await this.storageService.saveEventsAndClips(mergedEvents, clipsToSave);
    } else {
      await this.storageService.saveEvents(mergedEvents);
    }
    this.events.set(mergedEvents);
    const importedCount = additions.length + conflicts.filter((item) => item.choice === 'use-file').length;
    const nextSelectedId =
      additions[0]?.id ??
      conflicts.find((item) => item.choice === 'use-file')?.incoming.id ??
      clipsToSave[0]?.eventId;
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
      `${importedMessage}; ${retainedMessage}; importate ${clipsToSave.length} registrazioni audio.`,
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

  protected async downloadExport(): Promise<void> {
    if (this.authMode() !== 'unlocked') {
      return;
    }
    const password = window.prompt('Inserisci la password principale per cifrare il backup.');
    if (password === null) {
      return;
    }
    this.storageError.set('');
    try {
      const audioClips = (
        await Promise.all(
          this.events().map((diaryEvent) =>
            this.audioClipRepository.listByEvent(diaryEvent.id),
          ),
        )
      ).flat();
      const serialized = await this.backupService.encrypt(this.events(), audioClips, password);
      const blob = new Blob([serialized], { type: 'application/json' });
      if (blob.size > MAX_BACKUP_FILE_SIZE) {
        throw new Error('Il backup supera il limite di 120 MiB e non può essere esportato in un unico file.');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'diario-rumore-backup.ndbackup';
      anchor.click();
      URL.revokeObjectURL(url);
      this.importStatus.set(
        `Backup cifrato creato con ${this.events().length} episodi e ${audioClips.length} registrazioni audio.`,
      );
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Impossibile creare il backup cifrato.',
      );
    }
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
    this.recoveryCode.set('');
    this.recoveryCodeSaved.set(false);
    this.recoveryNotice.set('');
    this.recoveryMode.set(false);
    this.recoveryKeyInput.set('');
    this.recoveryPassword.set('');
    this.recoveryPasswordConfirmation.set('');
    this.importStatus.set('');
    this.storageError.set('');
    this.authStatus.set('');
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
