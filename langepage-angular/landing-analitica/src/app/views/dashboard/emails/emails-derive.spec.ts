import { presetRange } from '../period/period-range';
import { aggregateEmails, sentDateTime, sentDay } from './emails-derive';
import { SuggestionEmail } from './emails.model';

let counter = 0;
const norma = (code: string) => ({ code, orgao: 'CMN', tipo: 'Resolução', numero: code, title: 'Título', suggestedClass: 'Aplicável' as const, area: 'Área', diretoria: 'Diretoria' });
function email(day: string, segment: string, codes: string[], time = '10:00'): SuggestionEmail {
  return {
    id: `em-${++counter}`,
    sentAt: `${day}T${time}:00-03:00`,
    subject: `Sugestões — ${segment}`,
    segment,
    recipients: 2,
    normas: codes.map(norma)
  };
}

const EMAILS = [
  email('2021-01-05', 'atacado', ['A1', 'A2']),
  email('2021-01-20', 'varejo', ['V1']),
  email('2021-03-10', 'atacado', ['A1', 'A3', 'A4']),
  email('2021-12-31', 'plataforma', ['P1'], '23:59'),
  email('2020-12-31', 'atacado', ['OLD'])
];
const YEAR = { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) };

describe('aggregateEmails', () => {
  it('groups by month with one bucket per month, empty ones included', () => {
    const data = aggregateEmails(EMAILS, 'Month', YEAR);
    expect(data.buckets.length).toBe(12);
    expect(data.subtitle).toBe('Janeiro a dezembro de 2021');
    expect(data.buckets[0]).toEqual({ label: 'Janeiro', emails: 2, normas: [2, 0, 0, 1], total: 3 });
    expect(data.buckets[1].total).toBe(0);
    expect(data.buckets[2].normas).toEqual([3, 0, 0, 0]);
    expect(data.buckets[11].normas).toEqual([0, 0, 1, 0]);
  });

  it('ignores e-mails outside the range', () => {
    const data = aggregateEmails(EMAILS, 'Month', YEAR);
    expect(data.emails).toBe(4);
    expect(data.list.some((item) => item.sentAt.startsWith('2020'))).toBeFalse();
  });

  it('totals: normas per e-mail sent, distinct codes, average and per segment', () => {
    const data = aggregateEmails(EMAILS, 'Month', YEAR);
    expect(data.normas).toBe(7);
    // A1 was sent twice
    expect(data.distinctNormas).toBe(6);
    expect(data.averagePerEmail).toBeCloseTo(7 / 4, 5);
    expect(data.segmentNormas).toEqual([5, 0, 1, 1]);
    expect(data.buckets.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(data.normas);
    expect(data.buckets.reduce((sum, bucket) => sum + bucket.emails, 0)).toBe(data.emails);
  });

  it('keeps the last day of the range, whatever the time it was sent', () => {
    const data = aggregateEmails(EMAILS, 'Day', { start: new Date(2021, 11, 30), end: new Date(2021, 11, 31) });
    expect(data.buckets.map((bucket) => bucket.emails)).toEqual([0, 1]);
  });

  it('groups by day and by year', () => {
    const days = aggregateEmails(EMAILS, 'Day', { start: new Date(2021, 0, 3), end: new Date(2021, 0, 9) });
    expect(days.buckets.length).toBe(7);
    expect(days.buckets[2].emails).toBe(1);
    expect(days.emails).toBe(1);
    const years = aggregateEmails(EMAILS, 'Year', { start: new Date(2020, 0, 1), end: new Date(2021, 11, 31) });
    expect(years.buckets.map((bucket) => [bucket.label, bucket.emails])).toEqual([['2020', 1], ['2021', 4]]);
  });

  it('supports a custom range', () => {
    const data = aggregateEmails(EMAILS, 'Month', { start: new Date(2021, 2, 1), end: new Date(2021, 5, 30) });
    expect(data.buckets.map((bucket) => bucket.label)).toEqual(['Março', 'Abril', 'Maio', 'Junho']);
    expect(data.emails).toBe(1);
  });

  it('filters by segment', () => {
    const data = aggregateEmails(EMAILS, 'Month', YEAR, 'atacado');
    expect(data.emails).toBe(2);
    expect(data.normas).toBe(5);
    expect(data.segmentNormas).toEqual([5, 0, 0, 0]);
    expect(data.list.every((item) => item.segment === 'atacado')).toBeTrue();
  });

  it('lists e-mails newest first', () => {
    const data = aggregateEmails(EMAILS, 'Month', YEAR);
    expect(data.list.map((item) => item.sentAt.slice(0, 10))).toEqual(['2021-12-31', '2021-03-10', '2021-01-20', '2021-01-05']);
  });

  it('returns zeros without e-mails or in an empty period', () => {
    const none = aggregateEmails([], 'Month', presetRange('Month', 3));
    expect(none.emails).toBe(0);
    expect(none.normas).toBe(0);
    expect(none.averagePerEmail).toBe(0);
    expect(none.buckets.length).toBe(3);
    expect(aggregateEmails(EMAILS, 'Month', { start: new Date(2021, 6, 1), end: new Date(2021, 7, 31) }).emails).toBe(0);
  });
});

describe('sent date helpers', () => {
  it('use the date and time as sent, with no timezone shift', () => {
    const item = email('2021-06-30', 'varejo', ['V1'], '23:30');
    expect(sentDay(item)).toEqual(new Date(2021, 5, 30));
    expect(sentDateTime(item)).toEqual(new Date(2021, 5, 30, 23, 30));
  });
});
