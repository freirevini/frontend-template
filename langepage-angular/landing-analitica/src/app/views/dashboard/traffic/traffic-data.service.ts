import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { ApiService } from '../../../core/services/api.service';
import { DateRange, TrafficPeriod } from '../period/period-range';
import { periodParams } from '../v1-domains';
import { fromNormativosRecebidosV1, NormativosRecebidosV1 } from './traffic.adapter';

/** Classified and still-to-classify normas of one segment, one value per point of the chart. */
export interface TrafficSegmentSeries {
  /** Front segment id (`atacado`...). */
  segment: string;
  label: string;
  classified: number[];
  toClassify: number[];
}

/** Data of the "Normativos Recebidos" chart for a granularity and a date range. */
export interface TrafficResponse {
  period: TrafficPeriod;
  /** First and last day asked for, yyyy-MM-dd. */
  start: string;
  end: string;
  /** One key per point of the x axis (yyyy-MM-dd, yyyy-MM or yyyy); the labels come from buildTrafficPeriod. */
  points: string[];
  /** In TRAFFIC_SERIES order. */
  segments: TrafficSegmentSeries[];
}

/**
 * "Normativos Recebidos" series. With runtime config `dataMock` true the chart keeps its in-memory mock values
 * (DashboardChartsData.initMainChart) and this service is not called; false = `GET /v1/normativos-recebidos` through
 * ApiService (rule R4) and the adapter fromNormativosRecebidosV1.
 */
@Injectable({ providedIn: 'root' })
export class TrafficDataService {
  constructor(private readonly runtimeConfig: RuntimeConfigService, private readonly api: ApiService) {}

  /** True while the data blocks read local mocks (assets/env.json `dataMock`). */
  get mock(): boolean {
    return this.runtimeConfig.config.dataMock;
  }

  getTraffic(period: TrafficPeriod, bounds: DateRange): Observable<TrafficResponse> {
    return this.api.get<NormativosRecebidosV1>('/normativos-recebidos', periodParams(period, bounds)).pipe(map(fromNormativosRecebidosV1));
  }
}
