import { afterNextRender, Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-guide.html',
  styleUrl: './user-guide.scss',
})
export class UserGuide {
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('guideTitle');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
  }
}
