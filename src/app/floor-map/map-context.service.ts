import { Injectable, signal } from '@angular/core';
import { NoiseEvent } from '../domain/noise-event.model';

export type SessionState = 'loading' | 'open' | 'closed';

@Injectable({ providedIn: 'root' })
export class MapContext {
  readonly events = signal<NoiseEvent[]>([]);
  /** Stato della sessione (account o profilo locale sbloccato): la mappa è accessibile solo a sessione aperta. */
  readonly sessionState = signal<SessionState>('loading');
  placeEvent: (id: string, x: number | null, y: number | null, planId?: string) => Promise<void> = async () =>
    undefined;
}
