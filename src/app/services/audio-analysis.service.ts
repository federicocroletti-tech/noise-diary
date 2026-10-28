import { Injectable } from '@angular/core';
import { AudioAnalysis, FrequencyBand, NoiseEvent } from '../domain/noise-event.model';
import { SAMPLE_EVENTS } from '../data/sample-events';

@Injectable({ providedIn: 'root' })
export class AudioAnalysisService {
  seedDemoEvents(): NoiseEvent[] {
    return SAMPLE_EVENTS;
  }

  buildBands(event: NoiseEvent | null): FrequencyBand[] {
    if (!event) {
      return [];
    }

    const baseIntensity = Math.min(100, Math.max(15, event.perceivedIntensity * 12));
    const labels = ['31 Hz', '63 Hz', '125 Hz', '250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz', '8 kHz'];

    return labels.map((label, index) => {
      const harmonic = Math.sin((index + 1) * 0.9 + event.startedAt.length) * 16;
      const intensity = Math.min(100, Math.max(12, baseIntensity + harmonic + index * 4));

      return {
        label,
        amplitude: Math.round(intensity),
      };
    });
  }

  createAnalysis(event: NoiseEvent): AudioAnalysis {
    return {
      id: `analysis-${event.id}`,
      eventId: event.id,
      createdAt: new Date().toISOString(),
      sampleRate: 44100,
      dominantFrequencies: [63, 250, 1000],
      bands: this.buildBands(event),
      notes: 'Analisi informativa, eseguita in browser su un campione sintetico per demo.',
    };
  }
}
