import { TestBed } from '@angular/core/testing';

import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  it('renders the empty "Analítico" page with an accessible title', () => {
    TestBed.configureTestingModule({ imports: [AnalyticsComponent] });
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Analítico');
  });
});
