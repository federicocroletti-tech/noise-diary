import { Injectable } from '@angular/core';
import { NoiseEvent } from '../domain/noise-event.model';

const STORAGE_KEY = 'noise-diary.events';

@Injectable({ providedIn: 'root' })
export class NoiseStorageService {
  loadEvents(): NoiseEvent[] {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (!value) {
        return [];
      }

      const parsedValue = JSON.parse(value) as NoiseEvent[];
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  saveEvents(events: NoiseEvent[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
}
