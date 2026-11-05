import { Directive, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { catchError, EMPTY, Observable, Subject, switchMap, takeUntil } from 'rxjs';

import { TRAFFIC_SERIES } from '../dashboard-charts-data';
import { buildTrafficPeriod, DEFAULT_TRAFFIC_RANGE, DateRange, presetRange, TrafficPeriod } from '../period/period-range';
import { ClassificationAggregate, ClassificationFilters } from './classification-derive';
import { ClassificationDataService } from './classification-data.service';

export type ClassificationState = 'loading' | 'ready' | 'error';

const numberFormat = new Intl.NumberFormat('pt-BR');
const percentFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/**
 * Shared state of the classification cards (applicability pie, themes list, Tabela Analítica). They have no period filter
 * of their own: period, dates and segment come from the Tráfego card through the inputs. Clicking a value of one card
 * cross-filters the other: the page keeps `applicabilityFilter`/`themeFilter` and passes them to both.
 * Every input change asks the data service again (`request`); a newer request cancels the one in flight. The data
 * service answers from the mock or from the BFF (runtime config `dataMock`); the card does not know which.
 */
@Directive()
export abstract class ClassificationViewBase<T> implements OnInit, OnChanges, OnDestroy {
  /** Tráfego granularity (only used for the period subtitle). */
  @Input() period: TrafficPeriod = 'Month';
  /** Tráfego dates: only normas classified inside them count. */
  @Input() bounds: DateRange = presetRange('Month', DEFAULT_TRAFFIC_RANGE.Month);
  /** Page filter from the segment cards: only this segment's normas count, or null for all. */
  @Input() segmentFilter: string | null = null;
  /** Cross filter from the pie: true = Aplicáveis, false = Não aplicáveis, null = none. */
  @Input() applicabilityFilter: boolean | null = null;
  /** Cross filter from the themes list, or null. */
  @Input() themeFilter: string | null = null;

  /** Clicked slice or legend item of the pie (the page toggles the filter). */
  @Output() readonly applicabilitySelect = new EventEmitter<boolean>();
  /** Clicked theme of the list (the page toggles the filter). */
  @Output() readonly themeSelect = new EventEmitter<string>();

  state: ClassificationState = 'loading';
  aggregate?: ClassificationAggregate;
  subtitle = '';
  /** Error of the last load (pt-BR text and support code by ApiErrorTextComponent). */
  loadProblem: unknown = null;

  protected readonly destroy$ = new Subject<void>();
  private readonly requests$ = new Subject<void>();

  protected constructor(protected readonly dataService: ClassificationDataService) {}

  ngOnInit(): void {
    this.requests$
      .pipe(
        switchMap(() =>
          this.request().pipe(
            catchError((error) => {
              console.error('[classification] failed to load data', error);
              this.loadProblem = error;
              this.state = 'error';
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        this.loadProblem = null;
        this.state = 'ready';
        this.receive(result);
      });
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = ['period', 'bounds', 'segmentFilter', 'applicabilityFilter', 'themeFilter'].some((key) => changes[key] && !changes[key].firstChange);
    if (changed) {
      this.onFiltersChange();
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filterLabel(): string {
    const series = this.segmentFilter ? TRAFFIC_SERIES.find((item) => item.id === this.segmentFilter) : undefined;
    return series?.label ?? '';
  }

  formatNumber(value: number): string {
    return numberFormat.format(value);
  }

  formatPercent(value: number): string {
    return percentFormat.format(value);
  }

  /** Filters this card applies to the data (each card ignores the filter it sets itself). */
  protected abstract filters(): ClassificationFilters;

  /** Called after every recalculation (e.g. to rebuild a chart). */
  protected onAggregate(): void {}

  /** Called when an input filter changes, before the new request (e.g. back to the first page). */
  protected onFiltersChange(): void {}

  /** What the card asks the data service for: the summary (pie, themes list) or a page (Tabela Analítica). */
  protected abstract request(): Observable<T>;

  /** Applies a successful answer. */
  protected abstract receive(result: T): void;

  /** Summary for this card's filters (pie and themes list). */
  protected summary(): Observable<ClassificationAggregate> {
    return this.dataService.getSummary({ bounds: this.bounds, segment: this.segmentFilter, ...this.filters() });
  }

  /** Stores the summary and lets the card redraw. */
  protected applySummary(aggregate: ClassificationAggregate): void {
    this.aggregate = aggregate;
    this.onAggregate();
  }

  /** New subtitle and a new request for the current inputs. */
  protected refresh(): void {
    this.subtitle = buildTrafficPeriod(this.period, this.bounds).subtitle;
    this.requests$.next();
  }
}
