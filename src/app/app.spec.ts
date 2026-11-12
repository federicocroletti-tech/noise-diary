import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioClipRepository } from './audio/audio-clip.repository';
import { LocalVaultService } from './services/local-vault.service';
import { LocalBackupService } from './services/local-backup.service';
import { NoiseStorageService } from './services/noise-storage.service';
import { LocalDiaryProfile, LocalProfileService } from './services/local-profile.service';
import { NeonAuthService } from './services/neon-auth.service';
import { NeonAudioRepository } from './services/neon-audio.repository';
import { NeonDiaryService } from './services/neon-diary.service';
import { NoiseEvent } from './domain/noise-event.model';
import { AudioClip } from './audio/models/audio-clip.model';
import { App } from './app';

describe('App', () => {
  const defaultProfile: LocalDiaryProfile = {
    id: 'profile-00000000-0000-4000-8000-000000000001',
    name: 'Profilo test',
    legacy: false,
  };
  let savedProfiles: LocalDiaryProfile[] = [];
  const syntheticEvent: NoiseEvent = {
    id: 'shared-event',
    startedAt: '2026-11-10T12:00:00.000Z',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    locationLabel: 'Luogo sintetico',
    room: 'Stanza sintetica',
    eventType: 'UNKNOWN',
    continuityType: 'unknown',
    perceivedIntensity: 2,
    perceivedEffects: ['simple-observation'],
    suspectedSource: 'Non identificata (ipotesi)',
    description: 'Evento sintetico',
    notes: '',
    status: 'draft',
    tags: [],
    attachmentIds: [],
  };
  const savedEvents = vi.fn().mockResolvedValue(undefined);
  const storage = {
    loadEvents: vi.fn().mockResolvedValue([]),
    saveEvents: savedEvents,
    saveEventsAndClips: vi.fn().mockResolvedValue(undefined),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    deleteAllLocalData: vi.fn().mockResolvedValue(undefined),
    parseImport: vi.fn(),
    useProfile: vi.fn(),
    close: vi.fn(),
  };
  const vault = {
    isConfigured: vi.fn().mockReturnValue(false),
    create: vi
      .fn()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      ),
    unlock: vi.fn().mockResolvedValue(null),
    recover: vi
      .fn()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      ),
    rotateRecoveryKey: vi
      .fn()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      ),
    commitRecoveryChange: vi.fn(),
    lock: vi.fn(),
    deleteConfiguration: vi.fn(),
    useProfile: vi.fn(),
  };
  const backup = {
    isEncryptedEnvelope: vi.fn().mockReturnValue(false),
    decrypt: vi.fn(),
    encrypt: vi.fn(),
  };
  const audioClips = {
    listByEvent: vi.fn().mockResolvedValue([]),
    getByIds: vi.fn().mockResolvedValue([]),
    encryptLegacyRecords: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    useProfile: vi.fn(),
  };
  const profileService = {
    listProfiles: vi.fn(() => savedProfiles),
    createProfile: vi.fn((name: string) => {
      const profile = {
        id: 'profile-00000000-0000-4000-8000-000000000002',
        name: name.trim(),
        legacy: false,
      };
      savedProfiles.push(profile);
      return profile;
    }),
    deleteProfile: vi.fn((id: string) => {
      savedProfiles = savedProfiles.filter((profile) => profile.id !== id);
    }),
  };
  const accountService = {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    verifyEmail: vi.fn(),
    sendVerificationOtp: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    getAccessToken: vi.fn(),
  };
  const cloudDiary = {
    loadEvents: vi.fn().mockResolvedValue([]),
    saveEvents: vi.fn().mockResolvedValue(undefined),
    saveEventsAndClips: vi.fn().mockResolvedValue(undefined),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    deleteAll: vi.fn().mockResolvedValue(undefined),
  };
  const cloudAudio = {
    save: vi.fn().mockResolvedValue(undefined),
    listByEvent: vi.fn().mockResolvedValue([]),
    getByIds: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    savedProfiles = [defaultProfile];
    savedEvents.mockClear();
    storage.loadEvents.mockReset().mockResolvedValue([]);
    storage.deleteEvent.mockReset().mockResolvedValue(undefined);
    storage.deleteAllLocalData.mockReset().mockResolvedValue(undefined);
    storage.saveEventsAndClips.mockReset().mockResolvedValue(undefined);
    storage.parseImport.mockReset();
    storage.useProfile.mockReset();
    storage.close.mockReset();
    backup.isEncryptedEnvelope.mockReset().mockReturnValue(false);
    backup.decrypt.mockReset();
    backup.encrypt.mockReset();
    vault.isConfigured.mockReset().mockReturnValue(false);
    vault.create
      .mockReset()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      );
    vault.unlock.mockReset().mockResolvedValue(null);
    vault.recover
      .mockReset()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      );
    vault.rotateRecoveryKey
      .mockReset()
      .mockResolvedValue(
        'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      );
    vault.commitRecoveryChange.mockReset();
    vault.lock.mockReset();
    vault.deleteConfiguration.mockReset();
    vault.useProfile.mockReset();
    audioClips.listByEvent.mockReset().mockResolvedValue([]);
    audioClips.getByIds.mockReset().mockResolvedValue([]);
    audioClips.encryptLegacyRecords.mockReset().mockResolvedValue(undefined);
    audioClips.close.mockReset();
    audioClips.useProfile.mockReset();
    profileService.listProfiles.mockReset().mockImplementation(() => savedProfiles);
    profileService.createProfile.mockReset().mockImplementation((name: string) => {
      const profile = {
        id: 'profile-00000000-0000-4000-8000-000000000002',
        name: name.trim(),
        legacy: false,
      };
      savedProfiles.push(profile);
      return profile;
    });
    profileService.deleteProfile.mockReset().mockImplementation((id: string) => {
      savedProfiles = savedProfiles.filter((profile) => profile.id !== id);
    });
    accountService.getCurrentUser.mockReset().mockResolvedValue(null);
    accountService.signIn.mockReset();
    accountService.signUp.mockReset();
    accountService.signOut.mockReset().mockResolvedValue(undefined);
    accountService.verifyEmail.mockReset().mockResolvedValue(undefined);
    accountService.sendVerificationOtp.mockReset().mockResolvedValue(undefined);
    accountService.requestPasswordReset.mockReset().mockResolvedValue(undefined);
    accountService.resetPassword.mockReset().mockResolvedValue(undefined);
    accountService.getAccessToken.mockReset().mockResolvedValue('test-jwt');
    cloudDiary.loadEvents.mockReset().mockResolvedValue([]);
    cloudDiary.saveEvents.mockReset().mockResolvedValue(undefined);
    cloudDiary.saveEventsAndClips.mockReset().mockResolvedValue(undefined);
    cloudDiary.deleteEvent.mockReset().mockResolvedValue(undefined);
    cloudDiary.deleteAll.mockReset().mockResolvedValue(undefined);
    cloudAudio.save.mockReset().mockResolvedValue(undefined);
    cloudAudio.listByEvent.mockReset().mockResolvedValue([]);
    cloudAudio.getByIds.mockReset().mockResolvedValue([]);
    cloudAudio.delete.mockReset().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'prompt').mockReturnValue('local-test-passphrase-2026');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: NoiseStorageService, useValue: storage },
        { provide: LocalVaultService, useValue: vault },
        { provide: LocalBackupService, useValue: backup },
        { provide: AudioClipRepository, useValue: audioClips },
        { provide: LocalProfileService, useValue: profileService },
        { provide: NeonAuthService, useValue: accountService },
        { provide: NeonDiaryService, useValue: cloudDiary },
        { provide: NeonAudioRepository, useValue: cloudAudio },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function createLocalFixture(): Promise<ComponentFixture<App>> {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const localDiaryButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Apri diario salvato in questo browser'));
    if (!localDiaryButton) {
      throw new Error('Local diary entry button is missing.');
    }
    localDiaryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('opens the account diary after email/password sign-in and loads cloud data', async () => {
    const user = {
      id: 'auth-user-1',
      email: 'person@example.com',
      name: 'person',
      emailVerified: true,
    };
    accountService.signIn.mockResolvedValue(user);
    cloudDiary.loadEvents.mockResolvedValue([]);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector<HTMLInputElement>('input[type="email"]');
    const password = compiled.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
    if (!email || !password) {
      throw new Error('Account sign-in inputs are missing.');
    }
    email.value = user.email;
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'account-password-2026';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLFormElement>('.auth-panel form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(accountService.signIn).toHaveBeenCalledWith(user.email, 'account-password-2026');
    expect(cloudDiary.loadEvents).toHaveBeenCalledOnce();
    expect(compiled.textContent).toContain('Account · person@example.com');
    expect(compiled.textContent).toContain('Dati associati al tuo account');
    fixture.destroy();
  });

  it('discloses cloud audio uploads without claiming local-only or end-to-end storage', async () => {
    accountService.getCurrentUser.mockResolvedValue({
      id: 'auth-user-1',
      email: 'person@example.com',
      name: 'person',
      emailVerified: true,
    });
    cloudDiary.loadEvents.mockResolvedValue([
      {
        id: 'cloud-event',
        startedAt: '2026-11-10T12:00:00.000Z',
        createdAt: '2026-11-10T12:00:00.000Z',
        updatedAt: '2026-11-10T12:00:00.000Z',
        locationLabel: 'Luogo sintetico',
        room: 'Stanza sintetica',
        eventType: 'UNKNOWN',
        continuityType: 'unknown',
        perceivedIntensity: 2,
        perceivedEffects: ['simple-observation'],
        suspectedSource: 'Non identificata (ipotesi)',
        description: '',
        notes: '',
        status: 'draft',
        tags: [],
        attachmentIds: [],
      },
    ]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.querySelector('.audio-section')).not.toBeNull();
    });
    const audioSection = compiled.querySelector('.audio-section');

    expect(audioSection?.textContent).toContain('storage privato del tuo account');
    expect(audioSection?.textContent).toContain('Non sono cifrate end-to-end.');
    expect(audioSection?.textContent).toContain('viene caricato nel tuo account cloud');
    expect(audioSection?.textContent).not.toContain('Nessun audio viene caricato online.');
    expect(audioSection?.textContent).not.toContain('conservate solo in questo browser');
    expect(cloudAudio.listByEvent).toHaveBeenCalledWith('cloud-event');
    fixture.destroy();
  });

  async function createAccountFixture(): Promise<ComponentFixture<App>> {
    accountService.getCurrentUser.mockResolvedValue({
      id: 'auth-user-1',
      email: 'person@example.com',
      name: 'person',
      emailVerified: true,
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('main')).not.toBeNull();
    });
    return fixture;
  }

  function deferred<Result>() {
    let resolve!: (value: Result) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<Result>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  }

  function clickButton(fixture: ComponentFixture<App>, label: string): void {
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((element) => element.textContent?.trim() === label);
    if (!button) {
      throw new Error(`Missing button: ${label}`);
    }
    button.click();
    fixture.detectChanges();
  }

  async function signInSecondAccount(fixture: ComponentFixture<App>): Promise<void> {
    accountService.signIn.mockResolvedValue({
      id: 'auth-user-2',
      email: 'second@example.com',
      name: 'second',
      emailVerified: true,
    });
    const compiled = fixture.nativeElement as HTMLElement;
    const email = compiled.querySelector<HTMLInputElement>('input[type="email"]');
    const password = compiled.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
    if (!email || !password) {
      throw new Error('Second account sign-in inputs are missing.');
    }
    email.value = 'second@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'synthetic-second-account-password';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    clickButton(fixture, 'Accedi');
    await vi.waitFor(() => expect(cloudDiary.loadEvents).toHaveBeenCalledTimes(2));
  }

  function mockObjectUrls() {
    const createObjectURL = vi.fn().mockReturnValue('blob:synthetic-backup');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    return { createObjectURL, revokeObjectURL };
  }

  function syntheticClip(id: string): AudioClip {
    return {
      id,
      eventId: syntheticEvent.id,
      kind: 'event',
      fileName: `${id}.webm`,
      mimeType: 'audio/webm',
      blob: new Blob([id], { type: 'audio/webm' }),
      sizeBytes: id.length,
      durationMs: 1000,
      createdAt: syntheticEvent.startedAt,
      sha256: 'a'.repeat(64),
      origin: 'microphone',
      device: { platform: 'synthetic-test-platform' },
    };
  }

  it('exports account data with a confirmed independent backup passphrase', async () => {
    const fixture = await createAccountFixture();
    const passphrase = 'independent-backup-passphrase-2026';
    vi.mocked(window.prompt).mockReset().mockReturnValueOnce(passphrase).mockReturnValueOnce(passphrase);
    backup.encrypt.mockResolvedValue('{"encrypted":"synthetic"}');
    const { revokeObjectURL } = mockObjectUrls();
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Esporta backup cifrato'))?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(backup.encrypt).toHaveBeenCalledWith([], [], passphrase, 'account');
    expect(window.prompt).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-backup');
    expect(compiled.textContent).toContain('Backup cifrato creato');
    expect(vault.create).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it.each([
    { passphrase: null, confirmation: null, error: '' },
    { passphrase: 'short', confirmation: null, error: 'almeno 12 caratteri' },
    { passphrase: 'independent-backup-passphrase-2026', confirmation: null, error: '' },
    { passphrase: 'independent-backup-passphrase-2026', confirmation: 'different-passphrase', error: 'non coincidono' },
  ])('does not export with cancelled or invalid account passphrases: $error', async ({ passphrase, confirmation, error }) => {
    const fixture = await createAccountFixture();
    vi.mocked(window.prompt).mockReset().mockReturnValueOnce(passphrase).mockReturnValueOnce(confirmation);
    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Esporta backup cifrato'))?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(backup.encrypt).not.toHaveBeenCalled();
    expect(cloudAudio.listByEvent).not.toHaveBeenCalled();
    expect(compiled.textContent).not.toContain('Backup cifrato creato');
    if (error) {
      expect(compiled.textContent).toContain(error);
    }
    fixture.destroy();
  });

  it('ignores an old event response without hiding a new account loading state', async () => {
    const oldRequest = deferred<NoiseEvent[]>();
    const newRequest = deferred<NoiseEvent[]>();
    cloudDiary.loadEvents.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const fixture = await createAccountFixture();
    const compiled = fixture.nativeElement as HTMLElement;
    clickButton(fixture, 'Esci');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Accedi al tuo diario');
    });
    await signInSecondAccount(fixture);

    oldRequest.resolve([{ ...syntheticEvent, description: 'Private first account data' }]);
    await oldRequest.promise;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('Private first account data');
    expect(compiled.textContent).toContain('Caricamento del diario account');
    expect(cloudAudio.listByEvent).not.toHaveBeenCalled();

    newRequest.resolve([{ ...syntheticEvent, description: 'Second account current data' }]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Second account current data');
      expect(compiled.textContent).not.toContain('Caricamento del diario account');
    });
    fixture.destroy();
  });

  it('ignores a stale event failure after logout', async () => {
    const request = deferred<NoiseEvent[]>();
    cloudDiary.loadEvents.mockReturnValueOnce(request.promise);
    const fixture = await createAccountFixture();
    clickButton(fixture, 'Esci');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hai terminato la sessione');
    });

    request.reject(new Error('Private stale failure'));
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Private stale failure');
    expect(compiled.querySelector('main')).toBeNull();
    fixture.destroy();
  });

  it.each(['resolve', 'reject'] as const)('ignores old audio from another account with the same event ID: %s', async (outcome) => {
    const oldAudio = deferred<AudioClip[]>();
    const currentClip = syntheticClip('current-account-audio');
    cloudDiary.loadEvents.mockResolvedValue([syntheticEvent]);
    cloudAudio.listByEvent.mockReturnValueOnce(oldAudio.promise).mockResolvedValueOnce([currentClip]);
    const { createObjectURL } = mockObjectUrls();
    const fixture = await createAccountFixture();
    await vi.waitFor(() => expect(cloudAudio.listByEvent).toHaveBeenCalledTimes(1));
    clickButton(fixture, 'Esci');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Accedi al tuo diario');
    });
    await signInSecondAccount(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(createObjectURL).toHaveBeenCalledWith(currentClip.blob);
    });

    if (outcome === 'resolve') {
      oldAudio.resolve([syntheticClip('private-old-account-audio')]);
    } else {
      oldAudio.reject(new Error('Private old account audio error'));
    }
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(compiled.querySelectorAll('audio')).toHaveLength(1);
    expect(compiled.textContent).not.toContain('Private old account audio error');
    expect(compiled.textContent).toContain('Account · second@example.com');
    fixture.destroy();
  });

  it('keeps only the latest audio request when selecting A, B and A again', async () => {
    const eventB = { ...syntheticEvent, id: 'event-b', locationLabel: 'Second synthetic location' };
    cloudDiary.loadEvents.mockResolvedValue([syntheticEvent, eventB]);
    const fixture = await createAccountFixture();
    const compiled = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.querySelectorAll('.event-list li')).toHaveLength(2);
      expect(compiled.textContent).not.toContain('Caricamento del diario account');
    });
    const staleAudio = deferred<AudioClip[]>();
    const currentClip = syntheticClip('latest-selection');
    cloudAudio.listByEvent.mockReturnValueOnce(staleAudio.promise).mockResolvedValueOnce([]).mockResolvedValueOnce([currentClip]);
    const { createObjectURL } = mockObjectUrls();
    const items = compiled.querySelectorAll<HTMLElement>('.event-list li');
    items[0].click();
    items[1].click();
    items[0].click();
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(currentClip.blob));

    staleAudio.resolve([syntheticClip('stale-first-selection')]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(compiled.querySelectorAll('audio')).toHaveLength(1);
    fixture.destroy();
  });

  it('ignores audio from the previous local profile when event IDs coincide', async () => {
    storage.loadEvents.mockResolvedValue([syntheticEvent]);
    const fixture = await createLocalFixture();
    await createVault(fixture);
    const oldAudio = deferred<AudioClip[]>();
    const currentClip = syntheticClip('second-local-profile-audio');
    audioClips.listByEvent.mockReturnValueOnce(oldAudio.promise).mockResolvedValueOnce([currentClip]);
    const { createObjectURL } = mockObjectUrls();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLElement>('.event-list li')?.click();
    await vi.waitFor(() => expect(audioClips.listByEvent).toHaveBeenCalledTimes(2));

    const secondProfile = {
      id: 'profile-00000000-0000-4000-8000-000000000002',
      name: 'Secondo profilo sintetico',
      legacy: false,
    };
    savedProfiles = [defaultProfile, secondProfile];
    clickButton(fixture, 'Cambia profilo');
    vault.isConfigured.mockReturnValue(true);
    storage.loadEvents.mockResolvedValue([{ ...syntheticEvent, description: 'Second local profile current data' }]);
    clickButton(fixture, secondProfile.name);
    const password = compiled.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
    if (!password) {
      throw new Error('Second local profile unlock input is missing.');
    }
    password.value = 'second-local-profile-passphrase';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    clickButton(fixture, 'Sblocca diario');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Second local profile current data');
      expect(createObjectURL).toHaveBeenCalledWith(currentClip.blob);
    });

    oldAudio.resolve([syntheticClip('previous-local-profile-audio')]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(compiled.textContent).toContain('Profilo locale · Secondo profilo sintetico');
    expect(compiled.querySelectorAll('audio')).toHaveLength(1);
    expect(vault.useProfile).toHaveBeenLastCalledWith(secondProfile.id);
    fixture.destroy();
  });

  it('does not continue a local diary load after the component is destroyed', async () => {
    const request = deferred<NoiseEvent[]>();
    storage.loadEvents.mockReturnValueOnce(request.promise);
    vault.isConfigured.mockReturnValue(true);
    const fixture = await createLocalFixture();
    const compiled = fixture.nativeElement as HTMLElement;
    const password = compiled.querySelector<HTMLInputElement>('input[autocomplete="current-password"]');
    if (!password) {
      throw new Error('Local unlock input is missing.');
    }
    password.value = 'local-test-passphrase-2026';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    clickButton(fixture, 'Sblocca diario');
    await vi.waitFor(() => expect(storage.loadEvents).toHaveBeenCalledOnce());
    fixture.destroy();

    request.resolve([syntheticEvent]);
    await request.promise;
    await Promise.resolve();
    expect(audioClips.encryptLegacyRecords).not.toHaveBeenCalled();
    expect(audioClips.listByEvent).not.toHaveBeenCalled();
  });

  it('does not download an account backup after logout during encryption', async () => {
    const fixture = await createAccountFixture();
    const encryption = deferred<string>();
    backup.encrypt.mockReturnValueOnce(encryption.promise);
    const { createObjectURL } = mockObjectUrls();
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    clickButton(fixture, 'Esporta backup cifrato');
    await vi.waitFor(() => expect(backup.encrypt).toHaveBeenCalledOnce());
    clickButton(fixture, 'Esci');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Accedi al tuo diario');
    });

    encryption.resolve('{"encrypted":"synthetic"}');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Backup cifrato creato');
    fixture.destroy();
  });

  it('uses email OTP for password recovery and returns to account sign-in', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const recoveryLink = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Password dimenticata'),
    );
    recoveryLink?.click();
    fixture.detectChanges();

    const email = compiled.querySelector<HTMLInputElement>('input[type="email"]');
    if (!email) {
      throw new Error('Recovery email input is missing.');
    }
    email.value = 'person@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLFormElement>('.auth-panel form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
    expect(accountService.requestPasswordReset).toHaveBeenCalledWith('person@example.com');

    const otp = compiled.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]');
    const newPasswords = compiled.querySelectorAll<HTMLInputElement>(
      'input[autocomplete="new-password"]',
    );
    if (!otp || newPasswords.length !== 2) {
      throw new Error('Password reset inputs are missing.');
    }
    otp.value = '123456';
    otp.dispatchEvent(new Event('input', { bubbles: true }));
    newPasswords[0].value = 'a-new-account-password-2026';
    newPasswords[0].dispatchEvent(new Event('input', { bubbles: true }));
    newPasswords[1].value = 'a-new-account-password-2026';
    newPasswords[1].dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLFormElement>('.auth-panel form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(accountService.resetPassword).toHaveBeenCalledWith(
      'person@example.com',
      '123456',
      'a-new-account-password-2026',
    );
    expect(compiled.textContent).toContain('Password aggiornata');
    fixture.destroy();
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
    const savedKey = compiled.querySelector<HTMLInputElement>(
      '.recovery-panel input[type="checkbox"]',
    );
    if (!savedKey) {
      throw new Error('Recovery key confirmation is missing.');
    }
    savedKey.checked = true;
    savedKey.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.recovery-panel button.primary')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('requires local password setup before loading the diary', async () => {
    const fixture = await createLocalFixture();

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

  it('creates a named local profile before creating its password vault', async () => {
    savedProfiles = [];
    const fixture = await createLocalFixture();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Profili locali');
    expect(storage.loadEvents).not.toHaveBeenCalled();

    const name = compiled.querySelector<HTMLInputElement>('.auth-panel form.auth-form input');
    if (!name) {
      throw new Error('Local profile name input is missing.');
    }
    name.value = 'Diario di Anna';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector<HTMLButtonElement>('.auth-panel form.auth-form button')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(profileService.createProfile).toHaveBeenCalledWith('Diario di Anna');
    expect(vault.useProfile).toHaveBeenCalledWith('profile-00000000-0000-4000-8000-000000000002');
    expect(storage.useProfile).toHaveBeenCalledWith('profile-00000000-0000-4000-8000-000000000002');
    expect(compiled.textContent).toContain('Diario di Anna');
    expect(compiled.textContent).toContain('Proteggi il diario locale');
  });

  it('deletes the local diary and returns to password setup only after explicit confirmation', async () => {
    const fixture = await createLocalFixture();
    await createVault(fixture);

    vi.spyOn(window, 'prompt').mockReturnValue('ELIMINA');
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button.danger')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(audioClips.close).toHaveBeenCalledOnce();
    expect(storage.deleteAllLocalData).toHaveBeenCalledOnce();
    expect(vault.deleteConfiguration).toHaveBeenCalledOnce();
    expect(profileService.deleteProfile).toHaveBeenCalledWith(defaultProfile.id);
    expect(compiled.textContent).toContain(
      'I dati del profilo sono stati eliminati da questo browser.',
    );
    expect(compiled.textContent).toContain('Profili locali');
  });

  it('does not delete local data when the typed confirmation is not exact', async () => {
    const fixture = await createLocalFixture();
    await createVault(fixture);

    vi.spyOn(window, 'prompt').mockReturnValue('elimina');
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button.danger')?.click();
    await fixture.whenStable();

    expect(storage.deleteAllLocalData).not.toHaveBeenCalled();
    expect(vault.deleteConfiguration).not.toHaveBeenCalled();
  });

  it('creates a draft with a five-level subjective intensity and shows local audio controls', async () => {
    const fixture = await createLocalFixture();
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
    expect(compiled.querySelector('.event-list .event-header span')?.textContent?.trim()).toBe(
      'Ronzio',
    );
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
    const fixture = await createLocalFixture();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('button[aria-label="Modifica episodio"]')?.click();
    fixture.detectChanges();
    const description = compiled.querySelector<HTMLTextAreaElement>('.event-form textarea');
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
    const fixture = await createLocalFixture();
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
    const fixture = await createLocalFixture();
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
    const fixture = await createLocalFixture();
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
    const fixture = await createLocalFixture();
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
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(savedEvents).toHaveBeenCalledOnce();
    expect(savedEvents.mock.calls[0][0]).toEqual([existingEvent, importedEvent]);
    expect(compiled.textContent).toContain(
      'Aggiunto o aggiornato 1 episodio; mantenuto 1 elemento locale non sostituito; importate 0 registrazioni audio.',
    );
    expect(compiled.textContent).toContain('Non disponibile');
  });

  it('imports encrypted backups and asks before importing historical plaintext JSON', async () => {
    const importedEvent = {
      id: 'encrypted-event',
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
      description: 'Evento importato.',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: ['encrypted-clip'],
    };
    const importedClip = {
      id: 'encrypted-clip',
      eventId: importedEvent.id,
      kind: 'event' as const,
      blob: new Blob(['synthetic encrypted audio']),
      fileName: 'synthetic.webm',
      mimeType: 'audio/webm',
      sizeBytes: 25,
      durationMs: 1200,
      createdAt: '2026-10-25T00:00:00.000Z',
      sha256: 'a'.repeat(64),
      origin: 'microphone' as const,
      device: { platform: 'synthetic-test-platform' },
    };
    const encryptedEnvelope = {
      format: 'noise-diary-encrypted-backup',
      version: 1,
      salt: 'a'.repeat(32),
      iterations: 310000,
      iv: 'a'.repeat(16),
      ciphertext: 'a'.repeat(24),
    };
    backup.isEncryptedEnvelope.mockReturnValue(true);
    backup.decrypt.mockResolvedValue({
      events: [importedEvent],
      audioClips: [importedClip],
    });
    storage.parseImport.mockReturnValue([importedEvent]);
    const fixture = await createLocalFixture();
    await createVault(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error('Diary import input is missing.');
    }
    const file = new File([JSON.stringify(encryptedEnvelope)], 'diario-rumore.ndbackup', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(window.prompt).toHaveBeenCalledOnce();
    expect(backup.decrypt).toHaveBeenCalledWith(encryptedEnvelope, 'local-test-passphrase-2026');
    expect(audioClips.getByIds).toHaveBeenCalledWith([importedClip.id]);
    expect(storage.saveEventsAndClips).toHaveBeenCalledOnce();
    expect(storage.saveEventsAndClips).toHaveBeenCalledWith(
      [importedEvent],
      [importedClip],
      false,
    );
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('lets a user recover a locked diary and requires saving the rotated recovery key', async () => {
    vault.isConfigured.mockReturnValue(true);
    vault.recover.mockResolvedValue(
      'DR-AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD-EEEEEEEE-FFFFFFFF-11111111-22222222',
    );
    const fixture = await createLocalFixture();

    const compiled = fixture.nativeElement as HTMLElement;
    const recoveryToggle = [
      ...compiled.querySelectorAll<HTMLButtonElement>('.auth-panel button.secondary'),
    ].find((button) => button.textContent?.includes('Password dimenticata'));
    recoveryToggle?.click();
    fixture.detectChanges();

    const inputs = compiled.querySelectorAll<HTMLInputElement>(
      '.auth-panel input[autocomplete="new-password"]',
    );
    const recoveryKey = compiled.querySelector<HTMLInputElement>(
      '.auth-panel input[autocapitalize="characters"]',
    );
    if (inputs.length !== 2 || !recoveryKey) {
      throw new Error('Recovery form inputs are missing.');
    }
    recoveryKey.value =
      'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888';
    recoveryKey.dispatchEvent(new Event('input', { bubbles: true }));
    inputs[0].value = 'new-local-password-2026';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'new-local-password-2026';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    compiled
      .querySelector<HTMLButtonElement>('.auth-panel form:last-of-type button[type="submit"]')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(vault.recover).toHaveBeenCalledWith(
      'DR-11111111-22222222-33333333-44444444-55555555-66666666-77777777-88888888',
      'new-local-password-2026',
    );
    expect(compiled.textContent).toContain('Conserva la chiave di recupero');
    expect(
      compiled.querySelector<HTMLButtonElement>('.recovery-panel button.primary')?.disabled,
    ).toBe(true);
  });
});
