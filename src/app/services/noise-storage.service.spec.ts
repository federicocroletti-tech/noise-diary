import 'fake-indexeddb/auto';
import { NoiseEvent } from '../domain/noise-event.model';
import { NoiseEventRepository } from './noise-event.repository';
import { NoiseStorageService } from './noise-storage.service';

describe('NoiseStorageService', () => {
  const repositories: NoiseEventRepository[] = [];

  function createStorage(): NoiseStorageService {
    const repository = new NoiseEventRepository();
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

    const storage = createStorage();
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

    const nextSessionStorage = createStorage();
    expect(await nextSessionStorage.loadEvents()).toEqual(events);
  });

  it('rejects intensity outside the required one-to-five range', async () => {
    const storage = createStorage();
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
      'L’intensità percepita deve essere un numero intero da 1 a 5.',
    );
  });

  it('preserves unreadable legacy data and reports the problem', async () => {
    localStorage.setItem('noise-diary.events', '{invalid');
    const storage = createStorage();

    await expect(storage.loadEvents()).rejects.toThrow('sono rimasti intatti nel browser');
    expect(localStorage.getItem('noise-diary.events')).toBe('{invalid');
  });
});
