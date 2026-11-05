import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders an accessible title and the segment overview instead of the social network cards', () => {
    TestBed.configureTestingModule({ imports: [HomeComponent] });
    // Shallow render: the standalone children (segment overview) are not instantiated, as with the old NgModule test.
    TestBed.overrideComponent(HomeComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Início');
    expect(root.querySelector('app-segment-overview')).not.toBeNull();
    expect(root.querySelector('app-widgets-brand')).toBeNull();
  });
});
