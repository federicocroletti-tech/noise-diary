import 'fake-indexeddb/auto';
import { NoiseEvent } from '../domain/noise-event.model';
import { NoiseEventRepository } from './noise-event.repository';
import { LocalVaultService } from './local-vault.service';
import { NoiseStorageService } from './noise-storage.service';

describe('NoiseStorageService', () => {
  const repositories: NoiseEventRepository[] = [];
  const vaults: LocalVaultService[] = [];

  async function createStorage(): Promise<NoiseStorageService> {
    const vault = new LocalVaultService();
    await vault.create('local-test-passphrase-2026');
    vaults.push(vault);
    const repository = new NoiseEventRepository(vault);
    repositories.push(repository);
    return new NoiseStorageService(repository);
  }

  function legacyEvent(id: string, intensity: number): Record<string, unknown> {
    return {
      id,
      startedAt: '2026-10-20T21:10:00.000Z',
      endedAt: '2026-10-20T21:12:30.000Z',
      duration: 150,
      createdAt: '2026-10-20T21:12:30.000Z',
      updatedAt: '2026-10-20T21:12:30.000Z',
      locationLabel: 'Cucina',
      room: 'Cucina',
      eventType: 'HUM',
      continuityType: 'single',
      perceivedIntensity: intensity,
      perceivedEffects: ['ronzio costante'],
      suspectedSource: 'ventilazione',
      description: '',
      notes: '',
      status: 'recorded',
      tags: [],
      attachmentIds: [],
    };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    repositories.splice(0).forEach((repository) => repository.close());
    vaults.splice(0).forEach((vault) => vault.lock());
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('noise-diary');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB deletion is blocked by another test connection.'));
    });
  });

  it('migrates user episodes to IndexedDB and removes previously seeded demo episodes', async () => {
    const userEvent = legacyEvent('user-event-1', 8);
    const previousDemoEvent = legacyEvent('evt-101', 6);
    localStorage.setItem('noise-diary.events', JSON.stringify([userEvent, previousDemoEvent]));

    const storage = await createStorage();
    const events = await storage.loadEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'user-event-1',
      perceivedIntensity: 4,
      continuityType: 'impulsive',
      status: 'complete',
      perceivedEffects: ['simple-observation'],
    });
    expect(localStorage.getItem('noise-diary.events')).toBeNull();

    const vault = vaults[0];
    vault.lock();
    await vault.unlock('local-test-passphrase-2026');
    const nextSessionStorage = new NoiseStorageService(new NoiseEventRepository(vault));
    expect(await nextSessionStorage.loadEvents()).toEqual(events);
  });

  it('rejects intensity outside the required one-to-five range', async () => {
    const storage = await createStorage();
    const invalidEvent: NoiseEvent = {
      id: 'new-event',
      startedAt: '2026-10-20T21:10:00.000Z',
      createdAt: '2026-10-20T21:10:00.000Z',
      updatedAt: '2026-10-20T21:10:00.000Z',
      locationLabel: '',
      room: '',
      eventType: 'HUM',
      continuityType: 'unknown',
      perceivedIntensity: 6,
      perceivedEffects: ['simple-observation'],
      suspectedSource: 'non specificata (ipotesi)',
      description: '',
      notes: '',
      status: 'draft',
      tags: [],
      attachmentIds: [],
    };

    await expect(storage.saveEvents([invalidEvent])).rejects.toThrow(
      'un numero intero da 1 a 5',
    );
  });

  it('accepts imported episodes with unreported intensity and rejects duplicate IDs', async () => {
    const storage = await createStorage();
    const event: NoiseEvent = {
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

    expect(storage.parseImport({ source: 'Diario Rumore', events: [event] })).toEqual([event]);
    expect(() => storage.parseImport({ events: [event, event] })).toThrow('ID duplicati');
    await expect(storage.saveEvents([event])).resolves.toBeUndefined();
  });

  it('stores private diary fields as ciphertext and requires unlocking to read them', async () => {
    const storage = await createStorage();
    const event: NoiseEvent = {
      id: 'private-event',
      startedAt: '2026-10-23T22:04:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
      locationLabel: 'Via Perini 18, Milano',
      room: '',
      eventType: 'UNKNOWN',
      continuityType: 'unknown',
      perceivedIntensity: 2,
      perceivedEffects: [],
      suspectedSource: 'Non identificata (ipotesi)',
      description: 'private diary entry',
      notes: '',
      status: 'to-review',
      tags: [],
      attachmentIds: [],
    };

    await storage.saveEvents([event]);
    const stored = await readStoredEvent(event.id);
    expect(stored).toHaveProperty('ciphertext');
    expect(stored).not.toHaveProperty('description');
    expect(stored).not.toHaveProperty('locationLabel');

    vaults[0].lock();
    await expect(storage.loadEvents()).rejects.toThrow('Sblocca il diario');
  });

  it('preserves unreadable legacy data and reports the problem', async () => {
    localStorage.setItem('noise-diary.events', '{invalid');
    const storage = await createStorage();

    await expect(storage.loadEvents()).rejects.toThrow('sono rimasti intatti nel browser');
    expect(localStorage.getItem('noise-diary.events')).toBe('{invalid');
  });
});

function readStoredEvent(id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open('noise-diary');
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const request = database.transaction('noise-events', 'readonly').objectStore('noise-events').get(id);
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
