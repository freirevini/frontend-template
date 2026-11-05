import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  OnInit
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { getStyle } from '@coreui/utils';
import { ChartjsComponent } from '@coreui/angular-chartjs';

import { SegmentCard, SegmentCardsService } from './segment-cards.service';
import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { RowComponent, ColComponent, WidgetStatAComponent, TemplateIdDirective } from '@coreui/angular';
import { DecimalPipe } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';

// Sparkline strokes over the .brand-stat-card gradient (canvas cannot read CSS): white points, 60% white line.
const WHITE = `rgb(${getStyle('--cui-white-rgb') || '255, 255, 255'})`;
const LINE = `rgba(${getStyle('--cui-white-rgb') || '255, 255, 255'}, .6)`;

@Component({
    selector: 'app-widgets-dropdown',
    templateUrl: './widgets-dropdown.component.html',
    styleUrls: ['./widgets-dropdown.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    imports: [RowComponent, ColComponent, WidgetStatAComponent, TemplateIdDirective, IconDirective, ChartjsComponent, DecimalPipe, ApiErrorTextComponent]
})
export class WidgetsDropdownComponent implements OnInit, AfterContentInit, OnDestroy {

  @HostBinding('class.tone-petrol') get isPetrol(): boolean {
    return this.tone === 'petrol';
  }

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private segmentCardsService: SegmentCardsService
  ) {}

  /** Segment whose "a classificar" filter is active on the page (highlighted card), or null. */
  @Input() activeSegment: string | null = null;
  /** Color model of the cards: brand blue (default) or petrol (brand cyan-high to navy). */
  @Input() tone: 'primary' | 'petrol' = 'primary';
  /** When false the "a classificar" badge is plain text (pages without the segment filter). */
  @Input() filterable = true;
  /** Emits the segment id when its "a classificar" badge is clicked (the page toggles the filter). */
  @Output() readonly toClassifySelect = new EventEmitter<string>();

  /** Segment cards (mock in src/assets/data/dashboard-segments.json until the BFF contract exists). */
  segments: SegmentCard[] = [];
  loadError = false;
  /** Error of the last load (pt-BR text and support code by ApiErrorTextComponent). */
  loadProblem: unknown = null;
  private readonly destroy$ = new Subject<void>();

  data: any[] = [];
  options: any[] = [];
  labels = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril'
  ];
  optionsDefault = {
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        },
        // Chart.js 4: the axis line moved from grid.drawBorder to border.display.
        border: {
          display: false
        },
        ticks: {
          display: false
        }
      },
      y: {
        min: 30,
        max: 89,
        display: false,
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 1,
        tension: 0.4
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 4
      }
    }
  };

  ngOnInit(): void {
    this.segmentCardsService.getSegments().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ segments }) => {
        this.segments = segments;
        this.loadError = false;
        this.setData();
      },
      error: (error) => {
        console.error('[segment-cards] failed to load', error);
        this.segments = [];
        this.loadError = true;
        this.loadProblem = error;
      }
    });
  }

  selectToClassify(segmentId: string): void {
    this.toClassifySelect.emit(segmentId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** One white sparkline per segment, from its trend values. */
  private datasetFor(segment: SegmentCard) {
    return [{
      label: `Normas · ${segment.label}`,
      backgroundColor: 'transparent',
      borderColor: LINE,
      pointBackgroundColor: WHITE,
      pointHoverBorderColor: WHITE,
      data: segment.trend
    }];
  }

  ngAfterContentInit(): void {
    this.changeDetectorRef.detectChanges();

  }

  setData() {
    this.data = this.segments.map((segment) => ({
      labels: this.labels.slice(0, segment.trend.length),
      datasets: this.datasetFor(segment)
    }));
    this.setOptions();
  }

  setOptions() {
    this.options = [];
    for (let idx = 0; idx < this.segments.length; idx++) {
      const options = JSON.parse(JSON.stringify(this.optionsDefault));
      // Same line-with-points sparkline on every card: only the vertical range follows each card's data,
      // padded so the line and its points stay inside the card.
      const values: number[] = this.segments[idx].trend;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      options.scales.y.min = Math.floor(min - range * 0.3);
      options.scales.y.max = Math.ceil(max + range * 0.15);
      this.options.push(options);
    }
  }
}
