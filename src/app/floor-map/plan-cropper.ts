import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { PlanCrop } from './plan-store';
import { rectBetween, renderPlanPage } from './plan-analyzer';

@Component({
  selector: 'app-plan-cropper',
  imports: [CommonModule],
  template: `
    <section class="cropper">
      <p class="hint" *ngIf="!pageUrl()">Preparazione della planimetria…</p>
      <div
        *ngIf="pageUrl()"
        class="stage"
        (pointerdown)="start($event)"
        (pointermove)="move($event)"
        (pointerup)="end()"
        (pointercancel)="end()"
      >
        <img [src]="pageUrl()" alt="Planimetria completa" draggable="false" />
        <div
          *ngIf="box() as current"
          class="box"
          [style.left.%]="current.x * 100"
          [style.top.%]="current.y * 100"
          [style.width.%]="current.w * 100"
          [style.height.%]="current.h * 100"
        ></div>
      </div>
      <p class="hint">Trascina sulla planimetria un rettangolo attorno al solo locale da mostrare.</p>
      <div class="actions">
        <button type="button" [disabled]="!box()" (click)="confirm.emit(box()!)">Salva ritaglio</button>
        <button type="button" class="secondary" (click)="cancel.emit()">Annulla</button>
      </div>
    </section>
  `,
  styles: `
    .cropper { display: grid; gap: 12px; }
    .stage { position: relative; line-height: 0; border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; background: #fff; touch-action: none; cursor: crosshair; user-select: none; }
    .stage img { width: 100%; height: auto; display: block; pointer-events: none; }
    .box { position: absolute; border: 2px dashed var(--accent); background: rgb(59 130 246 / 0.12); pointer-events: none; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .hint { color: var(--muted); margin: 0; }
  `,
})
export class PlanCropper implements OnInit {
  readonly pdf = input.required<Blob>();
  readonly initial = input<PlanCrop | null>(null);
  readonly confirm = output<PlanCrop>();
  readonly cancel = output<void>();

  protected readonly pageUrl = signal('');
  protected readonly box = signal<PlanCrop | null>(null);
  private anchor: { x: number; y: number } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.pageUrl()) {
        URL.revokeObjectURL(this.pageUrl());
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const canvas = await renderPlanPage(this.pdf());
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Rendering planimetria fallito.'))), 'image/png'),
    );
    this.pageUrl.set(URL.createObjectURL(blob));
    this.box.set(this.initial());
  }

  protected start(event: PointerEvent): void {
    const stage = event.currentTarget as HTMLElement;
    stage.setPointerCapture(event.pointerId);
    this.anchor = this.pointOn(stage, event);
    this.box.set({ x: this.anchor.x, y: this.anchor.y, w: 0, h: 0 });
  }

  protected move(event: PointerEvent): void {
    if (!this.anchor) {
      return;
    }
    this.box.set(rectBetween(this.anchor, this.pointOn(event.currentTarget as HTMLElement, event)));
  }

  protected end(): void {
    this.anchor = null;
    const current = this.box();
    if (current && (current.w < 0.02 || current.h < 0.02)) {
      this.box.set(null);
    }
  }

  private pointOn(stage: HTMLElement, event: PointerEvent): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
}
