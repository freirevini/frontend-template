import { buildTrafficPeriod, DateRange, TrafficPeriod } from '../../dashboard/period/period-range';
import type { WaterfallData, WaterfallStepKind } from './waterfall.model';

/** `GET /v1/cascatas-resultado` → `CascataResultado` (docs/contratos/openapi-agenda-normativa-v1.yaml). */
export interface ParteCascataV1 {
  rotulo: string;
  valor: number;
}

export interface EtapaCascataV1 {
  id: string;
  rotulo: string;
  tipo: 'TOTAL' | 'REDUCAO';
  partes: ParteCascataV1[];
}

export interface CascataResultadoV1 {
  periodo?: string;
  moeda: string;
  escalaUnidade: number;
  etapas: EtapaCascataV1[];
}

const KINDS: Readonly<Record<string, WaterfallStepKind>> = { TOTAL: 'total', REDUCAO: 'decrease' };

/**
 * Contract v1 → WaterfallData (docs/contratos-de-dados.md section 11.5). `periodo` absent: the subtitle comes from the
 * period asked for (buildTrafficPeriod), as the mock derivation does. buildWaterfall validates the steps afterwards.
 */
export function fromCascataV1(response: CascataResultadoV1, period: TrafficPeriod, bounds: DateRange): WaterfallData {
  if (!response || !Array.isArray(response.etapas)) {
    throw new Error('Waterfall payload without "etapas".');
  }
  return {
    period: response.periodo || buildTrafficPeriod(period, bounds).subtitle,
    currency: response.moeda,
    unitScale: response.escalaUnidade,
    steps: response.etapas.map((etapa) => {
      const kind = KINDS[etapa.tipo];
      if (!kind) {
        throw new Error(`Waterfall step ${etapa.id} with a type outside the v1 domain: ${etapa.tipo}`);
      }
      return { id: etapa.id, label: etapa.rotulo, kind, parts: (etapa.partes ?? []).map((parte) => ({ label: parte.rotulo, value: parte.valor })) };
    })
  };
}
