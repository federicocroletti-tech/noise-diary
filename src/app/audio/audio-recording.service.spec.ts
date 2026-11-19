import { AudioClipRepository } from './audio-clip.repository';
import { AudioRecordingService } from './audio-recording.service';
import { LocalVaultService } from '../services/local-vault.service';
import {
  calculateSha256,
  chooseSupportedAudioMimeType,
  createAudioClipFromFile,
  formatRecordingError,
  MAX_RECORDING_DURATION_SECONDS,
  MAX_RECORDING_SIZE_BYTES,
} from './audio-recording.service';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audio recording helpers', () => {
  it('selects the first browser-supported recording format', () => {
    const supportedTypes: string[] = [];
    const result = chooseSupportedAudioMimeType((mimeType) => {
      supportedTypes.push(mimeType);
      return mimeType === 'audio/mp4';
    });

    expect(result).toBe('audio/mp4');
    expect(supportedTypes).toEqual(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']);
  });

  it('returns no format when the browser supports none of the candidates', () => {
    expect(chooseSupportedAudioMimeType(() => false)).toBeUndefined();
  });

  it('uses explicit limits for a single recording', () => {
    expect(MAX_RECORDING_DURATION_SECONDS).toBe(300);
    expect(MAX_RECORDING_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });

  it('explains a denied microphone permission', () => {
    expect(formatRecordingError(new DOMException('Denied', 'NotAllowedError'))).toContain(
      'Permesso microfono negato',
    );
  });

  it('hashes a synthetic audio fixture without altering it', async () => {
    const fixture = new Blob(['synthetic audio fixture'], { type: 'audio/webm' });
    const before = await fixture.text();

    const hash = await calculateSha256(fixture);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await fixture.text()).toBe(before);
  });

  it('builds an attached clip from a user-provided audio file with its hash and duration', async () => {
    const file = new File(['synthetic attached audio'], 'vicino.m4a', {
      type: '',
      lastModified: Date.UTC(2026, 10, 18, 20, 0),
    });

    const clip = await createAudioClipFromFile(file, {
      eventId: 'event-1',
      kind: 'background',
      readDurationMs: async () => 4250,
    });

    expect(clip).toMatchObject({
      eventId: 'event-1',
      kind: 'background',
      fileName: 'vicino.m4a',
      mimeType: 'audio/mp4',
      sizeBytes: file.size,
      durationMs: 4250,
      origin: 'file',
      createdAt: '2026-11-18T20:00:00.000Z',
    });
    expect(clip.sha256).toBe(await calculateSha256(file));
    expect(await clip.blob.text()).toBe('synthetic attached audio');
  });

  it('rejects attached files that are not audio, empty, or over the size limit', async () => {
    const readDurationMs = async () => 1000;

    await expect(
      createAudioClipFromFile(new File(['x'], 'nota.txt', { type: 'text/plain' }), {
        eventId: 'event-1',
        kind: 'event',
        readDurationMs,
      }),
    ).rejects.toThrow('Formato non supportato');
    await expect(
      createAudioClipFromFile(new File([], 'vuoto.wav', { type: 'audio/wav' }), {
        eventId: 'event-1',
        kind: 'event',
        readDurationMs,
      }),
    ).rejects.toThrow('vuoto');
    const oversized = new File(['x'], 'grande.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(oversized, 'size', { value: MAX_RECORDING_SIZE_BYTES + 1 });
    await expect(
      createAudioClipFromFile(oversized, { eventId: 'event-1', kind: 'event', readDurationMs }),
    ).rejects.toThrow('50 MB');
  });

  it('records a synthetic microphone fixture and persists its original blob and hash locally', async () => {
    class FakeMediaRecorder {
      static isTypeSupported = vi.fn(() => true);
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm;codecs=opus';
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(_stream: MediaStream, _options: MediaRecorderOptions) {}

      start(): void {
        this.state = 'recording';
      }

      pause(): void {
        this.state = 'paused';
      }

      resume(): void {
        this.state = 'recording';
      }

      stop(): void {
        this.state = 'inactive';
        this.ondataavailable?.(
          new BlobEvent('dataavailable', { data: new Blob(['synthetic microphone audio']) }),
        );
        this.onstop?.();
      }
    }

    const stopTrack = vi.fn();
    const saveClip = vi.fn().mockResolvedValue(undefined);
    const repository = new AudioClipRepository(new LocalVaultService());
    vi.spyOn(repository, 'save').mockImplementation(saveClip);
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
      platform: 'synthetic-test-platform',
      userAgent: 'synthetic-test-agent',
    });

    const service = new AudioRecordingService(repository);
    await service.start('event-test-1', 'background');
    expect(service.supportsPause).toBe(true);
    service.pause();
    expect(service.isPaused).toBe(true);
    service.resume();
    expect(service.isRecording).toBe(true);

    const savedClip = await service.stop();

    expect(saveClip).toHaveBeenCalledOnce();
    expect(savedClip.eventId).toBe('event-test-1');
    expect(savedClip.kind).toBe('background');
    expect(savedClip.origin).toBe('microphone');
    expect(savedClip.mimeType).toBe('audio/webm;codecs=opus');
    expect(savedClip.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await savedClip.blob.text()).toBe('synthetic microphone audio');
    expect(stopTrack).toHaveBeenCalledOnce();

  });

  it('does not continue when microphone permission is denied', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      },
      platform: 'synthetic-test-platform',
    });
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: vi.fn(() => true),
    });

    const service = new AudioRecordingService(new AudioClipRepository(new LocalVaultService()));

    await expect(service.start('event-test-1', 'event')).rejects.toMatchObject({
      name: 'NotAllowedError',
    });
    expect(service.isRecording).toBe(false);

  });
});
