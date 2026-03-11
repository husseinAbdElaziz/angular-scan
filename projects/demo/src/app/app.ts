import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CounterComponent } from './components/counter/counter.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ItemListComponent, ListItem } from './components/item-list/item-list.component';
import { StaticDisplayComponent } from './components/static-display/static-display.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CounterComponent, StaticDisplayComponent, ItemListComponent, DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
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
