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
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

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
  template: `
    <div class="card">
      <h3 class="card__title">
        Dashboard
        <span class="card__badge card__badge--onpush">OnPush</span>
        <span class="card__badge card__badge--good">Efficient</span>
      </h3>
      <p class="card__desc">
        An OnPush component with signal-driven state. Every 800ms one metric
        updates. Only the changed metric flashes — the others stay clean.
        Contrast with the Counter above.
      </p>

      <div class="dashboard__controls">
        <button class="btn" (click)="toggleRunning()">
          {{ running() ? '⏸ Pause' : '▶ Resume' }}
        </button>
        <span class="dashboard__tick">Tick #{{ tickCount() }}</span>
      </div>

      <div class="dashboard__grid" role="list" aria-label="Live metrics">
        @for (metric of metrics(); track metric.id) {
          <div
            class="metric"
            role="listitem"
            [attr.aria-label]="metric.label + ': ' + metric.value + ' ' + metric.unit"
          >
            <div class="metric__label">{{ metric.label }}</div>
            <div class="metric__value">
              {{ metric.value }}
              <span class="metric__unit">{{ metric.unit }}</span>
            </div>
            <div
              class="metric__trend"
              [class.metric__trend--up]="metric.trend === 'up'"
              [class.metric__trend--down]="metric.trend === 'down'"
              aria-hidden="true"
            >
              {{ metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '—' }}
            </div>
          </div>
        }
      </div>

      <div class="dashboard__summary">
        Average: <strong>{{ average() | number:'1.1-1' }}</strong> across {{ metrics().length }} metrics
      </div>
    </div>
  `,
  styles: [`
    .card { background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card__title { margin: 0 0 8px; color: #c9d1d9; font-size: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .card__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
    .card__badge--onpush { background: #1f6feb22; color: #58a6ff; border: 1px solid #1f6feb44; }
    .card__badge--good { background: #3fb95022; color: #3fb950; border: 1px solid #3fb95044; }
    .card__desc { color: #8b949e; font-size: 12px; margin: 0 0 12px; line-height: 1.5; }
    .dashboard__controls { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .dashboard__tick { color: #8b949e; font-size: 11px; }
    .btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; border-radius: 6px; padding: 5px 12px; cursor: pointer; font-size: 12px; }
    .btn:hover { background: #30363d; }
    .btn:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
    .dashboard__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px; }
    .metric { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 4px; }
    .metric__label { color: #8b949e; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric__value { color: #c9d1d9; font-size: 20px; font-weight: 700; display: flex; align-items: baseline; gap: 4px; }
    .metric__unit { font-size: 11px; font-weight: 400; color: #8b949e; }
    .metric__trend { font-size: 10px; color: #8b949e; }
    .metric__trend--up { color: #3fb950; }
    .metric__trend--down { color: #f85149; }
    .dashboard__summary { color: #8b949e; font-size: 12px; }
    .dashboard__summary strong { color: #c9d1d9; }
  `],
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
    DashboardComponent.INITIAL_METRICS.map(m => ({ ...m }))
  );
  protected readonly tickCount = signal(0);
  protected readonly running = signal(true);

  protected readonly average = computed(() => {
    const vals = this.metrics().map(m => m.value);
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
    this.tickCount.update(n => n + 1);

    // Update one random metric per tick
    this.metrics.update(metrics => {
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
