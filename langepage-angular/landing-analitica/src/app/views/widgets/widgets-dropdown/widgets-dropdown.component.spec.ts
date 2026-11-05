import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonModule, DropdownModule, GridModule, SharedModule, WidgetModule } from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { of, throwError } from 'rxjs';

import { iconSubset } from '../../../icons/icon-subset';
import { SegmentCardsData, SegmentCardsService } from './segment-cards.service';
import { WidgetsDropdownComponent } from './widgets-dropdown.component';

const DATA: SegmentCardsData = {
  asOf: '2021-12-31',
  segments: [
    { id: 'atacado', label: 'Atacado', icon: 'cilTruck', total: 54, toClassify: 7, trend: [65, 59, 84, 84, 51, 55, 40] },
    { id: 'varejo', label: 'Varejo', icon: 'cilCart', total: 44, toClassify: 6, trend: [85, 65, 23, 12, 98, 34, 84] }
  ]
};

describe('WidgetsDropdownComponent (cards de segmento)', () => {
  let fixture: ComponentFixture<WidgetsDropdownComponent>;

  function setup(service: Partial<SegmentCardsService>) {
    TestBed.configureTestingModule({
    imports: [WidgetModule, DropdownModule, IconModule, ButtonModule, ChartjsModule, GridModule, SharedModule, WidgetsDropdownComponent],
    providers: [IconSetService, { provide: SegmentCardsService, useValue: service }]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(WidgetsDropdownComponent);
    fixture.detectChanges();
  }

  it('shows each segment with its total and normas a classificar, without percentages', () => {
    setup({ getSegments: () => of(DATA) });
    const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.brand-stat-card'));
    expect(cards.length).toBe(2);
    const text = cards[0].textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('54');
    expect(text).toContain('7 a classificar');
    expect(text).toContain('Atacado');
    expect(text).not.toContain('%');
  });

  it('builds one sparkline per segment from its trend', () => {
    setup({ getSegments: () => of(DATA) });
    const component = fixture.componentInstance;
    expect(component.data.length).toBe(2);
    expect(component.data[1].datasets[0].data).toEqual(DATA.segments[1].trend);
    expect(component.options.length).toBe(2);
  });

  it('shows a message when the segments cannot be loaded', () => {
    spyOn(console, 'error');
    setup({ getSegments: () => throwError(() => new Error('falha')) });
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os segmentos.');
  });

  it('emits the segment when its "a classificar" badge is clicked and marks the active one', () => {
    setup({ getSegments: () => of(DATA) });
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.toClassifySelect.subscribe((id) => emitted.push(id));
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.brand-stat-pending');
    badges[1].click();
    expect(emitted).toEqual(['varejo']);

    component.activeSegment = 'varejo';
    fixture.detectChanges();
    expect(badges[1].getAttribute('aria-pressed')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.brand-stat-card.is-dimmed').length).toBe(1);
  });

  it('uses the petrol tone and a plain-text badge when not filterable', () => {
    setup({ getSegments: () => of(DATA) });
    const component = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).not.toContain('tone-petrol');
    component.tone = 'petrol';
    component.filterable = false;
    fixture.detectChanges();
    expect(host.classList).toContain('tone-petrol');
    expect(host.querySelectorAll('button.brand-stat-pending').length).toBe(0);
    const badges = host.querySelectorAll('span.brand-stat-pending');
    expect(badges.length).toBe(2);
    expect(badges[0].textContent?.trim()).toBe('7 a classificar');
  });
});
