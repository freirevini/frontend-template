import { granularityFromV1, GranularidadeV1, SEGMENT_IDS_V1_ORDER, segmentFromV1, SegmentoV1 } from '../v1-domains';
import type { TrafficResponse, TrafficSegmentSeries } from './traffic-data.service';

/** `GET /v1/normativos-recebidos` → `NormativosRecebidos` (docs/contratos/openapi-agenda-normativa-v1.yaml). */
export interface SerieSegmentoV1 {
  segmento: SegmentoV1;
  nome: string;
  classificadas: number[];
  aClassificar: number[];
}

export interface NormativosRecebidosV1 {
  granularidade: GranularidadeV1;
  inicio: string;
  fim: string;
  pontos: string[];
  segmentos: SerieSegmentoV1[];
}

/**
 * Contract v1 → TrafficResponse (docs/contratos-de-dados.md section 11.2): domains to the front values, segments in
 * TRAFFIC_SERIES order (never the order received), every series as long as `pontos`.
 */
export function fromNormativosRecebidosV1(response: NormativosRecebidosV1): TrafficResponse {
  if (!response || !Array.isArray(response.pontos) || !Array.isArray(response.segmentos)) {
    throw new Error('Traffic payload without "pontos" or "segmentos".');
  }
  const points = response.pontos.length;
  const segments: TrafficSegmentSeries[] = response.segmentos.map((item) => {
    const segment = segmentFromV1(item.segmento);
    if (item.classificadas?.length !== points || item.aClassificar?.length !== points) {
      throw new Error(`Traffic series of ${segment} does not have one value per point.`);
    }
    return { segment, label: item.nome, classified: item.classificadas, toClassify: item.aClassificar };
  });
  segments.sort((a, b) => SEGMENT_IDS_V1_ORDER.indexOf(a.segment) - SEGMENT_IDS_V1_ORDER.indexOf(b.segment));
  return { period: granularityFromV1(response.granularidade), start: response.inicio, end: response.fim, points: response.pontos, segments };
}
