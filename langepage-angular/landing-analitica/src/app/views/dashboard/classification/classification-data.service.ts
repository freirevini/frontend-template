import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { DataPage, SpringPage } from '../../../core/http/api-page';
import { ApiService } from '../../../core/services/api.service';
import {
  fromPaginaNormasV1,
  fromResumoNormasV1,
  NormaClassificadaV1,
  normasPageParams,
  ResumoNormasClassificadasV1,
  summaryParams
} from './classification.adapter';
import { aggregateClassification, ClassificationAggregate, ClassificationSummaryQuery, NormasQuery, pageClassified } from './classification-derive';
import { ClassificationData, ClassifiedNorma, validateClassification } from './classification.model';

/** What the classification blocks ask for: a page of the Tabela Analítica and the summary of the pie and themes list. */
export interface ClassificationQueries {
  getNormasPage(query: NormasQuery): Observable<DataPage<ClassifiedNorma>>;
  getSummary(query: ClassificationSummaryQuery): Observable<ClassificationAggregate>;
}

/**
 * Mock mode of ClassificationQueries over the full payload: the same filters, sort, paging and aggregates the BFF
 * applies, computed locally. The service uses it with the mock file; specs with a fixture.
 */
export function localClassificationQueries(load: () => Observable<ClassificationData>): ClassificationQueries {
  return {
    getNormasPage: (query) => load().pipe(map((data) => pageClassified(data.normas, query))),
    getSummary: ({ bounds, ...filters }) => load().pipe(map((data) => aggregateClassification(data.normas, bounds, filters)))
  };
}

/**
 * Classification of the normas (pie, themes list, Tabela Analítica). Runtime config `dataMock` (assets/env.json) picks
 * the source: true = static mock `assets/data/dashboard-classificacao.json`, paged and aggregated locally; false = the
 * BFF contract v1 through ApiService (rule R4): `GET /v1/normas-classificadas` (one page) and
 * `GET /v1/normas-classificadas/resumo`, converted by classification.adapter.ts. validateClassification runs on both.
 */
@Injectable({ providedIn: 'root' })
export class ClassificationDataService implements ClassificationQueries {
  private readonly mockUrl = 'assets/data/dashboard-classificacao.json';
  private readonly data$: Observable<ClassificationData>;
  private readonly local = localClassificationQueries(() => this.getClassification());

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly api: ApiService
  ) {
    // One request per session (mock mode only); an error is not cached, so the next call retries.
    this.data$ = this.http.get<ClassificationData>(this.mockUrl).pipe(map(validateClassification), shareReplay({ bufferSize: 1, refCount: false }));
  }

  /** Full mock payload (mock mode only). */
  getClassification(): Observable<ClassificationData> {
    return this.data$;
  }

  getNormasPage(query: NormasQuery): Observable<DataPage<ClassifiedNorma>> {
    if (this.runtimeConfig.config.dataMock) {
      return this.local.getNormasPage(query);
    }
    return this.api.get<SpringPage<NormaClassificadaV1>>('/normas-classificadas', normasPageParams(query)).pipe(
      map(fromPaginaNormasV1),
      map((page) => ({ ...page, items: validateClassification({ asOf: '', normas: page.items }).normas }))
    );
  }

  getSummary(query: ClassificationSummaryQuery): Observable<ClassificationAggregate> {
    if (this.runtimeConfig.config.dataMock) {
      return this.local.getSummary(query);
    }
    return this.api.get<ResumoNormasClassificadasV1>('/normas-classificadas/resumo', summaryParams(query)).pipe(map(fromResumoNormasV1));
  }
}
