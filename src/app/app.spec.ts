import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioClipRepository } from './audio/audio-clip.repository';
import { LocalVaultService } from './services/local-vault.service';
import { NoiseStorageService } from './services/noise-storage.service';
import { App } from './app';

describe('App', () => {
  const savedEvents = vi.fn().mockResolvedValue(undefined);
  const storage = {
    loadEvents: vi.fn().mockResolvedValue([]),
    saveEvents: savedEvents,
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    parseImport: vi.fn(),
  };
  const vault = {
    isConfigured: vi.fn().mockReturnValue(false),
    create: vi.fn().mockResolvedValue(undefined),
    unlock: vi.fn().mockResolvedValue(undefined),
    lock: vi.fn(),
  };
  const audioClips = {
    listByEvent: vi.fn().mockResolvedValue([]),
    encryptLegacyRecords: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    savedEvents.mockClear();
    storage.loadEvents.mockReset().mockResolvedValue([]);
    storage.deleteEvent.mockReset().mockResolvedValue(undefined);
    storage.parseImport.mockReset();
    vault.isConfigured.mockReset().mockReturnValue(false);
    vault.create.mockReset().mockResolvedValue(undefined);
    vault.unlock.mockReset().mockResolvedValue(undefined);
    vault.lock.mockReset();
    audioClips.listByEvent.mockReset().mockResolvedValue([]);
    audioClips.encryptLegacyRecords.mockReset().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: NoiseStorageService, useValue: storage },
        { provide: LocalVaultService, useValue: vault },
        { provide: AudioClipRepository, useValue: audioClips },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createVault(fixture: ComponentFixture<App>): Promise<void> {
    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInputs = compiled.querySelectorAll<HTMLInputElement>(
      'input[autocomplete="new-password"]',
    );
    const password = passwordInputs.item(0);
    const confirmation = passwordInputs.item(1);
    if (!password || !confirmation) {
      throw new Error('Password setup inputs are missing.');
    }
    password.value = 'local-test-passphrase-2026';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    confirmation.value = 'local-test-passphrase-2026';
    confirmation.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('requires local password setup before loading the diary', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Diario Rumore');
    expect(compiled.querySelector('.event-list')).toBeNull();
    expect(compiled.textContent).toContain('Proteggi il diario locale');
    expect(storage.loadEvents).not.toHaveBeenCalled();

    await createVault(fixture);

    expect(compiled.textContent).toContain('Nessun episodio nel diario');
    expect(compiled.querySelectorAll<HTMLSelectElement>('.event-form select')[1].value).toBe(
      'unknown',
    );
    expect(compiled.querySelectorAll<HTMLSelectElement>('.event-form select')[2].value).toBe(
      'simple-observation',
    );
    expect(storage.loadEvents).toHaveBeenCalledOnce();
    expect(audioClips.encryptLegacyRecords).toHaveBeenCalledOnce();
    expect(savedEvents).not.toHaveBeenCalled();
  });

  it('creates a draft with a five-level subjective intensity and shows local audio controls', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const intensity = compiled.querySelector<HTMLInputElement>('input[type="range"]');
    expect(intensity?.max).toBe('5');

    compiled.querySelector<HTMLButtonElement>('.submit')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(savedEvents).toHaveBeenCalledOnce();
    expect(savedEvents.mock.calls[0][0][0]).toMatchObject({
      perceivedIntensity: 3,
      status: 'draft',
      suspectedSource: 'Non specificata (ipotesi)',
    });
    expect(compiled.textContent).toContain('Registrazioni audio');
    expect(compiled.querySelector('button[aria-label^="Avvia registrazione per"]')).not.toBeNull();
  });

  it('saves an edit with its reason and previous event snapshot', async () => {
    const existingEvent = {
      id: 'event-to-edit',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-22T22:05:00.000Z',
      updatedAt: '2026-10-22T22:05:00.000Z',
      locationLabel: 'Test location',
      room: 'Soggiorno',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: 2,
      perceivedEffects: ['simple-observation'],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Descrizione precedente.',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: [],
    };
    storage.loadEvents.mockResolvedValue([existingEvent]);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Modifica episodio"]')?.click();
    fixture.detectChanges();
    const description = compiled.querySelector<HTMLTextAreaElement>(
      '.event-form textarea',
    );
    const reason = compiled.querySelector<HTMLTextAreaElement>(
      'textarea[aria-describedby="correction-reason-help"]',
    );
    if (!description || !reason) {
      throw new Error('Edit form fields are missing.');
    }
    description.value = 'Descrizione corretta.';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    reason.value = 'Correzione di un errore di trascrizione.';
    reason.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('.event-form button[type="submit"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(savedEvents).toHaveBeenCalledOnce();
    const updatedEvent = savedEvents.mock.calls[0][0][0];
    expect(updatedEvent).toMatchObject({
      id: existingEvent.id,
      createdAt: existingEvent.createdAt,
      description: 'Descrizione corretta.',
      correctionHistory: [
        {
          reason: 'Correzione di un errore di trascrizione.',
          previousSnapshot: expect.any(String),
        },
      ],
    });
    expect(JSON.parse(updatedEvent.correctionHistory[0].previousSnapshot)).toMatchObject({
      description: 'Descrizione precedente.',
      updatedAt: existingEvent.updatedAt,
    });
    expect(compiled.textContent).toContain('Cronologia delle correzioni');
  });

  it('cancels editing without changing the saved event', async () => {
    const existingEvent = {
      id: 'event-edit-cancel',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-22T22:05:00.000Z',
      updatedAt: '2026-10-22T22:05:00.000Z',
      locationLabel: 'Test location',
      room: 'Soggiorno',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: 2,
      perceivedEffects: ['simple-observation'],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Originale.',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: [],
    };
    storage.loadEvents.mockResolvedValue([existingEvent]);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Modifica episodio"]')?.click();
    fixture.detectChanges();
    const description = compiled.querySelector<HTMLTextAreaElement>('.event-form textarea');
    if (!description) {
      throw new Error('Edit description field is missing.');
    }
    description.value = 'Modifica non salvata.';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    [...compiled.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Annulla modifica'))
      ?.click();
    fixture.detectChanges();

    expect(savedEvents).not.toHaveBeenCalled();
    expect(compiled.querySelector('.event-form')).toBeNull();
    expect(compiled.textContent).toContain('Originale.');
  });

  it('preserves unreported intensity and effects when correcting another field', async () => {
    const existingEvent = {
      id: 'event-with-unreported-values',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-22T22:05:00.000Z',
      updatedAt: '2026-10-22T22:05:00.000Z',
      locationLabel: 'Test location',
      room: 'Soggiorno',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: null,
      perceivedEffects: [],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Descrizione originale.',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: [],
    };
    storage.loadEvents.mockResolvedValue([existingEvent]);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Modifica episodio"]')?.click();
    fixture.detectChanges();
    const description = compiled.querySelector<HTMLTextAreaElement>('.event-form textarea');
    const reason = compiled.querySelector<HTMLTextAreaElement>(
      'textarea[aria-describedby="correction-reason-help"]',
    );
    if (!description || !reason) {
      throw new Error('Correction form fields are missing.');
    }
    description.value = 'Descrizione corretta.';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    reason.value = 'Correzione descrittiva.';
    reason.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('.event-form button[type="submit"]')?.click();
    await fixture.whenStable();

    expect(savedEvents.mock.calls[0][0][0]).toMatchObject({
      perceivedIntensity: null,
      perceivedEffects: [],
      description: 'Descrizione corretta.',
    });
  });

  it('requires confirmation before deleting an event and its associated audio', async () => {
    const existingEvent = {
      id: 'event-to-delete',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-22T22:05:00.000Z',
      updatedAt: '2026-10-22T22:05:00.000Z',
      locationLabel: 'Test location',
      room: 'Soggiorno',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: 2,
      perceivedEffects: ['simple-observation'],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Synthetic event to delete.',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: ['synthetic-audio-id'],
    };
    storage.loadEvents.mockResolvedValue([existingEvent]);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Elimina episodio"]')?.click();
    await fixture.whenStable();
    expect(storage.deleteEvent).not.toHaveBeenCalled();
    expect(compiled.textContent).toContain('Synthetic event to delete.');

    confirmation.mockReturnValue(true);
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Elimina episodio"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(storage.deleteEvent).toHaveBeenCalledOnce();
    expect(storage.deleteEvent).toHaveBeenCalledWith(existingEvent.id);
    expect(compiled.textContent).toContain('Nessun episodio nel diario');
    expect(compiled.textContent).toContain('eliminati dall’archivio di questo browser');
  });

  it('imports validated events into encrypted local history and skips existing IDs', async () => {
    const existingEvent = {
      id: 'existing-event',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
      locationLabel: 'Test location',
      room: '',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: null,
      perceivedEffects: [],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Existing local event.',
      notes: '',
      status: 'to-review',
      tags: ['importato'],
      attachmentIds: [],
    };
    const importedEvent = {
      id: 'imported-event',
      startedAt: '2026-10-23T22:04:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
      locationLabel: 'Test location',
      room: '',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: null,
      perceivedEffects: [],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'Suono artificiale percepito come vuoto o assestamento.',
      notes: 'Importato da diario locale.',
      status: 'to-review',
      tags: ['importato'],
      attachmentIds: [],
    };
    storage.loadEvents.mockResolvedValue([existingEvent]);
    storage.parseImport.mockReturnValue([existingEvent, importedEvent]);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error('Diary import input is missing.');
    }
    const file = new File(['{"events":[]}'], 'diario-rumore.json', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(storage.parseImport).toHaveBeenCalledOnce();
    expect(savedEvents).toHaveBeenCalledOnce();
    expect(savedEvents.mock.calls[0][0]).toEqual([existingEvent, importedEvent]);
    expect(compiled.textContent).toContain(
      'Aggiunto o aggiornato 1 episodio; mantenuto 1 elemento locale non sostituito.',
    );
    expect(compiled.textContent).toContain('Non disponibile');
  });
});
