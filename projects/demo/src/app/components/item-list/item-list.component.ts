/**
 * ItemListComponent — OnPush with a signal input.
 *
 * The parent passes an `items` input. When the parent re-renders and passes
 * a new array reference (even with identical contents), Angular marks this
 * component dirty and re-renders it → appears as a yellow render.
 *
 * This demonstrates the classic OnPush pitfall: new object references on every
 * render defeat the purpose of OnPush.
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
} from '@angular/core';

export interface ListItem {
  id: number;
  label: string;
  done: boolean;
}

@Component({
  selector: 'demo-item-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3 class="card__title">
        Item List
        <span class="card__badge card__badge--onpush">OnPush</span>
      </h3>
      <p class="card__desc">
        Receives an <code>items</code> input. When the parent passes a new array
        reference each tick (even with same data), Angular checks this component
        → <strong>yellow render</strong>. Use <code>trackBy</code> and stable
        references to fix this.
      </p>

      <div class="list__stats">
        <span>Total: <strong>{{ items().length }}</strong></span>
        <span>Done: <strong>{{ doneCount() }}</strong></span>
      </div>

      <ul class="list" role="list" aria-label="Item list">
        @for (item of items(); track item.id) {
          <li
            class="list__item"
            [class.list__item--done]="item.done"
            role="listitem"
          >
            <span class="list__dot" aria-hidden="true">{{ item.done ? '✓' : '○' }}</span>
            {{ item.label }}
          </li>
        }
        @if (items().length === 0) {
          <li class="list__empty" role="listitem">No items</li>
        }
      </ul>

      <div class="list__filter">
        <label for="filter-input" class="list__filter-label">Filter:</label>
        <input
          id="filter-input"
          class="list__input"
          type="text"
          [value]="filter()"
          (input)="onFilterInput($event)"
          placeholder="type to filter..."
          aria-label="Filter items"
        />
      </div>
    </div>
  `,
  styles: [`
    .card { background: #1c2128; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card__title { margin: 0 0 8px; color: #c9d1d9; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .card__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
    .card__badge--onpush { background: #1f6feb22; color: #58a6ff; border: 1px solid #1f6feb44; }
    .card__desc { color: #8b949e; font-size: 12px; margin: 0 0 10px; line-height: 1.5; }
    .list__stats { display: flex; gap: 12px; margin-bottom: 8px; color: #8b949e; font-size: 12px; }
    .list__stats strong { color: #c9d1d9; }
    .list { list-style: none; margin: 0 0 10px; padding: 0; }
    .list__item { display: flex; align-items: center; gap: 8px; padding: 4px 0; color: #c9d1d9; font-size: 13px; border-bottom: 1px solid #21262d; }
    .list__item--done { color: #8b949e; text-decoration: line-through; }
    .list__dot { color: #3fb950; font-size: 12px; }
    .list__empty { color: #8b949e; font-style: italic; font-size: 12px; padding: 8px 0; }
    .list__filter { display: flex; align-items: center; gap: 8px; }
    .list__filter-label { color: #8b949e; font-size: 12px; }
    .list__input { background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; border-radius: 4px; padding: 4px 8px; font-size: 12px; flex: 1; }
    .list__input:focus { outline: 2px solid #58a6ff; outline-offset: 1px; }
  `],
})
export class ItemListComponent {
  readonly items = input<ListItem[]>([]);

  protected readonly filter = signal('');

  protected readonly doneCount = computed(() =>
    this.items().filter(i => i.done).length
  );

  protected onFilterInput(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }
}
