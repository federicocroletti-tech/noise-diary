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
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('noise-diary');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB deletion is blocked by another test connection.'));
    });
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

    vault.lock();
    await expect(repository.listByEvent(clip.eventId)).rejects.toThrow('Sblocca il diario');
  });
});

function readStoredClip(id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open('noise-diary');
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const request = database.transaction('audio-clips', 'readonly').objectStore('audio-clips').get(id);
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
