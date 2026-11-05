import { SEGMENT_IDS_V1_ORDER, segmentFromV1, SegmentoV1 } from '../../dashboard/v1-domains';
import type { SegmentCard, SegmentCardsData } from './segment-cards.service';

/** `GET /v1/segmentos` → `SegmentosResposta` (docs/contratos/openapi-agenda-normativa-v1.yaml). */
export interface SegmentoV1Item {
  id: SegmentoV1;
  nome: string;
  total: number;
  aClassificar: number;
  tendencia: number[];
}

export interface SegmentosRespostaV1 {
  dataReferencia: string;
  segmentos: SegmentoV1Item[];
}

/** The BFF sends no icon: the front picks it by segment (same icons as the mock). */
export const SEGMENT_ICONS: Readonly<Record<string, string>> = {
  atacado: 'cilTruck',
  corporativo: 'cilBuilding',
  plataforma: 'cilDevices',
  varejo: 'cilCart'
};

/**
 * Contract v1 → SegmentCardsData (docs/contratos-de-dados.md section 11.1): ids to the front domain, icon by id, cards in
 * the alphabetical order of the segments whatever the order received. validateSegmentCards runs after it.
 */
export function fromSegmentosV1(response: SegmentosRespostaV1): SegmentCardsData {
  if (!response || !Array.isArray(response.segmentos)) {
    throw new Error('Segments payload without "segmentos".');
  }
  const segments: SegmentCard[] = response.segmentos.map((item) => {
    const id = segmentFromV1(item.id);
    return { id, label: item.nome, icon: SEGMENT_ICONS[id], total: item.total, toClassify: item.aClassificar, trend: item.tendencia ?? [] };
  });
  segments.sort((a, b) => SEGMENT_IDS_V1_ORDER.indexOf(a.id) - SEGMENT_IDS_V1_ORDER.indexOf(b.id));
  return { asOf: response.dataReferencia, segments };
}
