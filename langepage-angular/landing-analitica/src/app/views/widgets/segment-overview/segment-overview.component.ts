import { Component, OnDestroy, OnInit } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { getStyle } from '@coreui/utils';

import { TRAFFIC_SERIES } from '../../dashboard/dashboard-charts-data';
import { SegmentCard, SegmentCardsService } from '../widgets-dropdown/segment-cards.service';
import { ApiErrorTextComponent } from '../../../core/http/api-error-text.component';
import { RowComponent, ColComponent, WidgetStatDComponent } from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';

/** One figure under a card header (shape of the CoreUI <c-widget-stat-d> values). */
export interface SegmentOverviewValue {
  title: string;
  value: string;
}

export interface SegmentOverviewCard {
  segment: SegmentCard;
  /** Segment color token, the same one the charts use (light/dark values in src/scss/_brand.scss and _theme-dark.scss). */
  colorVar: string;
  values: SegmentOverviewValue[];
  chart: ChartData<'line', number[], string>;
}

/** Same sparkline labels as the Triagent segment cards, so both tooltips read the same. */
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const numberFormat = new Intl.NumberFormat('pt-BR');

/** Translucent white for the sparkline over the colored header (canvas cannot read CSS). */
function white(alpha: number): string {
  return `rgba(${getStyle('--cui-white-rgb') || '255, 255, 255'}, ${alpha})`;
}

/**
 * "Início": one overview card per business segment (Atacado, Corporativo, Plataforma, Varejo) with the segment icon and
 * name on a header in the segment's chart color, its trend as an area sparkline and two figures (normas, a classificar).
 * Same data as the Triagent segment cards (SegmentCardsService).
 */
@Component({
    selector: 'app-segment-overview',
    templateUrl: './segment-overview.component.html',
    styleUrls: ['./segment-overview.component.scss'],
    imports: [RowComponent, ColComponent, WidgetStatDComponent, IconDirective, ChartjsComponent, ApiErrorTextComponent]
})
export class SegmentOverviewComponent implements OnInit, OnDestroy {
  cards: SegmentOverviewCard[] = [];
  loadError = false;
  /** Error of the last load (pt-BR text and support code by ApiErrorTextComponent). */
  loadProblem: unknown = null;

  readonly chartOptions: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4,
        hoverBorderWidth: 3
      }
    }
  };

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly segmentCardsService: SegmentCardsService) {}

  ngOnInit(): void {
    this.segmentCardsService.getSegments().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ segments }) => {
        this.cards = segments.map((segment) => this.toCard(segment));
        this.loadError = false;
      },
      error: (error) => {
        console.error('[segment-overview] failed to load', error);
        this.cards = [];
        this.loadError = true;
        this.loadProblem = error;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toCard(segment: SegmentCard): SegmentOverviewCard {
    return {
      segment,
      colorVar: TRAFFIC_SERIES.find((series) => series.id === segment.id)?.colorVar ?? '--brand-primary',
      values: [
        { title: 'normas', value: numberFormat.format(segment.total) },
        { title: 'a classificar', value: numberFormat.format(segment.toClassify) }
      ],
      chart: {
        labels: MONTHS.slice(0, segment.trend.length),
        datasets: [{
          label: `Normas · ${segment.label}`,
          data: segment.trend,
          fill: true,
          backgroundColor: white(0.12),
          borderColor: white(0.6),
          pointBackgroundColor: white(0.6),
          pointHoverBackgroundColor: white(1)
        }]
      }
    };
  }
}
