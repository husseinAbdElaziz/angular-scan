/**
 * DashboardComponent — OnPush parent containing a mix of OnPush children.
 *
 * Demonstrates the recommended pattern: an OnPush parent that only re-renders
 * when its own signal changes. Child components with OnPush won't be checked
 * unless they have dirty inputs.
 *
 * The ticker inside this component runs on setInterval and updates a signal.
 * Angular's scheduler picks this up and runs CD. Since all components here use
 * OnPush + signals, only the components that actually changed will re-render
 * (yellow). Others stay clean (no overlay flash).
 */
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

interface MetricCard {
  id: number;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

@Component({
  selector: 'demo-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [DecimalPipe],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private static readonly INITIAL_METRICS: MetricCard[] = [
    { id: 1, label: 'CPU', value: 42, unit: '%', trend: 'flat' },
    { id: 2, label: 'Memory', value: 1.8, unit: 'GB', trend: 'up' },
    { id: 3, label: 'Requests/s', value: 320, unit: 'rps', trend: 'up' },
    { id: 4, label: 'Latency', value: 24, unit: 'ms', trend: 'down' },
  ];

  protected readonly metrics = signal<MetricCard[]>(
    DashboardComponent.INITIAL_METRICS.map((m) => ({ ...m })),
  );
  protected readonly tickCount = signal(0);
  protected readonly running = signal(true);

  protected readonly average = computed(() => {
    const vals = this.metrics().map((m) => m.value);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTicker();
  }

  ngOnDestroy(): void {
    this.stopTicker();
  }

  protected toggleRunning(): void {
    if (this.running()) {
      this.stopTicker();
    } else {
      this.startTicker();
    }
  }

  private startTicker(): void {
    this.running.set(true);
    this.intervalId = setInterval(() => this.tick(), 800);
  }

  private stopTicker(): void {
    this.running.set(false);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    this.tickCount.update((n) => n + 1);

    // Update one random metric per tick
    this.metrics.update((metrics) => {
      const idx = Math.floor(Math.random() * metrics.length);
      return metrics.map((m, i) => {
        if (i !== idx) return m;
        const delta = (Math.random() - 0.4) * (m.id === 2 ? 0.3 : m.id === 4 ? 5 : 30);
        const newVal = Math.max(0, +(m.value + delta).toFixed(1));
        const trend: MetricCard['trend'] = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
        return { ...m, value: newVal, trend };
      });
    });
  }
}
