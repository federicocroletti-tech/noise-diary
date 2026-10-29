import { TestBed } from '@angular/core/testing';
import { AudioClipRepository } from './audio/audio-clip.repository';
import { NoiseStorageService } from './services/noise-storage.service';
import { App } from './app';

describe('App', () => {
  const savedEvents = vi.fn().mockResolvedValue(undefined);
  const storage = {
    loadEvents: vi.fn().mockResolvedValue([]),
    saveEvents: savedEvents,
  };

  beforeEach(async () => {
    savedEvents.mockClear();
    storage.loadEvents.mockReset().mockResolvedValue([]);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: NoiseStorageService, useValue: storage },
        {
          provide: AudioClipRepository,
          useValue: { listByEvent: vi.fn().mockResolvedValue([]) },
        },
      ],
    }).compileComponents();
  });

  it('starts with an empty diary rather than demo events', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Diario Rumore');
    expect(compiled.querySelector('.event-list')).toBeNull();
    expect(compiled.textContent).toContain('Nessun episodio nel diario');
    expect(compiled.querySelectorAll<HTMLSelectElement>('.event-form select')[1].value).toBe(
      'unknown',
    );
    expect(compiled.querySelectorAll<HTMLSelectElement>('.event-form select')[2].value).toBe(
      'simple-observation',
    );
    expect(storage.loadEvents).toHaveBeenCalledOnce();
    expect(savedEvents).not.toHaveBeenCalled();
  });

  it('creates a draft with a five-level subjective intensity and shows local audio controls', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

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
});
