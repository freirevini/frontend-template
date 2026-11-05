import { DataPage, localPage } from '../../../core/http/api-page';
import { TRAFFIC_SERIES } from '../dashboard-charts-data';
import { DateRange, fromInputDate } from '../period/period-range';
import { ClassifiedNorma } from './classification.model';

/** Themes listed by name in the chart; the rest are summed into "Outros temas". */
export const TOP_THEMES = 10;

export interface ThemeShare {
  label: string;
  /** Applicable normas with this theme. */
  count: number;
  /** Share of the normas of the listed class (applicable or not) in the period (0-1). */
  share: number;
  /** Bar length relative to the largest named theme (0-1); 0 for "Outros temas", which has no bar. */
  width: number;
  /** "Outros temas" row: how many themes it groups; 0 for a named theme. */
  grouped: number;
}

/** Cross filters of the classification cards (plus the page segment filter). */
export interface ClassificationFilters {
  /** Only this segment's normas, or null for all. */
  segment?: string | null;
  /** Only normas with this theme, or null for all. */
  theme?: string | null;
  /** Class whose themes are ranked: applicable (default) or not applicable. */
  themesOf?: boolean;
}

export interface ClassificationAggregate {
  total: number;
  applicable: number;
  notApplicable: number;
  /** Applicable share of the classified normas (0-1), 0 when nothing was classified. */
  applicableShare: number;
  /** Normas of the class whose themes are ranked (`themesOf`). */
  themesTotal: number;
  /** Named themes of that class, largest first. */
  themes: ThemeShare[];
  /** The tail summed as "Outros temas" (no bar, so it never squashes the named ones), or null. */
  others: ThemeShare | null;
}

/**
 * Normas classified inside `bounds` (both ends included), optionally only one segment's, one theme's and one class
 * (`applicable`), in the order received. Shared by the cards and the Tabela Analítica.
 */
export function filterClassified(
  normas: ClassifiedNorma[],
  bounds: DateRange,
  filters: { segment?: string | null; theme?: string | null; applicable?: boolean | null } = {}
): ClassifiedNorma[] {
  const { segment = null, theme = null, applicable = null } = filters;
  const firstDay = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate());
  const lastDay = new Date(bounds.end.getFullYear(), bounds.end.getMonth(), bounds.end.getDate());
  return normas.filter((norma) => {
    if ((segment !== null && norma.segment !== segment) || (theme !== null && norma.theme !== theme)) {
      return false;
    }
    if (applicable !== null && norma.applicable !== applicable) {
      return false;
    }
    const day = fromInputDate(norma.classifiedAt) as Date;
    return day >= firstDay && day <= lastDay;
  });
}

/**
 * Normas classified inside `bounds` (optionally one segment's and one theme's): applicable vs not applicable to the bank,
 * and the themes of one class (applicable by default).
 */
export function aggregateClassification(
  normas: ClassifiedNorma[],
  bounds: DateRange,
  filters: ClassificationFilters = {},
  topThemes = TOP_THEMES
): ClassificationAggregate {
  const { segment = null, theme = null, themesOf = true } = filters;
  const byTheme = new Map<string, number>();
  let total = 0;
  let applicable = 0;

  for (const norma of filterClassified(normas, bounds, { segment, theme })) {
    total++;
    if (norma.applicable) {
      applicable++;
    }
    if (norma.applicable === themesOf) {
      byTheme.set(norma.theme, (byTheme.get(norma.theme) ?? 0) + 1);
    }
  }

  // Largest first; ties by name so the order is stable.
  const ranked = Array.from(byTheme.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  // Grouping a single theme into "Outros" hides a name for nothing: list it instead.
  const named = ranked.length <= topThemes + 1 ? ranked : ranked.slice(0, topThemes);
  const rest = ranked.slice(named.length);
  const largest = Math.max(1, ...named.map(([, count]) => count));
  const themesTotal = themesOf ? applicable : total - applicable;
  const share = (count: number) => (themesTotal ? count / themesTotal : 0);
  const othersCount = rest.reduce((sum, [, count]) => sum + count, 0);

  return {
    total,
    applicable,
    notApplicable: total - applicable,
    applicableShare: total ? applicable / total : 0,
    themesTotal,
    themes: named.map(([label, count]) => ({ label, count, share: share(count), width: count / largest, grouped: 0 })),
    others: rest.length ? { label: 'Outros temas', count: othersCount, share: share(othersCount), width: 0, grouped: rest.length } : null
  };
}

/** Sortable columns of the Tabela Analítica (front keys; the BFF names are in classification.adapter.ts). */
export type NormasSortKey = 'classifiedAt' | 'orgao' | 'tipo' | 'numero' | 'theme' | 'segment' | 'applicable' | 'area' | 'diretoria';

export interface NormasSort {
  key: NormasSortKey;
  direction: 'asc' | 'desc';
}

/** One page of the Tabela Analítica: every page filter, the sort on screen and the page (0 = first). */
export interface NormasQuery {
  bounds: DateRange;
  segment: string | null;
  applicable: boolean | null;
  theme: string | null;
  sort: NormasSort;
  page: number;
  size: number;
}

/** Inputs of the classification summary (pie and themes list): period, page segment and the card's own filters. */
export interface ClassificationSummaryQuery extends ClassificationFilters {
  bounds: DateRange;
}

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** "4.855" → 4855 (pt-BR thousands dots). */
function actNumber(numero: string): number {
  return Number(numero.replace(/\./g, '').replace(',', '.')) || 0;
}

/** Text a column sorts by: the cell as shown (segment name, Sim/Não), raw value otherwise. */
function sortText(norma: ClassifiedNorma, key: Exclude<NormasSortKey, 'classifiedAt' | 'numero'>): string {
  if (key === 'segment') {
    return TRAFFIC_SERIES.find((series) => series.id === norma.segment)?.label ?? norma.segment;
  }
  if (key === 'applicable') {
    return norma.applicable ? 'Sim' : 'Não';
  }
  return norma[key];
}

/**
 * Sorted copy, as the Tabela Analítica shows it: dates by ISO text, numbers by value ("4.855" is 4855), text in pt-BR
 * order; ties keep the newest first, then the code. The BFF repeats it (`sort=<campo>,<dir>&sort=dataClassificacao,desc`,
 * tie by `codigo,asc`).
 */
export function sortClassified(normas: readonly ClassifiedNorma[], sort: NormasSort): ClassifiedNorma[] {
  const { key } = sort;
  const direction = sort.direction === 'asc' ? 1 : -1;
  const compare = (a: ClassifiedNorma, b: ClassifiedNorma): number => {
    if (key === 'classifiedAt') {
      return a.classifiedAt.localeCompare(b.classifiedAt);
    }
    if (key === 'numero') {
      return actNumber(a.numero) - actNumber(b.numero);
    }
    return collator.compare(sortText(a, key), sortText(b, key));
  };
  return [...normas].sort(
    (a, b) => direction * compare(a, b) || b.classifiedAt.localeCompare(a.classifiedAt) || a.code.localeCompare(b.code)
  );
}

/** Mock emulation of `GET /v1/normas-classificadas`: same filters, sort and paging as the BFF, over the full list. */
export function pageClassified(normas: readonly ClassifiedNorma[], query: NormasQuery): DataPage<ClassifiedNorma> {
  const rows = filterClassified([...normas], query.bounds, { segment: query.segment, theme: query.theme, applicable: query.applicable });
  return localPage(sortClassified(rows, query.sort), query.page, query.size);
}
