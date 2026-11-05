import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, shareReplay } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { SpringPage } from '../../../core/http/api-page';
import { ApiService } from '../../../core/services/api.service';
import { DateRange, TrafficPeriod } from '../period/period-range';
import {
  EmailSugestaoV1,
  emailsSummaryParams,
  fromPaginaEmailsV1,
  fromResumoEmailsV1,
  latestEmailsParams,
  ResumoEmailsSugestaoV1
} from './emails.adapter';
import { aggregateEmails, EmailsAggregate } from './emails-derive';
import { EmailsData, validateEmails } from './emails.model';

/** Latest e-mails listed under the chart (first page of `GET /v1/emails-sugestao`). */
export const LATEST_EMAILS_PAGE = 5;

/** Inputs of the e-mails card: its own period and the page segment filter. */
export interface EmailsQuery {
  period: TrafficPeriod;
  bounds: DateRange;
  segment: string | null;
}

/** What the e-mails card asks for: indicators, bars and latest e-mails of a period. */
export interface EmailsQueries {
  getAggregate(query: EmailsQuery): Observable<EmailsAggregate>;
}

/** Mock mode of EmailsQueries over the full payload (aggregateEmails); the service uses it with the mock file, specs with a fixture. */
export function localEmailQueries(load: () => Observable<EmailsData>): EmailsQueries {
  return { getAggregate: ({ period, bounds, segment }) => load().pipe(map((data) => aggregateEmails(data.emails, period, bounds, segment))) };
}

/**
 * E-mails with classification suggestions. Runtime config `dataMock` (assets/env.json) picks the source: true = static
 * mock `assets/data/dashboard-emails.json`, aggregated locally; false = the BFF contract v1 through ApiService (rule R4):
 * `GET /v1/emails-sugestao/resumo` (indicators and bars) and `GET /v1/emails-sugestao` (latest 5, newest first), converted
 * by emails.adapter.ts. validateEmails runs on the e-mails of both.
 */
@Injectable({ providedIn: 'root' })
export class EmailsDataService implements EmailsQueries {
  private readonly mockUrl = 'assets/data/dashboard-emails.json';
  private readonly emails$: Observable<EmailsData>;
  private readonly local = localEmailQueries(() => this.getEmails());

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly api: ApiService
  ) {
    // One request per session (mock mode only); an error is not cached, so the next call retries.
    this.emails$ = this.http.get<EmailsData>(this.mockUrl).pipe(map(validateEmails), shareReplay({ bufferSize: 1, refCount: false }));
  }

  /** Full mock payload (mock mode only). */
  getEmails(): Observable<EmailsData> {
    return this.emails$;
  }

  getAggregate(query: EmailsQuery): Observable<EmailsAggregate> {
    if (this.runtimeConfig.config.dataMock) {
      return this.local.getAggregate(query);
    }
    const { period, bounds, segment } = query;
    return forkJoin({
      resumo: this.api.get<ResumoEmailsSugestaoV1>('/emails-sugestao/resumo', emailsSummaryParams(period, bounds, segment)),
      page: this.api.get<SpringPage<EmailSugestaoV1>>('/emails-sugestao', latestEmailsParams(bounds, segment, LATEST_EMAILS_PAGE))
    }).pipe(
      map(({ resumo, page }) => {
        const latest = validateEmails({ asOf: resumo.dataReferencia, emails: fromPaginaEmailsV1(page).items }).emails;
        return fromResumoEmailsV1(resumo, latest, period, bounds);
      })
    );
  }
}
