import { DataPage, fromSpringPage, SpringPage } from '../../../core/http/api-page';
import { rangeParams, segmentFromV1, segmentToV1, SegmentoV1 } from '../v1-domains';
import type { ClassificationAggregate, ClassificationSummaryQuery, NormasQuery, NormasSortKey } from './classification-derive';
import type { ClassifiedNorma } from './classification.model';

/** `NormaClassificada` of docs/contratos/openapi-agenda-normativa-v1.yaml. */
export interface NormaClassificadaV1 {
  codigo: string;
  orgao: string;
  tipo: string;
  numero: string;
  dataClassificacao: string;
  segmento: SegmentoV1;
  tema: string;
  aplicavel: boolean;
  area: string;
  diretoria: string;
}

export interface TemaQuantidadeV1 {
  tema: string;
  quantidade: number;
}

/** `GET /v1/normas-classificadas/resumo` → `ResumoNormasClassificadas`. */
export interface ResumoNormasClassificadasV1 {
  dataReferencia: string;
  total: number;
  aplicaveis: number;
  naoAplicaveis: number;
  totalTemas: number;
  temas: TemaQuantidadeV1[];
  outrosTemas?: { quantidade: number; temasAgrupados: number } | null;
}

/** Front sort key → field of `sort` (pattern OrdenacaoNormas of the contract). */
export const NORMAS_SORT_FIELDS: Readonly<Record<NormasSortKey, string>> = {
  classifiedAt: 'dataClassificacao',
  orgao: 'orgao',
  tipo: 'tipo',
  numero: 'numero',
  theme: 'tema',
  segment: 'segmento',
  applicable: 'aplicavel',
  area: 'area',
  diretoria: 'diretoria'
};

type Params = Record<string, string | number | boolean | string[]>;

/**
 * Query of `GET /v1/normas-classificadas`: period, the page filters that are set, page, size and the sort on screen with
 * the same ties as the mock (newest first, then `codigo`; at most 3 `sort` items, as the contract allows).
 */
export function normasPageParams(query: NormasQuery): Params {
  const field = NORMAS_SORT_FIELDS[query.sort.key];
  const sort = [`${field},${query.sort.direction}`];
  if (field !== 'dataClassificacao') {
    sort.push('dataClassificacao,desc');
  }
  sort.push('codigo,asc');
  const params: Params = { ...rangeParams(query.bounds), page: query.page, size: query.size, sort };
  if (query.segment !== null) {
    params['segmento'] = segmentToV1(query.segment);
  }
  if (query.applicable !== null) {
    params['aplicavel'] = query.applicable;
  }
  if (query.theme !== null) {
    params['tema'] = query.theme;
  }
  return params;
}

/** Query of `GET /v1/normas-classificadas/resumo`: period, segment, theme and the class whose themes are ranked. */
export function summaryParams(query: ClassificationSummaryQuery): Params {
  const params: Params = { ...rangeParams(query.bounds), temasDe: query.themesOf === false ? 'NAO_APLICAVEIS' : 'APLICAVEIS' };
  if (query.segment) {
    params['segmento'] = segmentToV1(query.segment);
  }
  if (query.theme) {
    params['tema'] = query.theme;
  }
  return params;
}

/** One `NormaClassificada` → ClassifiedNorma (docs/contratos-de-dados.md section 11.3). */
export function fromNormaClassificadaV1(item: NormaClassificadaV1): ClassifiedNorma {
  return {
    code: item.codigo,
    orgao: item.orgao,
    tipo: item.tipo,
    numero: item.numero,
    classifiedAt: item.dataClassificacao,
    segment: segmentFromV1(item.segmento),
    theme: item.tema,
    applicable: item.aplicavel,
    area: item.area,
    diretoria: item.diretoria
  };
}

/** `PaginaNormasClassificadas` → page of ClassifiedNorma (validateClassification runs on the items afterwards). */
export function fromPaginaNormasV1(page: SpringPage<NormaClassificadaV1>): DataPage<ClassifiedNorma> {
  return fromSpringPage(page, fromNormaClassificadaV1);
}

/**
 * `ResumoNormasClassificadas` → ClassificationAggregate: counts as received; shares, bar widths and the "Outros temas"
 * row computed as aggregateClassification does for the mock (same screen).
 */
export function fromResumoNormasV1(resumo: ResumoNormasClassificadasV1): ClassificationAggregate {
  if (!resumo || !Array.isArray(resumo.temas)) {
    throw new Error('Classification summary without "temas".');
  }
  const { total, aplicaveis, naoAplicaveis, totalTemas } = resumo;
  const share = (count: number) => (totalTemas ? count / totalTemas : 0);
  const largest = Math.max(1, ...resumo.temas.map((item) => item.quantidade));
  const others = resumo.outrosTemas;
  return {
    total,
    applicable: aplicaveis,
    notApplicable: naoAplicaveis,
    applicableShare: total ? aplicaveis / total : 0,
    themesTotal: totalTemas,
    themes: resumo.temas.map((item) => ({ label: item.tema, count: item.quantidade, share: share(item.quantidade), width: item.quantidade / largest, grouped: 0 })),
    others: others ? { label: 'Outros temas', count: others.quantidade, share: share(others.quantidade), width: 0, grouped: others.temasAgrupados } : null
  };
}
