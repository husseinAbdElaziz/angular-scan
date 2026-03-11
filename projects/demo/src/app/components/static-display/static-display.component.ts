/**
 * StaticDisplayComponent — OnPush with no inputs that change.
 *
 * This component never actually updates its DOM after the first render,
 * but when its parent (Default CD) triggers a tick, Angular walks the
 * component tree and checks it too. Since nothing changes in its template,
 * angular-scan flags it as an "unnecessary render" (red overlay).
 *
 * The fix: if this component's parent were also OnPush (or zoneless),
 * it would only be checked when its signal inputs change.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'demo-static-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './static-display.component.html',
  styleUrl: './static-display.component.scss',
})
export class StaticDisplayComponent {
  protected readonly buildId = '2026.03.08';
  protected readonly markCount = signal(0);

  protected triggerMark(): void {
    // Incrementing a signal does trigger a real change — just showing markForCheck concept
    this.markCount.update((n) => n + 1);
  }
}
