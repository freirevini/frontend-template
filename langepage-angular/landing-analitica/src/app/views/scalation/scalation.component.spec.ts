import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ScalationComponent } from './scalation.component';

@Component({
    selector: 'app-waterfall-chart', template: ''
})
class WaterfallChartStubComponent {}

describe('ScalationComponent', () => {
  it('renders an accessible title, the petrol segment cards, the Cascata chart and the Tráfego e vendas card', () => {
    TestBed.configureTestingModule({ imports: [ScalationComponent] });
    // Shallow render: only the chart stub is real, as with the old NgModule test.
    TestBed.overrideComponent(ScalationComponent, { set: { imports: [WaterfallChartStubComponent], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(ScalationComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Scalation');
    const cards = root.querySelector('app-widgets-dropdown');
    expect(cards?.getAttribute('tone')).toBe('petrol');
    expect(root.querySelector('app-waterfall-chart')).not.toBeNull();
    expect(root.textContent).toContain('Tráfego e vendas');
  });
});
