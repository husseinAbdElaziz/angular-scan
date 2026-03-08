import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CounterComponent } from './components/counter/counter.component';
import { StaticDisplayComponent } from './components/static-display/static-display.component';
import { ItemListComponent, ListItem } from './components/item-list/item-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CounterComponent, StaticDisplayComponent, ItemListComponent, DashboardComponent],
  template: `
    <header class="header">
      <div class="header__inner">
        <span class="header__logo" aria-hidden="true">◉</span>
        <h1 class="header__title">angular-scan demo</h1>
        <p class="header__subtitle">
          Watch the overlay flash as components re-render.
          Yellow = render, Red = unnecessary render.
        </p>
      </div>
    </header>

    <main class="main" id="main-content">
      <div class="legend" role="note" aria-label="Overlay color legend">
        <span class="legend__item">
          <span class="legend__swatch legend__swatch--yellow" aria-hidden="true"></span>
          Render (DOM changed)
        </span>
        <span class="legend__item">
          <span class="legend__swatch legend__swatch--red" aria-hidden="true"></span>
          Unnecessary render (DOM unchanged)
        </span>
      </div>

      <div class="grid">
        <!-- Default CD: re-renders on every tick, makes siblings look wasted -->
        <demo-counter />

        <!-- OnPush with no changing inputs: always unnecessary when parent ticks -->
        <demo-static-display />

        <!-- OnPush with signal input: re-renders when parent passes new array ref -->
        <demo-item-list [items]="currentItems()" />

        <!-- OnPush + signals: efficient, only changed metrics re-render -->
        <demo-dashboard />
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #0d1117; }
    .header { background: #161b22; border-bottom: 1px solid #30363d; padding: 20px; }
    .header__inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .header__logo { font-size: 24px; color: #58a6ff; }
    .header__title { margin: 0; font-size: 18px; color: #c9d1d9; font-family: ui-monospace, monospace; }
    .header__subtitle { margin: 0; color: #8b949e; font-size: 12px; flex-basis: 100%; }
    .main { max-width: 900px; margin: 0 auto; padding: 20px; }
    .legend { display: flex; gap: 20px; margin-bottom: 16px; }
    .legend__item { display: flex; align-items: center; gap: 6px; color: #8b949e; font-size: 12px; }
    .legend__swatch { display: inline-block; width: 16px; height: 16px; border-radius: 3px; border: 2px solid; }
    .legend__swatch--yellow { border-color: rgba(255,200,0,0.9); background: rgba(255,200,0,0.1); }
    .legend__swatch--red { border-color: rgba(255,60,60,0.9); background: rgba(255,60,60,0.1); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; }
  `],
})
export class App {
  // Items array is intentionally recreated as a new reference each time
  // to demonstrate the OnPush "new reference" pitfall with ItemListComponent
  private readonly _items: ListItem[] = [
    { id: 1, label: 'Review PR #42', done: true },
    { id: 2, label: 'Write unit tests', done: false },
    { id: 3, label: 'Update angular-scan docs', done: false },
    { id: 4, label: 'Deploy to staging', done: false },
    { id: 5, label: 'Performance audit', done: true },
  ];

  // computed() returns the same array reference → no unnecessary re-renders
  // Switch to signal(() => [...this._items]) to see the problem!
  protected readonly currentItems = computed<ListItem[]>(() => this._items);
}
