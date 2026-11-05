import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';

/** Gap between the sticky header and the top of a section scrolled into view (px). */
const SECTION_GAP = 16;
/** How long a section keeps being re-aligned while cards above it finish loading (ms). */
const SETTLE_TIME = 2500;

/**
 * Space taken by the sticky header (bottom edge), so a section scrolled into view is not hidden under it.
 * Used by the router (scrollOffset) and by SectionScrollService.
 */
export function stickyHeaderOffset(doc: Document = document): number {
  const header = doc.querySelector('.header-sticky, .header');
  return Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 0)) + SECTION_GAP;
}

/**
 * Sidebar sub-items link to page sections by URL fragment (e.g. /triagent#tabela-analitica). The router scrolls to the
 * section once, but cards above it load their data afterwards and push it down. While the page settles, this service
 * re-aligns the section whenever the page height changes, and stops as soon as the user scrolls or types.
 */
@Injectable({ providedIn: 'root' })
export class SectionScrollService implements OnDestroy {
  private stop: (() => void) | null = null;

  constructor(@Inject(DOCUMENT) private readonly doc: Document, private readonly zone: NgZone) {}

  /** Keeps the element with this id aligned below the header for a short while; null/unknown id does nothing. */
  follow(fragment: string | null): void {
    this.cancel();
    const view = this.doc.defaultView;
    if (!fragment || !view || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.zone.runOutsideAngular(() => {
      const align = () => {
        const target = this.doc.getElementById(fragment);
        if (target) {
          view.scrollTo({ top: target.getBoundingClientRect().top + view.scrollY - stickyHeaderOffset(this.doc) });
        }
      };
      const observer = new ResizeObserver(() => align());
      observer.observe(this.doc.body);
      const userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
      const onUser = () => this.cancel();
      userEvents.forEach((name) => view.addEventListener(name, onUser, { passive: true }));
      const timer = view.setTimeout(() => this.cancel(), SETTLE_TIME);
      this.stop = () => {
        observer.disconnect();
        userEvents.forEach((name) => view.removeEventListener(name, onUser));
        view.clearTimeout(timer);
      };
    });
  }

  cancel(): void {
    this.stop?.();
    this.stop = null;
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
