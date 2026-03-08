/**
 * CounterComponent — Default change detection strategy.
 *
 * This component uses the default CD strategy, so it is checked on EVERY tick,
 * even when nothing about it changed. You'll see it flash frequently.
 * All sibling OnPush components will appear as "unnecessary renders" (red)
 * on those same ticks.
 */
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'demo-counter',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="card">
      <h3 class="card__title">
        Counter
        <span class="card__badge card__badge--default">Default CD</span>
      </h3>
      <p class="card__desc">
        Uses <code>ChangeDetectionStrategy.Default</code>. Angular checks this
        component on every tick, making all sibling OnPush components appear as
        unnecessary renders (red).
      </p>
      <div class="counter">
        <button class="btn" (click)="decrement()" aria-label="Decrement">−</button>
        <span class="counter__value" aria-live="polite" aria-label="Count: {{ count() }}">
          {{ count() }}
        </span>
        <button class="btn" (click)="increment()" aria-label="Increment">+</button>
      </div>
      <div class="card__actions">
        <button class="btn btn--secondary" (click)="toggleAuto()">
          {{ autoRunning() ? 'Stop Auto' : 'Start Auto' }}
        </button>
        <span class="card__hint">Auto: every {{ intervalMs }}ms</span>
      </div>
    </div>
  `,
  styles: [`
    .card { background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card__title { margin: 0 0 8px; color: #c9d1d9; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .card__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
    .card__badge--default { background: #ffa65722; color: #ffa657; border: 1px solid #ffa65744; }
    .card__desc { color: #8b949e; font-size: 12px; margin: 0 0 12px; line-height: 1.5; }
    .counter { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .counter__value { font-size: 28px; font-weight: 700; color: #58a6ff; min-width: 50px; text-align: center; }
    .btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 16px; transition: background 0.15s; }
    .btn:hover { background: #30363d; }
    .btn:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
    .btn--secondary { font-size: 12px; }
    .card__actions { display: flex; align-items: center; gap: 10px; }
    .card__hint { color: #8b949e; font-size: 11px; }
  `],
})
export class CounterComponent implements OnInit, OnDestroy {
  protected readonly count = signal(0);
  protected readonly autoRunning = signal(false);
  protected readonly intervalMs = 500;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopAuto();
  }

  protected increment(): void {
    this.count.update(n => n + 1);
  }

  protected decrement(): void {
    this.count.update(n => n - 1);
  }

  protected toggleAuto(): void {
    if (this.autoRunning()) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  }

  private startAuto(): void {
    this.autoRunning.set(true);
    this.intervalId = setInterval(() => this.increment(), this.intervalMs);
  }

  private stopAuto(): void {
    this.autoRunning.set(false);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
