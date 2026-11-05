import { defer, EMPTY, expand, map, Observable, reduce } from 'rxjs';

/** Largest `size` a corporate BFF accepts per page (corporate standard: 50 to 100 records per page). */
export const MAX_PAGE_SIZE = 100;

/** Page envelope of the v1 conventions (Spring `Page`, docs/contratos-de-dados.md); extra Spring fields are ignored. */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Index of the page returned, 0 = first. */
  number: number;
  size: number;
}

/** One page as the front uses it, whatever its origin (BFF or local mock). */
export interface DataPage<T> {
  items: T[];
  /** Items matching the filters, across every page. */
  total: number;
  /** Index of this page, 0 = first. */
  page: number;
  size: number;
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Spring page → DataPage, converting each item; throws when the envelope does not match the contract. */
export function fromSpringPage<T, R>(page: SpringPage<T>, item: (value: T) => R): DataPage<R> {
  if (!page || !Array.isArray(page.content) || !isCount(page.totalElements) || !isCount(page.number) || !isCount(page.size)) {
    throw new Error('Page payload without content, totalElements, number or size.');
  }
  return { items: page.content.map(item), total: page.totalElements, page: page.number, size: page.size };
}

/** Page `page` (0-based) of `size` items of an already filtered and sorted list: the mock's emulation of the BFF. */
export function localPage<T>(items: readonly T[], page: number, size: number): DataPage<T> {
  const start = page * size;
  return { items: items.slice(start, start + size), total: items.length, page, size };
}

/** Rows gathered page by page; `total` is what the filters match (may be above the rows gathered). */
export interface CollectedRows<T> {
  rows: T[];
  total: number;
}

/**
 * Fetches pages 0, 1, 2... one after the other (never in parallel) until `total` rows or `maxRows` are gathered, or a
 * page comes back empty. When the first page says `total > maxRows`, stops there and returns only that page's rows:
 * the caller decides (e.g. a browser export refuses a partial file above the cap). `progress` is called
 * after each page. Unsubscribing cancels the request in flight and fetches nothing more.
 */
export function collectPages<T>(
  fetchPage: (page: number, size: number) => Observable<DataPage<T>>,
  maxRows: number,
  size = MAX_PAGE_SIZE,
  progress: (loaded: number, total: number) => void = () => undefined
): Observable<CollectedRows<T>> {
  const wanted = (total: number) => Math.min(total, maxRows);
  // defer: each subscription counts its own pages.
  return defer(() => {
    let loaded = 0;
    return fetchPage(0, size).pipe(
      expand((current, index) => {
        loaded += current.items.length;
        progress(Math.min(loaded, wanted(current.total)), current.total);
        const more = current.total <= maxRows && current.items.length > 0 && loaded < wanted(current.total);
        return more ? fetchPage(index + 1, size) : EMPTY;
      }),
      reduce<DataPage<T>, CollectedRows<T>>((acc, current) => ({ rows: acc.rows.concat(current.items), total: current.total }), {
        rows: [],
        total: 0
      }),
      map(({ rows, total }) => ({ rows: rows.slice(0, maxRows), total }))
    );
  });
}
