import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridModule, WidgetModule } from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { of, throwError } from 'rxjs';

import { iconSubset } from '../../../icons/icon-subset';
import { SegmentCardsData, SegmentCardsService } from '../widgets-dropdown/segment-cards.service';
import { SegmentOverviewComponent } from './segment-overview.component';

const DATA: SegmentCardsData = {
  asOf: '2021-12-31',
  segments: [
    { id: 'atacado', label: 'Atacado', icon: 'cilTruck', total: 1254, toClassify: 7, trend: [65, 59, 84, 84, 51, 55, 40] },
    { id: 'corporativo', label: 'Corporativo', icon: 'cilBuilding', total: 62, toClassify: 9, trend: [1, 18, 9, 17] },
    { id: 'plataforma', label: 'Plataforma', icon: 'cilDevices', total: 25, toClassify: 4, trend: [78, 81, 80] },
    { id: 'varejo', label: 'Varejo', icon: 'cilCart', total: 44, toClassify: 6, trend: [85, 65, 23, 12, 98, 34, 84] }
  ]
};

describe('SegmentOverviewComponent (Início)', () => {
  let fixture: ComponentFixture<SegmentOverviewComponent>;

  function setup(service: Partial<SegmentCardsService>) {
    TestBed.configureTestingModule({
    imports: [WidgetModule, GridModule, IconModule, ChartjsModule, SegmentOverviewComponent],
    providers: [IconSetService, { provide: SegmentCardsService, useValue: service }]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(SegmentOverviewComponent);
    fixture.detectChanges();
  }

  const cards = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.segment-overview-card'));

  it('shows one card per segment with its name and figures in pt-BR, and no social network cards', () => {
    setup({ getSegments: () => of(DATA) });
    expect(cards().length).toBe(4);
    expect(cards().map((card) => card.querySelector('.segment-overview-name')?.textContent?.trim())).toEqual(['Atacado', 'Corporativo', 'Plataforma', 'Varejo']);
    const text = cards()[0].textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('1.254');
    expect(text).toContain('normas');
    expect(text).toContain('7');
    expect(text).toContain('a classificar');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toMatch(/amigos|seguidores|tweets|conexões/);
  });

  it('paints each header with the segment chart color token, the same as the charts legend', () => {
    setup({ getSegments: () => of(DATA) });
    expect(cards().map((card) => card.style.getPropertyValue('--segment-color').trim())).toEqual([
      'var(--app-series-1)',
      'var(--app-series-2)',
      'var(--app-series-3)',
      'var(--app-series-4)'
    ]);
  });

  it('shows the segment icon (decorative) and builds the sparkline from its trend', () => {
    setup({ getSegments: () => of(DATA) });
    const icon = cards()[3].querySelector('svg.segment-overview-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    const card = fixture.componentInstance.cards[3];
    expect(card.chart.labels).toEqual(['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho']);
    expect(card.chart.datasets[0].data).toEqual(DATA.segments[3].trend);
  });

  it('shows a message when the segments cannot be loaded', () => {
    spyOn(console, 'error');
    setup({ getSegments: () => throwError(() => new Error('falha')) });
    expect(cards().length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os segmentos.');
  });
});
