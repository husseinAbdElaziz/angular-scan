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
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ListItem {
  id: number;
  label: string;
  done: boolean;
}

@Component({
  selector: 'demo-item-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-list.component.html',
  styleUrl: './item-list.component.scss',
})
export class ItemListComponent {
  readonly items = input<ListItem[]>([]);

  protected readonly filter = signal('');

  protected readonly doneCount = computed(() => this.items().filter((i) => i.done).length);

  protected onFilterInput(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }
}
