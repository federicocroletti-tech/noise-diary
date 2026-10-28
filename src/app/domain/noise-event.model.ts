export const NOISE_EVENT_TYPES = [
  'HUM',
  'VIBRATION',
  'IMPACT',
  'DRAGGING',
  'MUSIC',
  'VOICES',
  'SYSTEM',
] as const;

export type NoiseEventType = (typeof NOISE_EVENT_TYPES)[number];
export type EventStatus = 'draft' | 'recorded' | 'reviewed';
export type ContinuityType = 'continuous' | 'intermittent' | 'single';

export interface FrequencyBand {
  label: string;
  amplitude: number;
}

export interface AudioAttachment {
  id: string;
  eventId: string;
  kind: 'recording' | 'background' | 'analysis';
  fileName: string;
  mimeType: string;
  createdAt: string;
  sizeBytes: number;
  durationSeconds?: number;
  note?: string;
}

export interface BackgroundRecording {
  id: string;
  eventId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  sampleRate: number;
  fileName: string;
  note: string;
}

export interface AudioAnalysis {
  id: string;
  eventId: string;
  createdAt: string;
  sampleRate: number;
  dominantFrequencies: number[];
  bands: FrequencyBand[];
  notes: string;
}

export interface ExternalMeasurement {
  id: string;
  eventId: string;
  sourceName: string;
  importedAt: string;
  rawSummary: string;
  isInformativeOnly: true;
}

export interface DeviceInformation {
  id: string;
  userAgent: string;
  platform: string;
  microphoneModel?: string;
  sampleRate?: number;
}

export interface ExportRecord {
  id: string;
  exportedAt: string;
  fileName: string;
  recordCount: number;
  fileSizeBytes: number;
}

export interface ApplicationSettings {
  locale: 'it' | 'en';
  privacyMode: 'strict' | 'balanced';
  defaultRoom: string;
  reminderEnabled: boolean;
}

export interface AuditEvent {
  id: string;
  createdAt: string;
  action: string;
  description: string;
}

export interface NoiseEvent {
  id: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  locationLabel: string;
  room: string;
  microphonePosition?: string;
  windowsState?: string;
  doorsState?: string;
  eventType: NoiseEventType;
  continuityType: ContinuityType;
  perceivedIntensity: number;
  perceivedEffects: string[];
  suspectedSource: string;
  description: string;
  notes: string;
  witnessesCount?: number;
  status: EventStatus;
  tags: string[];
  attachmentIds: string[];
  backgroundRecordingId?: string;
  deletedAt?: string;
}

export interface NoiseEventDraft {
  locationLabel: string;
  room: string;
  eventType: NoiseEventType;
  continuityType: ContinuityType;
  perceivedIntensity: number;
  suspectedSource: string;
  description: string;
  notes: string;
  tags: string;
  perceivedEffects: string;
  windowsState: string;
  doorsState: string;
  microphonePosition: string;
}
