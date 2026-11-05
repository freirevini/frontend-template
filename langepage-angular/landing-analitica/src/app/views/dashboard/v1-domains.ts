import { DateRange, toInputDate, TrafficPeriod } from './period/period-range';

/**
 * Domains of the BFF contract v1 (docs/contratos-de-dados.md section 11.7) and the query parameters every data block
 * shares. Adapters use these so a value outside the domain fails loudly (the block shows its load error) instead of
 * reaching the screen raw.
 */
export type SegmentoV1 = 'ATACADO' | 'CORPORATIVO' | 'PLATAFORMA' | 'VAREJO';
export type GranularidadeV1 = 'DIA' | 'MES' | 'ANO';

const SEGMENTS: Readonly<Record<SegmentoV1, string>> = {
  ATACADO: 'atacado',
  CORPORATIVO: 'corporativo',
  PLATAFORMA: 'plataforma',
  VAREJO: 'varejo'
};

/** Front segment ids in the contract order (alphabetical, the order of the cards and of TRAFFIC_SERIES). */
export const SEGMENT_IDS_V1_ORDER: readonly string[] = Object.values(SEGMENTS);

const GRANULARITIES: Readonly<Record<TrafficPeriod, GranularidadeV1>> = { Day: 'DIA', Month: 'MES', Year: 'ANO' };

/** `ATACADO` → `atacado` (front segment id); throws outside the domain. */
export function segmentFromV1(value: unknown): string {
  const id = typeof value === 'string' ? SEGMENTS[value as SegmentoV1] : undefined;
  if (!id) {
    throw new Error(`Segment outside the v1 domain: ${String(value)}`);
  }
  return id;
}

/** `atacado` → `ATACADO` (query parameter `segmento`); throws for an unknown id. */
export function segmentToV1(id: string): SegmentoV1 {
  const entry = (Object.entries(SEGMENTS) as [SegmentoV1, string][]).find(([, front]) => front === id);
  if (!entry) {
    throw new Error(`Unknown segment id: ${id}`);
  }
  return entry[0];
}

/** `Month` → `MES`. */
export function granularityToV1(period: TrafficPeriod): GranularidadeV1 {
  return GRANULARITIES[period];
}

/** `MES` → `Month`; throws outside the domain. */
export function granularityFromV1(value: unknown): TrafficPeriod {
  const entry = (Object.entries(GRANULARITIES) as [TrafficPeriod, GranularidadeV1][]).find(([, v1]) => v1 === value);
  if (!entry) {
    throw new Error(`Granularity outside the v1 domain: ${String(value)}`);
  }
  return entry[0];
}

/** `inicio` and `fim` of the period, `yyyy-MM-dd` in local time (both ends included by the BFF). */
export function rangeParams(bounds: DateRange): { inicio: string; fim: string } {
  return { inicio: toInputDate(bounds.start), fim: toInputDate(bounds.end) };
}

/** `granularidade`, `inicio`, `fim`: the parameters of the period resources (normativos-recebidos, resumos, cascata). */
export function periodParams(period: TrafficPeriod, bounds: DateRange): { granularidade: GranularidadeV1; inicio: string; fim: string } {
  return { granularidade: granularityToV1(period), ...rangeParams(bounds) };
}
