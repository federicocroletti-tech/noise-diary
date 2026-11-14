import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NativeFileService } from '../services/native-file.service';

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-guide.html',
  styleUrl: './user-guide.scss',
})
export class UserGuide {
  private readonly nativeFileService = inject(NativeFileService);
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('guideTitle');
  readonly downloadError = signal('');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
  }

  async downloadTemplate(event: Event): Promise<void> {
    event.preventDefault();
    this.downloadError.set('');
    try {
      const response = await fetch('./modello-importazione-diario.json');
      if (!response.ok) {
        throw new Error(`Impossibile scaricare il modello (HTTP ${response.status}).`);
      }
      await this.nativeFileService.saveOrShare(
        'modello-importazione-diario.json',
        await response.blob(),
      );
    } catch (error) {
      this.downloadError.set(
        error instanceof Error ? error.message : 'Impossibile scaricare il modello JSON.',
      );
    }
  }
}
