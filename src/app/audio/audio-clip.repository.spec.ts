import 'fake-indexeddb/auto';
import { LocalVaultService } from '../services/local-vault.service';
import { AudioClipRepository } from './audio-clip.repository';
import { AudioClip } from './models/audio-clip.model';

describe('AudioClipRepository', () => {
  let vault: LocalVaultService;
  let repository: AudioClipRepository;

  beforeEach(async () => {
    localStorage.clear();
    vault = new LocalVaultService();
    await vault.create('local-test-passphrase-2026');
    repository = new AudioClipRepository(vault);
  });

  afterEach(async () => {
    repository.close();
    vault.lock();
    await Promise.all([
      deleteTestDatabase('noise-diary'),
      deleteTestDatabase('noise-diary.profile-00000000-0000-4000-8000-000000000001'),
    ]);
  });

  it('encrypts audio metadata and bytes at rest and decrypts them only after unlock', async () => {
    const clip: AudioClip = {
      id: 'clip-1',
      eventId: 'event-1',
      kind: 'event',
      blob: new Blob(['synthetic local audio'], { type: 'audio/webm' }),
      fileName: 'private-recording.webm',
      mimeType: 'audio/webm',
      sizeBytes: 21,
      durationMs: 1200,
      createdAt: '2026-10-25T00:00:00.000Z',
      sha256: 'a'.repeat(64),
      origin: 'microphone',
      device: { platform: 'synthetic-test-platform' },
    };

    await repository.save(clip);
    const stored = await readStoredClip(clip.id);
    expect(stored).toMatchObject({ id: clip.id, eventId: clip.eventId });
    expect(stored).not.toHaveProperty('fileName');
    expect(stored).not.toHaveProperty('blob');

    expect(await repository.listByEvent(clip.eventId)).toEqual([clip]);
    expect(await repository.getByIds([clip.id])).toEqual([clip]);

    vault.lock();
    await expect(repository.listByEvent(clip.eventId)).rejects.toThrow('Sblocca il diario');
  });

  it('keeps recordings in the selected profile database', async () => {
    const profileId = 'profile-00000000-0000-4000-8000-000000000001';
    const firstClip: AudioClip = {
      id: 'shared-clip-id',
      eventId: 'shared-event-id',
      kind: 'event',
      blob: new Blob(['first profile audio'], { type: 'audio/webm' }),
      fileName: 'first-profile.webm',
      mimeType: 'audio/webm',
      sizeBytes: 19,
      durationMs: 1200,
      createdAt: '2026-10-25T00:00:00.000Z',
      sha256: 'a'.repeat(64),
      origin: 'microphone',
      device: { platform: 'synthetic-test-platform' },
    };
    await repository.save(firstClip);

    vault.useProfile(profileId);
    repository.useProfile(profileId);
    await vault.create('second-profile-passphrase-2026');
    expect(await repository.listByEvent(firstClip.eventId)).toEqual([]);

    const secondClip = {
      ...firstClip,
      fileName: 'second-profile.webm',
      blob: new Blob(['second profile audio'], { type: 'audio/webm' }),
      sizeBytes: 20,
    };
    await repository.save(secondClip);
    expect(await repository.listByEvent(secondClip.eventId)).toEqual([secondClip]);

    vault.useProfile('legacy');
    repository.useProfile('legacy');
    await vault.unlock('local-test-passphrase-2026');
    expect(await repository.listByEvent(firstClip.eventId)).toEqual([firstClip]);
  });
});

function deleteTestDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`IndexedDB deletion is blocked for ${name}.`));
  });
}

function readStoredClip(id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open('noise-diary');
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const request = database
        .transaction('audio-clips', 'readonly')
        .objectStore('audio-clips')
        .get(id);
      request.onsuccess = () => {
        database.close();
        resolve(request.result);
      };
      request.onerror = () => {
        database.close();
        reject(request.error);
      };
    };
  });
}
