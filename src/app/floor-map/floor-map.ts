import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoiseEvent } from '../domain/noise-event.model';
import { MapContext } from './map-context.service';
import { PlanCropper } from './plan-cropper';
import { analyzePlanPdf, cropPlanRoom } from './plan-analyzer';
import { PlanCrop, PlanRoom, PlanStore } from './plan-store';

const GEO_KEY = 'noise-diary.map-georef';
const DEV_PLAN_URL = 'dev-local/planimetria-dev.pdf';

@Component({
  selector: 'app-floor-map',
  imports: [CommonModule, FormsModule, PlanCropper],
  template: `
    <section class="panel map-page">
      <div class="map-toolbar">
        <label *ngIf="rooms().length" class="room-select">
          <span class="visually-hidden">Locale</span>
          <select [ngModel]="roomId()" (ngModelChange)="roomId.set($event); placingId.set(null)">
            <option *ngFor="let room of rooms()" [value]="room.id">{{ room.label }}</option>
          </select>
        </label>
        <h2>Mappa della casa</h2>
        <label class="secondary upload">
          {{ rooms().length ? 'Cambia PDF' : 'Carica planimetria (PDF)' }}
          <input type="file" accept="application/pdf" hidden (change)="onPlanFile($event)" />
        </label>
        <button *ngIf="rooms().length" type="button" class="secondary" (click)="startCrop()">Ritaglia locale</button>
        <button *ngIf="rooms().length" type="button" class="danger" (click)="removePlan()">Rimuovi</button>
      </div>

      <p class="hint" *ngIf="busy()">Analisi del PDF in corso…</p>
      <p class="hint error" *ngIf="error() as message">{{ message }}</p>
      <p class="hint" *ngIf="!rooms().length && !busy()">
        Carica il PDF della planimetria (un file per volta, resta solo su questo dispositivo): riconosco appartamento,
        cantina, solaio e box e li mostro uno alla volta.
      </p>

      <app-plan-cropper
        *ngIf="cropPdf() as pdf"
        [pdf]="pdf"
        [initial]="room()?.crop ?? null"
        (confirm)="saveCrop($event)"
        (cancel)="cropPdf.set(null)"
      />

      <div class="filters" *ngIf="rooms().length">
        <label>Dal <input type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" /></label>
        <label>Al <input type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" /></label>
        <button *ngIf="dateFrom() || dateTo()" type="button" class="secondary" (click)="dateFrom.set(''); dateTo.set('')">
          Azzera periodo
        </button>
        <label class="geo">
          <input type="checkbox" [ngModel]="geoEnabled()" (ngModelChange)="setGeo($event)" />
          Georeferenzia gli episodi
        </label>
      </div>
      <p class="hint" *ngIf="placingId()">Clicca sulla planimetria per indicare da dove hai sentito il rumore.</p>

      <div class="map-layout" *ngIf="room() as current" [style.display]="cropPdf() ? 'none' : null">

        <div class="plan" [class.placing]="placingId()" (click)="onPlanClick($event)">
          <img [src]="imageUrl()" [alt]="'Planimetria: ' + current.label" draggable="false" />
          <ng-container *ngIf="geoEnabled()">
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
          </ng-container>
        </div>

        <ul class="event-side">
          <li *ngFor="let event of visible()" [class.active]="event.id === placingId()">
            <div>
              <strong>{{ event.locationLabel || 'Episodio' }}</strong>
              <small>{{ event.room }} · {{ event.startedAt | date: 'dd MMM yyyy, HH:mm' }}</small>
              <small *ngIf="isElsewhere(event)">Posizionato su: {{ roomLabel(event.planId) }}</small>
            </div>
            <ng-container *ngIf="geoEnabled()">
              <button type="button" class="secondary" (click)="placingId.set(event.id)">
                {{ event.planX === undefined ? 'Posiziona' : 'Sposta' }}
              </button>
              <button *ngIf="event.planX !== undefined" type="button" class="secondary" (click)="clear(event)">
                Togli
              </button>
            </ng-container>
          </li>
          <li *ngIf="!visible().length" class="hint">Nessun episodio nel periodo selezionato.</li>
        </ul>
      </div>
    </section>
  `,
  styles: `
    .map-page { display: grid; gap: 16px; }
    .map-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .map-toolbar h2 { margin: 0; margin-right: auto; }
    .room-select select { min-width: 200px; }
    .upload { cursor: pointer; padding: 10px 16px; border-radius: 12px; }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .geo { margin-left: auto; display: flex; gap: 6px; align-items: center; }
    .hint { color: var(--muted); margin: 0; }
    .hint.error { color: #ef4444; }
    .map-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .plan { position: relative; line-height: 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; }
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

  protected readonly rooms = signal<PlanRoom[]>([]);
  protected readonly roomId = signal('');
  protected readonly imageUrl = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly placingId = signal<string | null>(null);
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly geoEnabled = signal(localStorage.getItem(GEO_KEY) === '1');
  protected readonly cropPdf = signal<Blob | null>(null);

  protected readonly room = computed(() => this.rooms().find((room) => room.id === this.roomId()) ?? null);
  protected readonly visible = computed(() => {
    const from = this.dateFrom() ? new Date(`${this.dateFrom()}T00:00:00`).getTime() : -Infinity;
    const to = this.dateTo() ? new Date(`${this.dateTo()}T23:59:59.999`).getTime() : Infinity;
    return this.context
      .events()
      .filter((event) => !event.deletedAt)
      .filter((event) => {
        const time = Date.parse(event.startedAt);
        return time >= from && time <= to;
      });
  });
  protected readonly placed = computed(() =>
    this.visible().filter((event) => event.planX !== undefined && event.planY !== undefined && !this.isElsewhere(event)),
  );

  constructor() {
    effect((onCleanup) => {
      const room = this.room();
      if (!room) {
        this.imageUrl.set('');
        return;
      }
      const url = URL.createObjectURL(room.image);
      this.imageUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
    void this.restore();
  }

  private async restore(): Promise<void> {
    try {
      const stored = await PlanStore.load();
      if (stored) {
        this.setRooms(stored.rooms);
      } else if (isDevMode()) {
        await this.loadDevPlan();
      }
    } catch {
      this.error.set('Impossibile leggere la planimetria salvata su questo dispositivo.');
    }
  }

  // Solo sviluppo: simula una planimetria già caricata in passato (il PDF locale non è nella build di produzione).
  private async loadDevPlan(): Promise<void> {
    const response = await fetch(DEV_PLAN_URL);
    if (response.ok && (response.headers.get('content-type') ?? '').includes('pdf')) {
      await this.importPdf(new File([await response.blob()], 'planimetria-dev.pdf', { type: 'application/pdf' }));
    }
  }

  private setRooms(rooms: PlanRoom[]): void {
    this.rooms.set(rooms);
    this.roomId.set(rooms[0]?.id ?? '');
  }

  private async importPdf(file: File): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const rooms = await analyzePlanPdf(file);
      await PlanStore.save({ fileName: file.name, savedAt: new Date().toISOString(), pdf: file, rooms });
      this.setRooms(rooms);
    } catch {
      this.error.set('Non riesco a leggere questo PDF. Controlla che sia una planimetria valida.');
    } finally {
      this.busy.set(false);
    }
  }

  protected setGeo(value: boolean): void {
    this.geoEnabled.set(value);
    localStorage.setItem(GEO_KEY, value ? '1' : '0');
    if (!value) {
      this.placingId.set(null);
    }
  }

  protected roomLabel(planId?: string): string {
    return this.rooms().find((room) => room.id === planId)?.label ?? 'altro locale';
  }

  // Gli episodi senza locale (inseriti prima delle planimetrie multiple) valgono per il primo locale.
  protected isElsewhere(event: NoiseEvent): boolean {
    return (event.planId ?? this.rooms()[0]?.id) !== this.roomId() && event.planX !== undefined;
  }

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
    await this.context.placeEvent(id, x, y, this.roomId());
  }

  protected clear(event: NoiseEvent): Promise<void> {
    return this.context.placeEvent(event.id, null, null);
  }

  protected async onPlanFile(input: Event): Promise<void> {
    const element = input.target as HTMLInputElement;
    const file = element.files?.[0];
    element.value = '';
    if (file) {
      await this.importPdf(file);
    }
  }

  protected async removePlan(): Promise<void> {
    await PlanStore.clear();
    this.setRooms([]);
  }

  protected async startCrop(): Promise<void> {
    const stored = await PlanStore.load();
    if (stored) {
      this.cropPdf.set(stored.pdf);
    }
  }

  // Il ritaglio manuale sostituisce l'immagine del locale, usando la pagina originale salvata sul dispositivo.
  protected async saveCrop(crop: PlanCrop): Promise<void> {
    const id = this.roomId();
    const stored = await PlanStore.load();
    this.cropPdf.set(null);
    if (!stored) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const cropped = await cropPlanRoom(stored.pdf, crop);
      const rooms = stored.rooms.map((room) => (room.id === id ? { ...room, crop, ...cropped } : room));
      await PlanStore.save({ ...stored, rooms });
      this.rooms.set(rooms);
    } catch {
      this.error.set('Non riesco a ritagliare il locale da questa planimetria.');
    } finally {
      this.busy.set(false);
    }
  }
}
