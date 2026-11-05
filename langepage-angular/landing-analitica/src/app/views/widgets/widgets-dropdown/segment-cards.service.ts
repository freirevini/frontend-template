import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, share } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { ApiService } from '../../../core/services/api.service';
import { fromSegmentosV1, SegmentosRespostaV1 } from './segment-cards.adapter';

/** One segment card of the Triagent page (Atacado, Corporativo, Plataforma, Varejo). */
export interface SegmentCard {
  id: string;
  label: string;
  /** Icon name from src/app/icons/icon-subset.ts. */
  icon: string;
  /** Normas of the segment. */
  total: number;
  /** Normas of the segment still to classify now (same scale as the "Normas a Classificar" line per segment). */
  toClassify: number;
  /** Sparkline values, oldest first. */
  trend: number[];
}

export interface SegmentCardsData {
  /** Reference date of the snapshot (yyyy-MM-dd). */
  asOf: string;
  segments: SegmentCard[];
}

/** Throws a pt-BR message when a segment is inconsistent; returns the data otherwise. */
export function validateSegmentCards(data: SegmentCardsData): SegmentCardsData {
  if (!data?.segments?.length) {
    throw new Error('Nenhum segmento informado.');
  }
  for (const segment of data.segments) {
    const counts = [segment.total, segment.toClassify];
    if (counts.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error(`Quantidades inválidas no segmento "${segment.label}".`);
    }
    if (segment.toClassify > segment.total) {
      throw new Error(`Normas a classificar maiores que o total no segmento "${segment.label}".`);
    }
  }
  return data;
}

/**
 * Segment cards. Runtime config `dataMock` (assets/env.json) picks the source: true = static mock
 * `assets/data/dashboard-segments.json`; false = `GET /v1/segmentos` through ApiService (rule R4) and the adapter
 * fromSegmentosV1. validateSegmentCards runs on both.
 */
@Injectable({ providedIn: 'root' })
export class SegmentCardsService {
  private readonly mockUrl = 'assets/data/dashboard-segments.json';
  /** Request in flight per source: cards rendered together share it; once it completes, the next view asks again. */
  private shared?: { dataMock: boolean; data$: Observable<SegmentCardsData> };

  constructor(
    private readonly http: HttpClient,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly api: ApiService
  ) {}

  getSegments(): Observable<SegmentCardsData> {
    const dataMock = this.runtimeConfig.config.dataMock;
    if (this.shared?.dataMock !== dataMock) {
      const source = dataMock
        ? this.http.get<SegmentCardsData>(this.mockUrl).pipe(map(validateSegmentCards))
        : this.api.get<SegmentosRespostaV1>('/segmentos').pipe(map(fromSegmentosV1), map(validateSegmentCards));
      // share(), not shareReplay: no snapshot is cached after the response (counts change as normas get classified).
      this.shared = { dataMock, data$: source.pipe(share()) };
    }
    return this.shared.data$;
  }
}
