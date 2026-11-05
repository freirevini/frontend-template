import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { ClassificationDataService } from './classification-data.service';
import { ClassificationAggregate, ClassificationFilters, ThemeShare } from './classification-derive';
import { ClassificationViewBase } from './classification-view.base';
import { CardComponent, CardBodyComponent, SpinnerComponent } from '@coreui/angular';


/**
 * "Temas das normas aplicáveis": sorted horizontal bars (HTML) with count and share of the applicable normas,
 * the tail summed in a text-only "Outros temas" row. Follows the Tráfego period and the segment filter; the slice picked in
 * the pie switches the list to that class (applicable or not). Clicking a theme narrows the pie to it.
 */
@Component({
    selector: 'app-themes-list',
    templateUrl: './themes-list.component.html',
    imports: [CardComponent, CardBodyComponent, SpinnerComponent, ApiErrorTextComponent]
})
export class ThemesListComponent extends ClassificationViewBase<ClassificationAggregate> {
  constructor(dataService: ClassificationDataService) {
    super(dataService);
  }

  /** Class whose themes are listed: Não aplicáveis only when that slice is picked. */
  get listsNotApplicable(): boolean {
    return this.applicabilityFilter === false;
  }

  isDimmed(theme: ThemeShare): boolean {
    return this.themeFilter !== null && this.themeFilter !== theme.label;
  }

  select(theme: ThemeShare): void {
    this.themeSelect.emit(theme.label);
  }

  /** The list ignores its own filter (it highlights the row instead) and follows the class picked in the pie. */
  protected request(): Observable<ClassificationAggregate> {
    return this.summary();
  }

  protected receive(aggregate: ClassificationAggregate): void {
    this.applySummary(aggregate);
  }

  protected filters(): ClassificationFilters {
    return { themesOf: !this.listsNotApplicable };
  }

  /** Bar length in %, with a visible minimum for non-zero values. */
  barWidth(fraction: number): number {
    return fraction > 0 ? Math.max(1.5, fraction * 100) : 0;
  }
}
