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
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'demo-static-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3 class="card__title">
        Static Display
        <span class="card__badge card__badge--onpush">OnPush</span>
        <span class="card__badge card__badge--warn">Wasted ↑</span>
      </h3>
      <p class="card__desc">
        Uses <code>ChangeDetectionStrategy.OnPush</code> but has no inputs that
        change. Angular still checks it on every parent tick → appears as a
        <strong>red (unnecessary) render</strong> in angular-scan.
      </p>
      <div class="static__content">
        <span class="static__icon" aria-hidden="true">🗿</span>
        <div>
          <div class="static__label">This content never changes</div>
          <div class="static__value">Version 1.0.0 — Build {{ buildId }}</div>
        </div>
      </div>
      <div class="static__note">
        <code>markForCheck()</code> calls: <strong>{{ markCount() }}</strong>
        <button class="btn" (click)="triggerMark()" style="margin-left:8px">
          Force markForCheck
        </button>
      </div>
    </div>
  `,
  styles: [`
    .card { background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card__title { margin: 0 0 8px; color: #c9d1d9; font-size: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .card__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
    .card__badge--onpush { background: #1f6feb22; color: #58a6ff; border: 1px solid #1f6feb44; }
    .card__badge--warn { background: #f8517322; color: #f85173; border: 1px solid #f8517344; }
    .card__desc { color: #8b949e; font-size: 12px; margin: 0 0 12px; line-height: 1.5; }
    .static__content { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; background: #161b22; border-radius: 6px; padding: 10px; }
    .static__icon { font-size: 24px; }
    .static__label { color: #8b949e; font-size: 11px; }
    .static__value { color: #c9d1d9; font-weight: 600; font-size: 13px; }
    .static__note { color: #8b949e; font-size: 12px; display: flex; align-items: center; }
    .btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px; }
    .btn:hover { background: #30363d; }
    .btn:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
  `],
})
export class StaticDisplayComponent {
  protected readonly buildId = '2026.03.08';
  protected readonly markCount = signal(0);

  protected triggerMark(): void {
    // Incrementing a signal does trigger a real change — just showing markForCheck concept
    this.markCount.update(n => n + 1);
  }
}
