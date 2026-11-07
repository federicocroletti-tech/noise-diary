import { AudioClip } from '../audio/models/audio-clip.model';
import { NoiseEvent } from '../domain/noise-event.model';
import { LocalVaultService } from './local-vault.service';
import { LocalBackupService } from './local-backup.service';

describe('LocalBackupService', () => {
  const password = 'local-test-passphrase-2026';
  let vault: LocalVaultService;
  let backupService: LocalBackupService;

  beforeEach(async () => {
    localStorage.clear();
    vault = new LocalVaultService();
    await vault.create(password);
    backupService = new LocalBackupService(vault);
  });

  it('round-trips encrypted events and audio clips', async () => {
    const bytes = new TextEncoder().encode('synthetic audio evidence');
    const clip = await createClip(bytes);
    const event = createEvent(clip.id);

    const encrypted = await backupService.encrypt([event], [clip], password);
    expect(encrypted).not.toContain(event.locationLabel);
    expect(encrypted).not.toContain(clip.fileName);
    expect(encrypted).not.toContain('synthetic audio evidence');

    vault.lock();
    const imported = await backupService.decrypt(JSON.parse(encrypted) as unknown, password);
    expect(imported.events).toEqual([event]);
    expect(imported.audioClips).toHaveLength(1);
    expect(new TextDecoder().decode(await imported.audioClips[0].blob.arrayBuffer())).toBe(
      'synthetic audio evidence',
    );
  });

  it('rejects audio whose SHA-256 does not match the backup metadata', async () => {
    const bytes = new TextEncoder().encode('synthetic audio evidence');
    const clip = await createClip(bytes);
    const { blob, ...metadata } = clip;
    void blob;
    const payload = {
      format: 'noise-diary-case-data',
      version: 1,
      exportedAt: '2026-10-25T00:00:00.000Z',
      events: [createEvent(clip.id)],
      audioClips: [
        {
          ...metadata,
          data: btoa(String.fromCharCode(...bytes)),
          sha256: '0'.repeat(64),
        },
      ],
    };
    const encrypted = await vault.encryptBackup(payload, password);

    await expect(
      backupService.decrypt(JSON.parse(encrypted) as unknown, password),
    ).rejects.toThrow('non supera il controllo SHA-256');
  });
});

function createEvent(clipId: string): NoiseEvent {
  return {
    id: 'event-1',
    startedAt: '2026-10-20T21:10:00.000Z',
    createdAt: '2026-10-20T21:10:00.000Z',
    updatedAt: '2026-10-20T21:10:00.000Z',
    locationLabel: 'Luogo sintetico',
    room: 'Stanza sintetica',
    eventType: 'UNKNOWN',
    continuityType: 'unknown',
    perceivedIntensity: 2,
    perceivedEffects: ['simple-observation'],
    suspectedSource: 'Non identificata (ipotesi)',
    description: 'Evento di test sintetico.',
    notes: '',
    status: 'to-review',
    tags: [],
    attachmentIds: [clipId],
  };
}

async function createClip(bytes: Uint8Array): Promise<AudioClip> {
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(bytes)),
  );
  const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return {
    id: 'clip-1',
    eventId: 'event-1',
    kind: 'event',
    blob: new Blob([toArrayBuffer(bytes)], { type: 'audio/webm' }),
    fileName: 'synthetic.webm',
    mimeType: 'audio/webm',
    sizeBytes: bytes.length,
    durationMs: 1200,
    createdAt: '2026-10-20T21:10:00.000Z',
    sha256,
    origin: 'microphone',
    device: { platform: 'synthetic-test-platform' },
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
