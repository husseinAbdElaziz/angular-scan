/**
 * CounterComponent — Default change detection strategy.
 *
 * This component uses the default CD strategy, so it is checked on EVERY tick,
 * even when nothing about it changed. You'll see it flash frequently.
 * All sibling OnPush components will appear as "unnecessary renders" (red)
 * on those same ticks.
 */
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'demo-counter',
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss',
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
    this.count.update((n) => n + 1);
  }

  protected decrement(): void {
    this.count.update((n) => n - 1);
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
