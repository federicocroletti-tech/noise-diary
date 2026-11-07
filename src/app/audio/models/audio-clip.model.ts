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

export function isAudioClipMetadata(value: unknown): value is AudioClipMetadata {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const metadata = value as Record<string, unknown>;
  const device = metadata['device'];
  return (
    typeof metadata['id'] === 'string' &&
    metadata['id'].length > 0 &&
    typeof metadata['eventId'] === 'string' &&
    metadata['eventId'].length > 0 &&
    (metadata['kind'] === 'event' || metadata['kind'] === 'background') &&
    typeof metadata['fileName'] === 'string' &&
    typeof metadata['mimeType'] === 'string' &&
    typeof metadata['sizeBytes'] === 'number' &&
    Number.isSafeInteger(metadata['sizeBytes']) &&
    metadata['sizeBytes'] >= 0 &&
    typeof metadata['durationMs'] === 'number' &&
    Number.isFinite(metadata['durationMs']) &&
    metadata['durationMs'] >= 0 &&
    typeof metadata['createdAt'] === 'string' &&
    Number.isFinite(Date.parse(metadata['createdAt'])) &&
    typeof metadata['sha256'] === 'string' &&
    /^[a-f0-9]{64}$/i.test(metadata['sha256']) &&
    metadata['origin'] === 'microphone' &&
    device !== null &&
    typeof device === 'object' &&
    'platform' in device &&
    typeof device.platform === 'string'
  );
}
