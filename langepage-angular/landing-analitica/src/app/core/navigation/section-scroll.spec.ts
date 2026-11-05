import { NgZone } from '@angular/core';

import { SectionScrollService, stickyHeaderOffset } from './section-scroll';

describe('SectionScrollService', () => {
  let service: SectionScrollService;
  let target: HTMLElement;

  beforeEach(() => {
    service = new SectionScrollService(document, new NgZone({}));
    target = document.createElement('div');
    target.id = 'secao-teste';
    document.body.appendChild(target);
  });

  afterEach(() => {
    service.cancel();
    target.remove();
  });

  it('measures the sticky header bottom plus a gap', () => {
    const header = document.createElement('div');
    header.className = 'header-sticky';
    spyOn(header, 'getBoundingClientRect').and.returnValue({ bottom: 100 } as DOMRect);
    spyOn(document, 'querySelector').and.returnValue(header);
    expect(stickyHeaderOffset(document)).toBe(116);
  });

  it('re-aligns the section when the page height changes, and stops on user input', async () => {
    const scroll = spyOn(window, 'scrollTo');
    service.follow('secao-teste');
    const spacer = document.createElement('div');
    spacer.style.height = '500px';
    document.body.insertBefore(spacer, target);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scroll).toHaveBeenCalled();
    scroll.calls.reset();
    window.dispatchEvent(new Event('wheel'));
    spacer.style.height = '900px';
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scroll).not.toHaveBeenCalled();
    spacer.remove();
  });

  it('does nothing without a fragment', () => {
    const scroll = spyOn(window, 'scrollTo');
    service.follow(null);
    expect(scroll).not.toHaveBeenCalled();
  });
});
