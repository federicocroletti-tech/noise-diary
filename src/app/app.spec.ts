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

  it('imports validated events into encrypted local history and skips existing IDs', async () => {
    const existingEvent = {
      id: 'existing-event',
      startedAt: '2026-10-22T22:04:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
      locationLabel: 'Via Perini 18, Milano',
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
      locationLabel: 'Via Perini 18, Milano',
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
    expect(compiled.textContent).toContain('Importato 1 episodio; 1 duplicato ignorato.');
    expect(compiled.textContent).toContain('Non disponibile');
  });
});
