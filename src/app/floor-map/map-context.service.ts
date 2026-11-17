import { Injectable, signal } from '@angular/core';
import { NoiseEvent } from '../domain/noise-event.model';

@Injectable({ providedIn: 'root' })
export class MapContext {
  readonly events = signal<NoiseEvent[]>([]);
  placeEvent: (id: string, x: number | null, y: number | null) => Promise<void> = async () => undefined;
}
