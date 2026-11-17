import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NoiseEvent } from '../domain/noise-event.model';
import { MapContext } from './map-context.service';

const PLAN_KEY = 'noise-diary.floor-plan';
const MAX_SIDE = 1600;

@Component({
  selector: 'app-floor-map',
  imports: [CommonModule],
  template: `
    <section class="panel map-page">
      <div class="map-toolbar">
        <h2>Mappa della casa</h2>
        <label class="secondary upload">
          {{ plan() ? 'Cambia planimetria' : 'Carica planimetria' }}
          <input type="file" accept="image/*" class="visually-hidden" (change)="onPlanFile($event)" />
        </label>
        <button *ngIf="plan()" type="button" class="danger" (click)="removePlan()">Rimuovi</button>
      </div>
      <p class="hint" *ngIf="!plan()">
        Carica un’immagine della planimetria (resta solo su questo dispositivo), poi posiziona gli episodi.
      </p>
      <p class="hint" *ngIf="placingId() as id">
        Clicca sulla planimetria per posizionare l’episodio selezionato.
      </p>

      <div class="map-layout" *ngIf="plan() as src">
        <div class="plan" [class.placing]="placingId()" (click)="onPlanClick($event)">
          <img [src]="src" alt="Planimetria della casa" draggable="false" />
          <button
            *ngFor="let event of placed()"
            type="button"
            class="pin"
            [class.active]="event.id === placingId()"
            [style.left.%]="event.planX! * 100"
            [style.top.%]="event.planY! * 100"
            [style.background]="color(event)"
            [attr.title]="event.locationLabel + ' · ' + (event.startedAt | date: 'dd MMM HH:mm')"
            (click)="$event.stopPropagation(); placingId.set(event.id)"
          ></button>
        </div>

        <ul class="event-side">
          <li *ngFor="let event of visible()" [class.active]="event.id === placingId()">
            <div>
              <strong>{{ event.locationLabel || 'Episodio' }}</strong>
              <small>{{ event.room }} · {{ event.startedAt | date: 'dd MMM yyyy, HH:mm' }}</small>
            </div>
            <button type="button" class="secondary" (click)="placingId.set(event.id)">
              {{ event.planX === undefined ? 'Posiziona' : 'Sposta' }}
            </button>
            <button *ngIf="event.planX !== undefined" type="button" class="secondary" (click)="clear(event)">
              Togli
            </button>
          </li>
          <li *ngIf="!visible().length" class="hint">Nessun episodio nel diario.</li>
        </ul>
      </div>
    </section>
  `,
  styles: `
    .map-page { display: grid; gap: 16px; }
    .map-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .map-toolbar h2 { margin: 0; margin-right: auto; }
    .upload { cursor: pointer; padding: 10px 16px; border-radius: 12px; }
    .hint { color: var(--muted); margin: 0; }
    .map-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .plan { position: relative; line-height: 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .plan.placing { cursor: crosshair; outline: 2px solid var(--accent); }
    .plan img { width: 100%; height: auto; display: block; user-select: none; }
    .pin { position: absolute; width: 20px; height: 20px; padding: 0; border-radius: 50%; border: 2px solid #fff;
      transform: translate(-50%, -50%); cursor: pointer; }
    .pin.active { outline: 3px solid var(--accent); }
    .event-side { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-height: 70vh; overflow: auto; }
    .event-side li { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between;
      border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
    .event-side li.active { border-color: var(--accent); }
    .event-side small { display: block; color: var(--muted); }
    @media (max-width: 800px) { .map-layout { grid-template-columns: 1fr; } }
  `,
})
export class FloorMap {
  private readonly context = inject(MapContext);

  protected readonly plan = signal<string | null>(localStorage.getItem(PLAN_KEY));
  protected readonly placingId = signal<string | null>(null);
  protected readonly visible = computed(() => this.context.events().filter((event) => !event.deletedAt));
  protected readonly placed = computed(() =>
    this.visible().filter((event) => event.planX !== undefined && event.planY !== undefined),
  );

  protected color(event: NoiseEvent): string {
    const intensity = event.perceivedIntensity ?? 0;
    return ['#64748b', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'][intensity];
  }

  protected async onPlanClick(mouse: MouseEvent): Promise<void> {
    const id = this.placingId();
    if (!id) {
      return;
    }
    const rect = (mouse.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (mouse.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (mouse.clientY - rect.top) / rect.height));
    this.placingId.set(null);
    await this.context.placeEvent(id, x, y);
  }

  protected clear(event: NoiseEvent): Promise<void> {
    return this.context.placeEvent(event.id, null, null);
  }

  protected async onPlanFile(input: Event): Promise<void> {
    const file = (input.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    try {
      localStorage.setItem(PLAN_KEY, dataUrl);
    } catch {
      // Spazio insufficiente: la planimetria resta disponibile solo per questa sessione.
    }
    this.plan.set(dataUrl);
  }

  protected removePlan(): void {
    localStorage.removeItem(PLAN_KEY);
    this.plan.set(null);
  }
}
