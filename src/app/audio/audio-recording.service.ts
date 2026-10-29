import { Injectable } from '@angular/core';
import { AudioClipKind, AudioClip } from './models/audio-clip.model';
import { AudioClipRepository } from './audio-clip.repository';

export const MAX_RECORDING_DURATION_SECONDS = 300;
export const MAX_RECORDING_SIZE_BYTES = 50 * 1024 * 1024;
const MIME_TYPE_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function chooseSupportedAudioMimeType(isSupported: (mimeType: string) => boolean): string | undefined {
  return MIME_TYPE_CANDIDATES.find(isSupported);
}

export async function calculateSha256(blob: Blob, subtleCrypto: SubtleCrypto = crypto.subtle): Promise<string> {
  const digest = await subtleCrypto.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function formatRecordingError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Permesso microfono negato. Consenti l’accesso dalle impostazioni del browser e riprova.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'Nessun microfono disponibile sul dispositivo.';
  }
  if (error instanceof DOMException && error.name === 'NotReadableError') {
    return 'Il microfono è occupato o non può essere letto in questo momento.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Registrazione audio non riuscita. Riprova.';
}

@Injectable({ providedIn: 'root' })
export class AudioRecordingService {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private eventId = '';
  private kind: AudioClipKind = 'event';
  private startedAt = 0;
  private elapsedBeforePause = 0;
  private activeSegmentStartedAt = 0;
  private durationTimer?: ReturnType<typeof setInterval>;
  private starting = false;
  private exceededSizeLimit = false;
  private recordingFailure?: Error;
  private resultPromise?: Promise<AudioClip>;
  private resolveResult?: (clip: AudioClip) => void;
  private rejectResult?: (error: Error) => void;

  constructor(private readonly repository: AudioClipRepository) {}

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  get isPaused(): boolean {
    return this.recorder?.state === 'paused';
  }

  get supportsPause(): boolean {
    return Boolean(this.recorder?.pause && this.recorder.resume);
  }

  get elapsedMs(): number {
    if (this.isRecording) {
      return this.elapsedBeforePause + Date.now() - this.activeSegmentStartedAt;
    }
    return this.elapsedBeforePause;
  }

  async start(
    eventId: string,
    kind: AudioClipKind,
    onDuration?: (durationMs: number) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    if (this.starting || (this.recorder && this.recorder.state !== 'inactive')) {
      throw new Error('È già in corso una registrazione audio.');
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Questo browser non supporta l’accesso al microfono. Usa un browser aggiornato in HTTPS.');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Questo browser non supporta MediaRecorder.');
    }

    const mimeType = chooseSupportedAudioMimeType((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (!mimeType) {
      throw new Error('Il browser non offre un formato di registrazione audio supportato.');
    }

    this.starting = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorder = new MediaRecorder(this.stream, { mimeType });
      this.eventId = eventId;
      this.kind = kind;
      this.startedAt = Date.now();
      this.activeSegmentStartedAt = this.startedAt;
      this.elapsedBeforePause = 0;
      this.chunks = [];
      this.exceededSizeLimit = false;
      this.recordingFailure = undefined;

      this.resultPromise = new Promise<AudioClip>((resolve, reject) => {
        this.resolveResult = resolve;
        this.rejectResult = reject;
      });
      void this.resultPromise.catch(() => undefined);

      this.recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size === 0) {
          return;
        }
        this.chunks.push(event.data);
        const currentSize = this.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        if (currentSize > MAX_RECORDING_SIZE_BYTES) {
          this.exceededSizeLimit = true;
          if (this.recorder?.state === 'recording' || this.recorder?.state === 'paused') {
            this.recorder.stop();
          }
        }
      };
      this.recorder.onerror = () => {
        this.recordingFailure = new Error('Errore durante l’acquisizione audio. La registrazione non è stata salvata.');
        onError?.(this.recordingFailure);
        if (this.recorder?.state !== 'inactive') {
          this.recorder?.stop();
        }
      };
      this.recorder.onstop = () => {
        void this.persistRecording().catch((error: unknown) => {
          const normalized = error instanceof Error ? error : new Error('Impossibile salvare la registrazione.');
          this.rejectResult?.(normalized);
          onError?.(normalized);
        });
      };

      this.recorder.start(1000);
      this.durationTimer = setInterval(() => {
        const duration = this.elapsedMs;
        onDuration?.(duration);
      }, 250);
    } catch (error) {
      this.releaseStream();
      throw error;
    } finally {
      this.starting = false;
    }
  }

  pause(): void {
    if (this.recorder?.state === 'recording' && this.recorder.pause) {
      this.elapsedBeforePause += Date.now() - this.activeSegmentStartedAt;
      this.recorder.pause();
    }
  }

  resume(): void {
    if (this.recorder?.state === 'paused' && this.recorder.resume) {
      this.activeSegmentStartedAt = Date.now();
      this.recorder.resume();
    }
  }

  stop(): Promise<AudioClip> {
    if (!this.recorder || this.recorder.state === 'inactive' || !this.resultPromise) {
      return Promise.reject(new Error('Non c’è una registrazione audio attiva.'));
    }
    this.elapsedBeforePause = this.elapsedMs;
    this.clearTimer();
    this.recorder.stop();
    return this.resultPromise;
  }

  cancel(): void {
    this.clearTimer();
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.chunks = [];
    this.releaseStream();
    this.recorder = undefined;
  }

  private async persistRecording(): Promise<void> {
    this.clearTimer();
    this.releaseStream();

    if (this.recordingFailure) {
      throw this.recordingFailure;
    }
    if (this.exceededSizeLimit) {
      throw new Error('La registrazione ha superato il limite di 50 MB e non è stata salvata.');
    }

    const mimeType = this.recorder?.mimeType || this.chunks[0]?.type || 'application/octet-stream';
    const blob = new Blob(this.chunks, { type: mimeType });
    if (blob.size === 0) {
      throw new Error('La registrazione è vuota e non può essere salvata.');
    }
    if (!globalThis.crypto?.subtle) {
      throw new Error('Web Crypto non è disponibile: impossibile verificare l’integrità della registrazione.');
    }

    const sha256 = await calculateSha256(blob);
    const createdAt = new Date(this.startedAt).toISOString();
    const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const clip: AudioClip = {
      id: crypto.randomUUID(),
      eventId: this.eventId,
      kind: this.kind,
      blob,
      fileName: `${this.kind}-${createdAt.replace(/[:.]/g, '-')}.${extension}`,
      mimeType,
      sizeBytes: blob.size,
      durationMs: this.elapsedBeforePause,
      createdAt,
      sha256,
      origin: 'microphone',
      device: {
        platform: navigator.platform,
      },
    };

    await this.repository.save(clip);
    this.chunks = [];
    this.recorder = undefined;
    this.resolveResult?.(clip);
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }

  private clearTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = undefined;
    }
  }
}
