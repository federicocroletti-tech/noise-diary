export type AudioClipKind = 'event' | 'background';

export interface AudioClip {
  id: string;
  eventId: string;
  kind: AudioClipKind;
  blob: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  createdAt: string;
  sha256: string;
  origin: 'microphone';
  device: {
    platform: string;
  };
}

export type AudioClipMetadata = Omit<AudioClip, 'blob'>;
