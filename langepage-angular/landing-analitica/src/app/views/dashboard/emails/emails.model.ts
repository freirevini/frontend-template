import { TRAFFIC_SERIES } from '../dashboard-charts-data';

/** Classification suggested for a norma in the e-mail. */
export type SuggestedClass = 'Aplicável' | 'Aplicável parcialmente' | 'Não aplicável';

export const SUGGESTED_CLASSES: readonly SuggestedClass[] = ['Aplicável', 'Aplicável parcialmente', 'Não aplicável'];

/** Answer shown in the "Aplicável ao segmento?" column for each suggested class. */
export const APPLICABILITY_LABELS: Readonly<Record<SuggestedClass, string>> = {
  'Aplicável': 'Sim',
  'Aplicável parcialmente': 'Parcialmente',
  'Não aplicável': 'Não'
};

export interface SuggestedNorma {
  /** Full identifier, e.g. "Resolução CMN 4.855" (used to count distinct normas). */
  code: string;
  /** Issuing body, e.g. "CMN", "BCB". */
  orgao: string;
  /** Act type, e.g. "Resolução", "Circular", "Instrução Normativa". */
  tipo: string;
  /** Act number as published, e.g. "4.855". */
  numero: string;
  /** Theme (Tema). */
  title: string;
  /** Suggested applicability to the e-mail's segment. */
  suggestedClass: SuggestedClass;
  /** Area and Diretoria responsible for the norma. */
  area: string;
  diretoria: string;
}

/** One e-mail sent with classification suggestions; all its normas belong to the e-mail's segment. */
export interface SuggestionEmail {
  id: string;
  /** ISO 8601 with offset, as sent (e.g. 2021-12-28T09:14:00-03:00). */
  sentAt: string;
  subject: string;
  /** Business segment id (same ids as the Tráfego series and the segment cards). */
  segment: string;
  recipients: number;
  normas: SuggestedNorma[];
}

export interface EmailsData {
  asOf: string;
  emails: SuggestionEmail[];
}

/** Segment ids that an e-mail may carry: the business series of the Tráfego chart (all but "Normas a Classificar"). */
export const EMAIL_SEGMENT_IDS: readonly string[] = TRAFFIC_SERIES.slice(0, -1).map((series) => series.id);

const SENT_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Throws a descriptive error when the payload does not match the contract; returns it unchanged otherwise. */
export function validateEmails(data: EmailsData): EmailsData {
  if (!data || !Array.isArray(data.emails)) {
    throw new Error('Emails payload without "emails".');
  }
  const ids = new Set<string>();
  for (const email of data.emails) {
    if (!email.id || ids.has(email.id)) {
      throw new Error(`Email without a unique id: ${email.id}`);
    }
    ids.add(email.id);
    if (!SENT_AT.test(email.sentAt ?? '') || isNaN(new Date(email.sentAt).getTime())) {
      throw new Error(`Email ${email.id} has an invalid sentAt: ${email.sentAt}`);
    }
    if (!EMAIL_SEGMENT_IDS.includes(email.segment)) {
      throw new Error(`Email ${email.id} has an unknown segment: ${email.segment}`);
    }
    if (!(email.recipients >= 0)) {
      throw new Error(`Email ${email.id} has an invalid recipients count.`);
    }
    if (!Array.isArray(email.normas) || email.normas.length === 0) {
      throw new Error(`Email ${email.id} has no normas.`);
    }
    for (const norma of email.normas) {
      const fields = [norma.code, norma.orgao, norma.tipo, norma.numero, norma.area, norma.diretoria];
      if (fields.some((value) => !value) || !SUGGESTED_CLASSES.includes(norma.suggestedClass)) {
        throw new Error(`Email ${email.id} has an invalid norma: ${norma.code}`);
      }
    }
  }
  return data;
}
