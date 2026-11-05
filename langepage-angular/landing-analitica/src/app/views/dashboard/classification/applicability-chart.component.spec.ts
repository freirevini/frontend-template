import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardModule, SpinnerModule } from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { of, Subject, throwError } from 'rxjs';
import { Chart } from 'chart.js';

import { ThemeService } from '../../../core/services/theme.service';
import { ApplicabilityChartComponent } from './applicability-chart.component';
import { ClassificationDataService, localClassificationQueries } from './classification-data.service';
import { ClassificationData, ClassifiedNorma } from './classification.model';

const norma = (code: string, day: string, applicable: boolean, segment = 'atacado'): ClassifiedNorma => ({
  code,
  classifiedAt: day,
  segment,
  theme: 'Capital',
  applicable,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: '1',
  area: 'Área',
  diretoria: 'Diretoria'
});
const DATA: ClassificationData = {
  asOf: '2021-12-31',
  normas: [
    norma('N1', '2021-02-10', true),
    norma('N2', '2021-03-11', true, 'varejo'),
    norma('N3', '2021-04-12', true),
    norma('N4', '2021-11-30', false)
  ]
};

describe('ApplicabilityChartComponent', () => {
  let fixture: ComponentFixture<ApplicabilityChartComponent>;
  let component: ApplicabilityChartComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ');

  function setup(getClassification: () => ReturnType<ClassificationDataService['getClassification']>) {
    TestBed.configureTestingModule({
    imports: [CardModule, SpinnerModule, ChartjsModule, ApplicabilityChartComponent],
    providers: [
        { provide: ClassificationDataService, useValue: { getClassification, ...localClassificationQueries(getClassification) } },
        { provide: ThemeService, useValue: { appliedTheme$: of('light') } }
    ]
});
    fixture = TestBed.createComponent(ApplicabilityChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Same change the page makes when the Tráfego period or the segment filter changes. */
  function follow(patch: Partial<Pick<ApplicabilityChartComponent, 'bounds' | 'segmentFilter' | 'applicabilityFilter' | 'themeFilter'>>) {
    Object.assign(component, patch);
    const changes = Object.fromEntries(Object.keys(patch).map((key) => [key, { currentValue: 1, previousValue: 0, firstChange: false, isFirstChange: () => false }]));
    component.ngOnChanges(changes);
    fixture.detectChanges();
  }

  it('shows the loading state until the data arrives', () => {
    const data$ = new Subject<ClassificationData>();
    setup(() => data$);
    expect(text()).toContain('Carregando dados...');
    data$.next(DATA);
    fixture.detectChanges();
    expect(root().querySelector('c-chart')).not.toBeNull();
  });

  it('is titled "Normas Aplicáveis"', () => {
    setup(() => of(DATA));
    expect(root().querySelector('h4')?.textContent?.trim()).toBe('Normas Aplicáveis');
  });

  it('draws a pie with applicable and not applicable, the total in the center and a legend with counts', () => {
    setup(() => of(DATA));
    expect(component.chartData?.labels).toEqual(['Aplicáveis', 'Não aplicáveis']);
    expect(component.chartData?.datasets[0].data).toEqual([3, 1]);
    expect(Array.from(root().querySelectorAll('.applicability-center > *')).map((item) => item.textContent?.trim())).toEqual(['4', 'classificadas']);
    const legend = Array.from(root().querySelectorAll('.applicability-legend > li')).map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(legend).toEqual(['Aplicáveis 3 75%', 'Não aplicáveis 1 25%']);
    expect(root().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Gráfico de pizza: 3 aplicáveis (75%) e 1 não aplicáveis (25%) de 4 normas classificadas.'
    );
  });

  it('emits the class of a clicked legend item and fades the other slice while filtered', () => {
    setup(() => of(DATA));
    const emitted: boolean[] = [];
    component.applicabilitySelect.subscribe((value) => emitted.push(value));
    const items = root().querySelectorAll<HTMLButtonElement>('.applicability-legend-item');
    items[1].click();
    expect(emitted).toEqual([false]);
    expect(items[1].hasAttribute('data-page-filter')).toBeTrue();
    follow({ applicabilityFilter: false });
    const after = root().querySelectorAll<HTMLButtonElement>('.applicability-legend-item');
    expect(after[1].getAttribute('aria-pressed')).toBe('true');
    expect(after[0].classList).toContain('is-dimmed');
    const fills = component.chartData?.datasets[0].backgroundColor as string[];
    expect(fills[0]).toMatch(/^rgba\(.*0\.16\)$/);
    expect(fills[1]).not.toMatch(/^rgba/);
    expect([component.pickedOffset(0), component.pickedOffset(1)]).toEqual([0, 10]);
    // The pie does not filter itself: same counts.
    expect(component.chartData?.datasets[0].data).toEqual([3, 1]);
  });

  it('narrows to the theme picked in the themes list', () => {
    setup(() => of({ asOf: '2021-12-31', normas: [...DATA.normas, { ...DATA.normas[3], code: 'N5', theme: 'Pix' }] }));
    follow({ themeFilter: 'Pix' });
    expect(component.chartData?.datasets[0].data).toEqual([0, 1]);
    expect(text()).toContain('· Tema: Pix');
    expect(component.ariaSummary).toContain('Gráfico de pizza do tema Pix');
  });

  it('has no filter of its own and follows the Tráfego dates and the segment filter', () => {
    setup(() => of(DATA));
    expect(root().querySelector('app-period-filter')).toBeNull();
    follow({ bounds: { start: new Date(2021, 10, 1), end: new Date(2021, 11, 31) } });
    expect(component.chartData?.datasets[0].data).toEqual([0, 1]);
    expect(text()).toContain('Novembro a dezembro de 2021');
    follow({ bounds: { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) }, segmentFilter: 'varejo' });
    expect(component.chartData?.datasets[0].data).toEqual([1, 0]);
    expect(text()).toContain('· Varejo');
  });

  it('shows the empty message when nothing was classified in the period', () => {
    setup(() => of(DATA));
    follow({ bounds: { start: new Date(2021, 0, 1), end: new Date(2021, 0, 7) } });
    expect(text()).toContain('Nenhuma norma classificada neste período.');
    expect(root().querySelector('c-chart')).toBeNull();
  });

  it('shows the error state', () => {
    spyOn(console, 'error');
    setup(() => throwError(() => new Error('falha')));
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar a classificação das normas.');
  });

  /** The c-chart canvas after rendering settles: CoreUI shows it (display block) and Chart.js has a live chart on it. */
  async function drawnChart() {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('c-chart canvas') as HTMLCanvasElement | null;
    return { display: canvas?.style.display, chart: canvas ? Chart.getChart(canvas) : undefined };
  }

  it('keeps the pie drawn after a theme is picked in the themes list (chart updated, not torn down)', async () => {
    setup(() => of(DATA));
    expect((await drawnChart()).chart).toBeDefined();
    follow({ themeFilter: 'Capital' });
    const after = await drawnChart();
    expect(after.display).toBe('block');
    expect(after.chart).toBeDefined();
    expect(after.chart?.data.datasets[0].data).toEqual(component.slices.map((slice) => slice.count));
  });
});
