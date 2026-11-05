import { TRAFFIC_SERIES } from '../dashboard-charts-data';

/** One norma after the analyst's classification: applicable to the bank or not, with its theme. */
export interface ClassifiedNorma {
  /** Full identifier, e.g. "Resolução CMN 4.855". */
  code: string;
  /** Issuing body, e.g. "CMN", "BCB". */
  orgao: string;
  /** Act type, e.g. "Resolução", "Circular", "Instrução Normativa". */
  tipo: string;
  /** Act number as published, e.g. "4.855". */
  numero: string;
  /** Classification date, YYYY-MM-DD. */
  classifiedAt: string;
  /** Business segment id (same ids as the Tráfego series and the segment cards). */
  segment: string;
  theme: string;
  applicable: boolean;
  /** Area and Diretoria responsible for the norma. */
  area: string;
  diretoria: string;
}

export interface ClassificationData {
  asOf: string;
  normas: ClassifiedNorma[];
}

/** Segment ids a classified norma may carry: the business series of the Tráfego chart. */
export const CLASSIFICATION_SEGMENT_IDS: readonly string[] = TRAFFIC_SERIES.slice(0, -1).map((series) => series.id);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Throws a descriptive error when the payload does not match the contract; returns it unchanged otherwise. */
export function validateClassification(data: ClassificationData): ClassificationData {
  if (!data || !Array.isArray(data.normas)) {
    throw new Error('Classification payload without "normas".');
  }
  const codes = new Set<string>();
  for (const norma of data.normas) {
    if (!norma.code || codes.has(norma.code)) {
      throw new Error(`Norma without a unique code: ${norma.code}`);
    }
    codes.add(norma.code);
    if (!DAY.test(norma.classifiedAt ?? '') || isNaN(new Date(norma.classifiedAt).getTime())) {
      throw new Error(`Norma ${norma.code} has an invalid classifiedAt: ${norma.classifiedAt}`);
    }
    if (!CLASSIFICATION_SEGMENT_IDS.includes(norma.segment)) {
      throw new Error(`Norma ${norma.code} has an unknown segment: ${norma.segment}`);
    }
    if (!norma.theme || typeof norma.applicable !== 'boolean') {
      throw new Error(`Norma ${norma.code} has an invalid theme or applicability.`);
    }
    if ([norma.orgao, norma.tipo, norma.numero, norma.area, norma.diretoria].some((value) => !value)) {
      throw new Error(`Norma ${norma.code} without orgao, tipo, numero, area or diretoria.`);
    }
  }
  return data;
}
