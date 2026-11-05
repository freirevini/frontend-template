/**
 * Period helpers shared by the dashboard charts (Tráfego, Cascata) and the period filter:
 * granularity (Dia/Mês/Ano), preset ranges ("Últimos N"), custom date ranges and their labels.
 */
export type TrafficPeriod = 'Day' | 'Month' | 'Year';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Last day of the mock data: every preset range ends here. */
const PERIOD_END = new Date(2021, 11, 31);
const dayMonthLong = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const dayMonthShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RangeOption {
  count: number;
  label: string;
}

/** Range options per granularity ("Últimos 7 dias" etc.). */
export const TRAFFIC_RANGES: Record<TrafficPeriod, RangeOption[]> = {
  Day: [{ count: 7, label: '7 dias' }, { count: 15, label: '15 dias' }, { count: 30, label: '30 dias' }],
  Month: [{ count: 3, label: '3 meses' }, { count: 6, label: '6 meses' }, { count: 12, label: '12 meses' }],
  Year: [{ count: 3, label: '3 anos' }, { count: 5, label: '5 anos' }]
};

export const DEFAULT_TRAFFIC_RANGE: Record<TrafficPeriod, number> = { Day: 7, Month: 12, Year: 5 };

/** Most points a custom range may have per granularity, so the chart stays readable. */
export const MAX_TRAFFIC_POINTS: Record<TrafficPeriod, number> = { Day: 92, Month: 60, Year: 30 };

/** Visible names of the granularities. */
export const PERIOD_LABELS: Record<TrafficPeriod, string> = { Day: 'Dia', Month: 'Mês', Year: 'Ano' };

export function isTrafficPeriod(value: unknown): value is TrafficPeriod {
  return value === 'Day' || value === 'Month' || value === 'Year';
}

/** Number of days, months or years between two dates (inclusive). */
export function trafficPointCount(period: TrafficPeriod, { start, end }: DateRange): number {
  if (period === 'Day') {
    const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endDay - startDay) / 86400000) + 1;
  }
  if (period === 'Month') {
    return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  }
  return end.getFullYear() - start.getFullYear() + 1;
}

/** Error message (pt-BR) for a custom range, or null when it can be plotted. */
export function validateCustomRange(period: TrafficPeriod, range: Partial<DateRange>): string | null {
  if (!range.start || !range.end || isNaN(range.start.getTime()) || isNaN(range.end.getTime())) {
    return 'Informe as duas datas.';
  }
  if (range.start > range.end) {
    return 'A data inicial deve ser anterior ou igual à data final.';
  }
  const count = trafficPointCount(period, range as DateRange);
  if (count > MAX_TRAFFIC_POINTS[period]) {
    const limits: Record<TrafficPeriod, string> = {
      Day: `Para Dia, escolha até ${MAX_TRAFFIC_POINTS.Day} dias ou use Mês.`,
      Month: `Para Mês, escolha até ${MAX_TRAFFIC_POINTS.Month} meses ou use Ano.`,
      Year: `Para Ano, escolha até ${MAX_TRAFFIC_POINTS.Year} anos.`
    };
    return limits[period];
  }
  return null;
}

/** Bounds of the preset "last `count`" range, ending on the last day of the mock data. */
export function presetRange(period: TrafficPeriod, count: number): DateRange {
  const end = PERIOD_END;
  if (period === 'Day') {
    return { start: new Date(end.getFullYear(), end.getMonth(), end.getDate() - (count - 1)), end };
  }
  if (period === 'Month') {
    return { start: new Date(end.getFullYear(), end.getMonth() - (count - 1), 1), end };
  }
  return { start: new Date(end.getFullYear() - (count - 1), 0, 1), end };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Labels (one per day, month or year) and subtitle for any date range. */
export function buildTrafficPeriod(period: TrafficPeriod, range: DateRange): { labels: string[]; subtitle: string } {
  const { start, end } = range;
  const count = trafficPointCount(period, range);
  const sameYear = start.getFullYear() === end.getFullYear();

  if (period === 'Day') {
    const labels = Array.from({ length: count }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return `${capitalize(weekdayShort.format(date).replace('.', ''))} ${dayMonthShort.format(date)}`;
    });
    let from = dayMonthLong.format(start);
    if (!sameYear) {
      from = `${from} de ${start.getFullYear()}`;
    } else if (start.getMonth() === end.getMonth()) {
      from = String(start.getDate());
    }
    const subtitle = count === 1
      ? `${dayMonthLong.format(end)} de ${end.getFullYear()}`
      : `${from} a ${dayMonthLong.format(end)} de ${end.getFullYear()}`;
    return { labels, subtitle };
  }

  if (period === 'Month') {
    const labels = Array.from({ length: count }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const name = MONTHS[date.getMonth()];
      return sameYear ? name : `${name.slice(0, 3)}/${String(date.getFullYear()).slice(2)}`;
    });
    const startName = MONTHS[start.getMonth()];
    const endName = MONTHS[end.getMonth()].toLowerCase();
    let subtitle: string;
    if (count === 1) {
      subtitle = `${startName} de ${end.getFullYear()}`;
    } else if (sameYear) {
      subtitle = `${startName} a ${endName} de ${end.getFullYear()}`;
    } else {
      subtitle = `${startName} de ${start.getFullYear()} a ${endName} de ${end.getFullYear()}`;
    }
    return { labels, subtitle };
  }

  const labels = Array.from({ length: count }, (_, index) => String(start.getFullYear() + index));
  return { labels, subtitle: count === 1 ? labels[0] : `${labels[0]} a ${labels[labels.length - 1]}` };
}

/** Labels and subtitle for the last `count` days, months or years of the mock data. */
export function trafficPeriod(period: TrafficPeriod, count: number): { labels: string[]; subtitle: string } {
  return buildTrafficPeriod(period, presetRange(period, count));
}

/** yyyy-MM-dd for <input type="date"> (local time, no UTC shift). */
export function toInputDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses yyyy-MM-dd as a local date; undefined when empty or malformed. */
export function fromInputDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}
