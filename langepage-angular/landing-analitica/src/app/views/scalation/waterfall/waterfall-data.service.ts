import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { ApiService } from '../../../core/services/api.service';
import { DateRange, DEFAULT_TRAFFIC_RANGE, presetRange, TrafficPeriod } from '../../dashboard/period/period-range';
import { periodParams } from '../../dashboard/v1-domains';
import { CascataResultadoV1, fromCascataV1 } from './waterfall.adapter';
import { deriveWaterfall } from './waterfall-derive';
import { WaterfallData } from './waterfall.model';

/**
 * Waterfall data. Runtime config `dataMock` (assets/env.json) picks the source: true = static mock (annual base in
 * `assets/data/dashboard-waterfall.json`, derived per period by deriveWaterfall); false = `GET /v1/cascatas-resultado`
 * through ApiService (rule R4) and the adapter fromCascataV1. The mock is only requested in mock mode.
 */
@Injectable({ providedIn: 'root' })
export class WaterfallDataService {
  private readonly mockUrl = 'assets/data/dashboard-waterfall.json';
  private readonly base$: Observable<WaterfallData>;

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly api: ApiService
  ) {
    // One request per session; an error is not cached, so the next call retries.
    this.base$ = this.http.get<WaterfallData>(this.mockUrl).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  /** Waterfall for the granularity and date range, derived deterministically from the annual base. */
  getWaterfall(
    period: TrafficPeriod = 'Month',
    bounds: DateRange = presetRange('Month', DEFAULT_TRAFFIC_RANGE.Month)
  ): Observable<WaterfallData> {
    if (!this.runtimeConfig.config.dataMock) {
      return this.api
        .get<CascataResultadoV1>('/cascatas-resultado', periodParams(period, bounds))
        .pipe(map((response) => fromCascataV1(response, period, bounds)));
    }
    return this.base$.pipe(map((base) => deriveWaterfall(base, period, bounds)));
  }
}
