import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanRoom, PlanStore } from './plan-store';

export interface PlanPoint {
  x: number;
  y: number;
  planId?: string;
}

@Component({
  selector: 'app-plan-point-picker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="point-picker" aria-labelledby="plan-point-title">
      <div>
        <h3 id="plan-point-title">Da dove hai sentito il rumore?</h3>
        <p class="hint">
          Facoltativo: seleziona un punto sulla planimetria. Il punto viene salvato nell’episodio;
          il PDF resta su questo dispositivo.
        </p>
      </div>

      <p *ngIf="loading()" class="hint">Caricamento della planimetria…</p>
      <p *ngIf="error()" class="hint error" role="alert">{{ error() }}</p>
      <p *ngIf="!loading() && !error() && !rooms().length" class="hint">
        Nessuna planimetria disponibile. <a routerLink="/mappa">Apri Mappa per caricarne una.</a>
      </p>

      <ng-container *ngIf="room() as current">
        <label *ngIf="rooms().length > 1" class="room-select">
          <span>Locale</span>
          <select [value]="current.id" (change)="selectRoom($any($event.target).value)">
            <option *ngFor="let item of rooms()" [value]="item.id">{{ item.label }}</option>
          </select>
        </label>

        <p *ngIf="pointOnAnotherRoom(current.id)" class="hint">
          Il punto attuale è su {{ pointRoomLabel() }}. Seleziona un punto qui per sostituirlo.
        </p>

        <div
          class="plan"
          role="button"
          tabindex="0"
          [attr.aria-label]="'Seleziona il punto di origine percepita su ' + current.label"
          (click)="selectPoint($event)"
          (keydown)="onPlanKeydown($event)"
        >
          <img [src]="imageUrl()" [alt]="'Planimetria: ' + current.label" draggable="false" />
          <span
            *ngIf="hasPointOnRoom(current.id)"
            class="pin"
            [style.left.%]="point()?.x! * 100"
            [style.top.%]="point()?.y! * 100"
            aria-hidden="true"
          ></span>
        </div>

        <div class="point-actions">
          <span *ngIf="hasPointOnRoom(current.id)" class="hint">Punto selezionato.</span>
          <button *ngIf="point()" type="button" class="secondary" (click)="clearPoint()">
            Rimuovi punto
          </button>
        </div>
      </ng-container>
    </section>
  `,
  styles: `
    .point-picker {
      display: grid;
      gap: 10px;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 1rem;
    }
    .hint {
      margin: 0;
      color: var(--muted);
    }
    .hint.error {
      color: #ef4444;
    }
    .room-select {
      display: grid;
      gap: 4px;
      max-width: 24rem;
    }
    .plan {
      position: relative;
      width: 100%;
      line-height: 0;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
      cursor: crosshair;
    }
    .plan:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    .plan img {
      width: 100%;
      height: auto;
      display: block;
      user-select: none;
    }
    .pin {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #fff;
      background: var(--accent);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 2px #172033;
    }
    .point-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
  `,
})
export class PlanPointPicker implements OnDestroy, OnInit {
  @Output() readonly pointChange = new EventEmitter<PlanPoint | null>();

  protected readonly rooms = signal<PlanRoom[]>([]);
  protected readonly roomId = signal('');
  protected readonly imageUrl = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly point = signal<PlanPoint | null>(null);

  private objectUrl: string | null = null;

  @Input()
  set initialPoint(value: PlanPoint | null) {
    this.point.set(value);
    if (value?.planId && value.planId !== this.roomId()) {
      this.roomId.set(value.planId);
      if (this.rooms().length) {
        this.updateImageUrl();
      }
    }
  }

  protected readonly room = computed(
    () => this.rooms().find((item) => item.id === this.roomId()) ?? null,
  );

  async ngOnInit(): Promise<void> {
    try {
      const stored = await PlanStore.load();
      const rooms = stored?.rooms ?? [];
      this.rooms.set(rooms);
      const initialRoomId = this.point()?.planId;
      this.roomId.set(rooms.find((item) => item.id === initialRoomId)?.id ?? rooms[0]?.id ?? '');
      this.updateImageUrl();
    } catch {
      this.error.set('Impossibile leggere la planimetria salvata su questo dispositivo.');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.revokeImageUrl();
  }

  protected selectRoom(id: string): void {
    this.roomId.set(id);
    this.updateImageUrl();
  }

  protected selectPoint(event: MouseEvent): void {
    const room = this.room();
    const image = (event.currentTarget as HTMLElement).querySelector('img');
    const rect = image?.getBoundingClientRect();
    if (!room || !rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }
    this.setPoint({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      planId: room.id,
    });
  }

  protected onPlanKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const room = this.room();
      if (room) {
        this.setPoint({ x: 0.5, y: 0.5, planId: room.id });
      }
    }
  }

  protected clearPoint(): void {
    this.setPoint(null);
  }

  protected hasPointOnRoom(roomId: string): boolean {
    const point = this.point();
    return !!point && (point.planId ?? this.rooms()[0]?.id) === roomId;
  }

  protected pointOnAnotherRoom(roomId: string): boolean {
    const point = this.point();
    return !!point && (point.planId ?? this.rooms()[0]?.id) !== roomId;
  }

  protected pointRoomLabel(): string {
    const point = this.point();
    const roomId = point?.planId ?? this.rooms()[0]?.id;
    return this.rooms().find((room) => room.id === roomId)?.label ?? 'un altro locale';
  }

  private setPoint(point: PlanPoint | null): void {
    this.point.set(point);
    this.pointChange.emit(point);
  }

  private updateImageUrl(): void {
    this.revokeImageUrl();
    const room = this.room();
    if (room) {
      this.objectUrl = URL.createObjectURL(room.image);
      this.imageUrl.set(this.objectUrl);
    } else {
      this.imageUrl.set('');
    }
  }

  private revokeImageUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
