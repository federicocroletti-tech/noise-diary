export const NOISE_EVENT_TYPES = [
  'HUM',
  'VIBRATION',
  'IMPACT',
  'DRAGGING',
  'MUSIC',
  'VOICES',
  'SYSTEM',
  'APPLIANCE',
  'TRAFFIC',
  'UNKNOWN',
  'OTHER',
] as const;

export type NoiseEventType = (typeof NOISE_EVENT_TYPES)[number];
export const EVENT_STATUSES = ['draft', 'complete', 'to-review', 'exported', 'archived'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const CONTINUITY_TYPES = [
  'continuous',
  'intermittent',
  'impulsive',
  'periodic',
  'variable',
  'unknown',
] as const;
export type ContinuityType = (typeof CONTINUITY_TYPES)[number];
export const PERCEIVED_EFFECTS = [
  'awakening',
  'difficulty-falling-asleep',
  'activity-interruption',
  'vibration-perceived',
  'concentration-difficulty',
  'simple-observation',
  'other',
] as const;
export type PerceivedEffect = (typeof PERCEIVED_EFFECTS)[number];

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
  perceivedIntensity: number | null;
  perceivedEffects: PerceivedEffect[];
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
  perceivedEffects: PerceivedEffect;
  startedAt: string;
  durationMinutes: number | null;
  status: EventStatus;
  windowsState: string;
  doorsState: string;
  microphonePosition: string;
}

type NoiseEventCandidate = { [K in keyof NoiseEvent]?: unknown };

export function isNoiseEvent(value: unknown): value is NoiseEvent {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const event = value as NoiseEventCandidate;
  return (
    typeof event.id === 'string' &&
    event.id.length > 0 &&
    typeof event.startedAt === 'string' &&
    Number.isFinite(Date.parse(event.startedAt)) &&
    (event.endedAt === undefined ||
      (typeof event.endedAt === 'string' && Number.isFinite(Date.parse(event.endedAt)))) &&
    typeof event.createdAt === 'string' &&
    Number.isFinite(Date.parse(event.createdAt)) &&
    typeof event.updatedAt === 'string' &&
    Number.isFinite(Date.parse(event.updatedAt)) &&
    typeof event.locationLabel === 'string' &&
    typeof event.room === 'string' &&
    (event.microphonePosition === undefined || typeof event.microphonePosition === 'string') &&
    (event.windowsState === undefined || typeof event.windowsState === 'string') &&
    (event.doorsState === undefined || typeof event.doorsState === 'string') &&
    typeof event.eventType === 'string' &&
    NOISE_EVENT_TYPES.includes(event.eventType as NoiseEventType) &&
    typeof event.continuityType === 'string' &&
    CONTINUITY_TYPES.includes(event.continuityType as ContinuityType) &&
    (event.perceivedIntensity === null ||
      (typeof event.perceivedIntensity === 'number' &&
        Number.isInteger(event.perceivedIntensity) &&
        event.perceivedIntensity >= 1 &&
        event.perceivedIntensity <= 5)) &&
    Array.isArray(event.perceivedEffects) &&
    event.perceivedEffects.every(
      (effect) => typeof effect === 'string' && PERCEIVED_EFFECTS.includes(effect as PerceivedEffect),
    ) &&
    typeof event.suspectedSource === 'string' &&
    /ipotesi/i.test(event.suspectedSource) &&
    typeof event.description === 'string' &&
    typeof event.notes === 'string' &&
    (event.duration === undefined ||
      (typeof event.duration === 'number' && Number.isFinite(event.duration) && event.duration > 0)) &&
    (event.witnessesCount === undefined ||
      (typeof event.witnessesCount === 'number' &&
        Number.isInteger(event.witnessesCount) &&
        event.witnessesCount >= 0)) &&
    typeof event.status === 'string' &&
    EVENT_STATUSES.includes(event.status as EventStatus) &&
    Array.isArray(event.tags) &&
    event.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(event.attachmentIds) &&
    event.attachmentIds.every((id) => typeof id === 'string') &&
    (event.backgroundRecordingId === undefined || typeof event.backgroundRecordingId === 'string') &&
    (event.deletedAt === undefined ||
      (typeof event.deletedAt === 'string' && Number.isFinite(Date.parse(event.deletedAt))))
  );
}
