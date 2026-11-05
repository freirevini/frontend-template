import { buildTrafficPeriod, DateRange, fromInputDate, TrafficPeriod, trafficPointCount } from '../period/period-range';
import { EMAIL_SEGMENT_IDS, SuggestionEmail } from './emails.model';

/** One point of the chart: an interval (day, month or year) with the normas sent per segment. */
export interface EmailBucket {
  label: string;
  emails: number;
  /** Normas sent in the interval, in EMAIL_SEGMENT_IDS order. */
  normas: number[];
  total: number;
}

export interface EmailsAggregate {
  /** Period subtitle (pt-BR), e.g. "Janeiro a dezembro de 2021". */
  subtitle: string;
  buckets: EmailBucket[];
  emails: number;
  /** Normas sent, counting a norma once per e-mail it was sent in. */
  normas: number;
  /** Different normas (by code) sent in the period. */
  distinctNormas: number;
  /** Normas per e-mail, 0 when there are no e-mails. */
  averagePerEmail: number;
  /** Normas per segment, in EMAIL_SEGMENT_IDS order. */
  segmentNormas: number[];
  /** E-mails in the period, newest first. */
  list: SuggestionEmail[];
}

/** Local calendar date the e-mail was sent (the date part of sentAt, as written; no timezone shift). */
export function sentDay(email: SuggestionEmail): Date {
  return fromInputDate(email.sentAt.slice(0, 10)) as Date;
}

/** Local Date and time as sent (used with the Angular date pipe). */
export function sentDateTime(email: SuggestionEmail): Date {
  const [, y, m, d, hh, mm] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(email.sentAt) as RegExpExecArray;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
}

function bucketIndex(period: TrafficPeriod, start: Date, day: Date): number {
  if (period === 'Day') {
    const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    return Math.round((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - startDay) / 86400000);
  }
  if (period === 'Month') {
    return (day.getFullYear() - start.getFullYear()) * 12 + day.getMonth() - start.getMonth();
  }
  return day.getFullYear() - start.getFullYear();
}

/**
 * Groups the e-mails sent inside `bounds` by day, month or year (one bucket per interval, empty ones included).
 * With `segment`, only that segment's e-mails count.
 */
export function aggregateEmails(
  emails: SuggestionEmail[],
  period: TrafficPeriod,
  bounds: DateRange,
  segment: string | null = null
): EmailsAggregate {
  const { labels, subtitle } = buildTrafficPeriod(period, bounds);
  const count = trafficPointCount(period, bounds);
  const buckets: EmailBucket[] = labels.map((label) => ({ label, emails: 0, normas: EMAIL_SEGMENT_IDS.map(() => 0), total: 0 }));
  const firstDay = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate());
  const lastDay = new Date(bounds.end.getFullYear(), bounds.end.getMonth(), bounds.end.getDate());
  const codes = new Set<string>();
  const segmentNormas = EMAIL_SEGMENT_IDS.map(() => 0);
  const list: SuggestionEmail[] = [];
  let total = 0;

  for (const email of emails) {
    if (segment !== null && email.segment !== segment) {
      continue;
    }
    const day = sentDay(email);
    if (day < firstDay || day > lastDay) {
      continue;
    }
    const index = bucketIndex(period, bounds.start, day);
    const segmentPosition = EMAIL_SEGMENT_IDS.indexOf(email.segment);
    if (index < 0 || index >= count || segmentPosition < 0) {
      continue;
    }
    const bucket = buckets[index];
    bucket.emails += 1;
    bucket.normas[segmentPosition] += email.normas.length;
    bucket.total += email.normas.length;
    segmentNormas[segmentPosition] += email.normas.length;
    total += email.normas.length;
    email.normas.forEach((norma) => codes.add(norma.code));
    list.push(email);
  }

  list.sort((a, b) => sentDateTime(b).getTime() - sentDateTime(a).getTime());
  return {
    subtitle,
    buckets,
    emails: list.length,
    normas: total,
    distinctNormas: codes.size,
    averagePerEmail: list.length ? total / list.length : 0,
    segmentNormas,
    list
  };
}
