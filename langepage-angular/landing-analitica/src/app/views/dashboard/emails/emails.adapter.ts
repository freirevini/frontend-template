import { DataPage, fromSpringPage, SpringPage } from '../../../core/http/api-page';
import { buildTrafficPeriod, DateRange, TrafficPeriod } from '../period/period-range';
import { periodParams, rangeParams, segmentFromV1, segmentToV1, SegmentoV1 } from '../v1-domains';
import type { EmailsAggregate } from './emails-derive';
import { EMAIL_SEGMENT_IDS, SuggestedClass, SuggestedNorma, SuggestionEmail } from './emails.model';

/** `NormaSugerida` of docs/contratos/openapi-agenda-normativa-v1.yaml. */
export interface NormaSugeridaV1 {
  codigo: string;
  orgao: string;
  tipo: string;
  numero: string;
  tema: string;
  classeSugerida: 'APLICAVEL' | 'APLICAVEL_PARCIALMENTE' | 'NAO_APLICAVEL';
  area: string;
  diretoria: string;
}

/** `EmailSugestao` (items of `GET /v1/emails-sugestao`). */
export interface EmailSugestaoV1 {
  id: string;
  dataEnvio: string;
  assunto: string;
  segmento: SegmentoV1;
  destinatarios: number;
  normas: NormaSugeridaV1[];
}

export interface QuantidadePorSegmentoV1 {
  segmento: SegmentoV1;
  quantidade: number;
}

export interface PeriodoEmailsV1 {
  inicio: string;
  fim: string;
  emails: number;
  normasPorSegmento: QuantidadePorSegmentoV1[];
  totalNormas: number;
}

/** `GET /v1/emails-sugestao/resumo` → `ResumoEmailsSugestao`. */
export interface ResumoEmailsSugestaoV1 {
  dataReferencia: string;
  granularidade: string;
  inicio: string;
  fim: string;
  totalEmails: number;
  totalNormas: number;
  normasDistintas: number;
  mediaNormasPorEmail: number;
  normasPorSegmento: QuantidadePorSegmentoV1[];
  periodos: PeriodoEmailsV1[];
}

/** "Últimos e-mails": first page of 5, newest first (contract v1). */
export const LATEST_EMAILS_SORT = 'dataEnvio,desc';

const CLASSES: Readonly<Record<string, SuggestedClass>> = {
  APLICAVEL: 'Aplicável',
  APLICAVEL_PARCIALMENTE: 'Aplicável parcialmente',
  NAO_APLICAVEL: 'Não aplicável'
};

type Params = Record<string, string | number>;

/** Query of `GET /v1/emails-sugestao/resumo`: period with its granularity and, when filtered, the segment. */
export function emailsSummaryParams(period: TrafficPeriod, bounds: DateRange, segment: string | null): Params {
  return { ...periodParams(period, bounds), ...(segment ? { segmento: segmentToV1(segment) } : {}) };
}

/** Query of `GET /v1/emails-sugestao` for the latest e-mails of the period. */
export function latestEmailsParams(bounds: DateRange, segment: string | null, size: number): Params {
  return { ...rangeParams(bounds), ...(segment ? { segmento: segmentToV1(segment) } : {}), page: 0, size, sort: LATEST_EMAILS_SORT };
}

/** One `NormaSugerida` → SuggestedNorma (docs/contratos-de-dados.md section 11.4). */
export function fromNormaSugeridaV1(item: NormaSugeridaV1): SuggestedNorma {
  const suggestedClass = CLASSES[item.classeSugerida];
  if (!suggestedClass) {
    throw new Error(`Suggested class outside the v1 domain: ${item.classeSugerida}`);
  }
  return {
    code: item.codigo,
    orgao: item.orgao,
    tipo: item.tipo,
    numero: item.numero,
    title: item.tema,
    suggestedClass,
    area: item.area,
    diretoria: item.diretoria
  };
}

/** One `EmailSugestao` → SuggestionEmail. */
export function fromEmailSugestaoV1(item: EmailSugestaoV1): SuggestionEmail {
  return {
    id: item.id,
    sentAt: item.dataEnvio,
    subject: item.assunto,
    segment: segmentFromV1(item.segmento),
    recipients: item.destinatarios,
    normas: (item.normas ?? []).map(fromNormaSugeridaV1)
  };
}

/** `PaginaEmailsSugestao` → page of SuggestionEmail (validateEmails runs on the items afterwards). */
export function fromPaginaEmailsV1(page: SpringPage<EmailSugestaoV1>): DataPage<SuggestionEmail> {
  return fromSpringPage(page, fromEmailSugestaoV1);
}

/** Per-segment counts in EMAIL_SEGMENT_IDS order (a segment absent from the list counts 0). */
function bySegment(items: QuantidadePorSegmentoV1[]): number[] {
  const counts = EMAIL_SEGMENT_IDS.map(() => 0);
  for (const item of items ?? []) {
    counts[EMAIL_SEGMENT_IDS.indexOf(segmentFromV1(item.segmento))] += item.quantidade;
  }
  return counts;
}

/**
 * `ResumoEmailsSugestao` + the latest e-mails → EmailsAggregate, the same shape aggregateEmails gives the mock.
 * Bucket labels and subtitle come from buildTrafficPeriod for the period asked for: the BFF must send one `periodos`
 * item per point (empty ones included), otherwise the bars would shift and the adapter refuses the payload.
 */
export function fromResumoEmailsV1(resumo: ResumoEmailsSugestaoV1, latest: SuggestionEmail[], period: TrafficPeriod, bounds: DateRange): EmailsAggregate {
  if (!resumo || !Array.isArray(resumo.periodos)) {
    throw new Error('Emails summary without "periodos".');
  }
  const { labels, subtitle } = buildTrafficPeriod(period, bounds);
  if (resumo.periodos.length !== labels.length) {
    throw new Error(`Emails summary with ${resumo.periodos.length} periods for ${labels.length} points.`);
  }
  return {
    subtitle,
    buckets: resumo.periodos.map((item, index) => ({ label: labels[index], emails: item.emails, normas: bySegment(item.normasPorSegmento), total: item.totalNormas })),
    emails: resumo.totalEmails,
    normas: resumo.totalNormas,
    distinctNormas: resumo.normasDistintas,
    averagePerEmail: resumo.mediaNormasPorEmail,
    segmentNormas: bySegment(resumo.normasPorSegmento),
    list: latest
  };
}
