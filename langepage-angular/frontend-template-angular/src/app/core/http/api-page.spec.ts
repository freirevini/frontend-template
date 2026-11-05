import { Observable, of, Subject } from 'rxjs';

import { collectPages, DataPage, fromSpringPage, localPage, MAX_PAGE_SIZE } from './api-page';

const rows = (count: number) => Array.from({ length: count }, (_, index) => index);

describe('fromSpringPage', () => {
  it('keeps content, totalElements, number and size and converts each item; extra Spring fields are ignored', () => {
    const page = { content: [1, 2], totalElements: 12, totalPages: 6, number: 3, size: 2, pageable: {}, first: false };
    expect(fromSpringPage(page, (value: number) => `#${value}`)).toEqual({ items: ['#1', '#2'], total: 12, page: 3, size: 2 });
  });

  it('rejects an envelope outside the contract', () => {
    expect(() => fromSpringPage({ content: null } as never, (value) => value)).toThrowError(/Page payload/);
    expect(() => fromSpringPage({ content: [], totalElements: -1, totalPages: 0, number: 0, size: 1 }, (value) => value)).toThrowError(/Page payload/);
  });
});

describe('localPage', () => {
  it('slices the page (0-based) and reports the whole total', () => {
    expect(localPage(rows(20), 1, 15)).toEqual({ items: [15, 16, 17, 18, 19], total: 20, page: 1, size: 15 });
    expect(localPage(rows(3), 2, 15).items).toEqual([]);
  });
});

describe('collectPages', () => {
  const server = (total: number) => {
    const calls: [number, number][] = [];
    const fetch = (page: number, size: number): Observable<DataPage<number>> => {
      calls.push([page, size]);
      return of(localPage(rows(total), page, size));
    };
    return { calls, fetch };
  };

  it('asks pages of 100 one after the other until every row arrived', () => {
    const { calls, fetch } = server(250);
    const progress: [number, number][] = [];
    let result: { rows: number[]; total: number } | undefined;
    collectPages(fetch, 5000, MAX_PAGE_SIZE, (loaded, total) => progress.push([loaded, total])).subscribe((value) => (result = value));
    expect(MAX_PAGE_SIZE).toBe(100);
    expect(calls).toEqual([[0, 100], [1, 100], [2, 100]]);
    expect(progress).toEqual([[100, 250], [200, 250], [250, 250]]);
    expect(result).toEqual({ rows: rows(250), total: 250 });
  });

  it('stops after the first page when the total is above the cap (nothing more is fetched)', () => {
    const { calls, fetch } = server(5001);
    let result: { rows: number[]; total: number } | undefined;
    collectPages(fetch, 5000).subscribe((value) => (result = value));
    expect(calls).toEqual([[0, 100]]);
    expect(result?.total).toBe(5001);
  });

  it('fetches exactly 50 pages for 5.000 rows (the cap)', () => {
    const { calls, fetch } = server(5000);
    let result: { rows: number[]; total: number } | undefined;
    collectPages(fetch, 5000).subscribe((value) => (result = value));
    expect(calls.length).toBe(50);
    expect(result?.rows.length).toBe(5000);
  });

  it('stops on an empty page even if the total promised more', () => {
    let result: { rows: number[]; total: number } | undefined;
    collectPages((page, size) => of({ items: page === 0 ? rows(size) : [], total: 900, page, size }), 5000).subscribe((value) => (result = value));
    expect(result).toEqual({ rows: rows(100), total: 900 });
  });

  it('is sequential and cancel-safe: unsubscribing drops the request in flight and asks nothing more', () => {
    const pending: Subject<DataPage<number>>[] = [];
    const subscription = collectPages((page, size) => {
      const answer = new Subject<DataPage<number>>();
      pending.push(answer);
      return answer;
    }, 5000).subscribe();
    expect(pending.length).toBe(1);
    pending[0].next(localPage(rows(300), 0, 100));
    pending[0].complete();
    expect(pending.length).toBe(2);
    subscription.unsubscribe();
    expect(pending[1].observed).toBeFalse();
    expect(pending.length).toBe(2);
  });
});
