import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonGroupModule, ButtonModule, CardModule, GridModule, SpinnerModule, TableModule } from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { NEVER, of, throwError } from 'rxjs';
import { Chart } from 'chart.js';

import { iconSubset } from '../../../icons/icon-subset';
import { PeriodFilterComponent } from '../../dashboard/period-filter/period-filter.component';
import { WaterfallChartComponent } from './waterfall-chart.component';
import { WaterfallDataService } from './waterfall-data.service';
import { WaterfallData } from './waterfall.model';

const DATA: WaterfallData = {
  period: 'Janeiro a dezembro de 2021',
  baseYear: 2021,
  currency: 'BRL',
  unitScale: 1000000,
  steps: [
    { id: 'gross', label: 'Receita bruta', kind: 'total', parts: [{ label: 'Produto A', value: 30 }, { label: 'Produto B', value: 20 }] },
    { id: 'deductions', label: 'Deduções', kind: 'decrease', parts: [{ label: 'Impostos', value: 10 }] },
    { id: 'result', label: 'Resultado', kind: 'total', parts: [{ label: 'Operacional', value: 40 }] }
  ]
};

describe('WaterfallChartComponent', () => {
  let fixture: ComponentFixture<WaterfallChartComponent>;
  let component: WaterfallChartComponent;

  function setup(service: Partial<WaterfallDataService>) {
    TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, CardModule, GridModule, ButtonModule, ButtonGroupModule, SpinnerModule, TableModule, ChartjsModule, IconModule, WaterfallChartComponent, PeriodFilterComponent],
    providers: [IconSetService, { provide: WaterfallDataService, useValue: service }]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(WaterfallChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('builds one dataset per segment and shows the result', () => {
    setup({ getWaterfall: () => of(DATA) });
    expect(component.state).toBe('ready');
    expect(component.chartData?.datasets.length).toBe(4);
    expect(component.chartData?.labels).toEqual(['Receita bruta', 'Deduções', 'Resultado']);
    const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s/g, ' ') ?? '';
    expect(text).toContain('R$ 40 mi');
    expect(text).toContain('80% da receita bruta');
  });

  it('switches the unit to percent of gross revenue', () => {
    setup({ getWaterfall: () => of(DATA) });
    component.setUnit('percent');
    fixture.detectChanges();
    expect(component.resultLabel).toBe('80%');
  });

  it('renders the table view with every segment', () => {
    setup({ getWaterfall: () => of(DATA) });
    component.setView('table');
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
  });

  it('hides the y axis numbers, keeps its gridlines and uses 11px x ticks', () => {
    setup({ getWaterfall: () => of(DATA) });
    const scales = component.chartOptions?.scales as Record<string, any>;
    expect(scales['y'].ticks.display).toBeFalse();
    expect(scales['y'].border.display).toBeFalse();
    expect(scales['x'].grid.display).toBeFalse();
    expect(scales['x'].ticks.font.size).toBe(11);
    expect(component.chartOptions?.plugins?.tooltip?.padding).toBeUndefined();
  });

  it('renders the unit and view toggles as chips and the period filter', () => {
    setup({ getWaterfall: () => of(DATA) });
    const element = fixture.nativeElement as HTMLElement;
    const unitChips = element.querySelectorAll('[aria-label="Unidade dos valores"] .filter-chip');
    const viewChips = element.querySelectorAll('[aria-label="Forma de exibição"] .filter-chip');
    expect(unitChips.length).toBe(2);
    expect(viewChips.length).toBe(2);
    expect(unitChips[0].classList).toContain('is-active');
    expect(element.querySelector('app-period-filter')).toBeTruthy();
    expect(element.querySelector('app-period-filter .filter-chip.is-active')?.textContent?.trim()).toBe('12 meses');
  });

  it('reloads for the selected period and keeps the unit and view', () => {
    const quarter: WaterfallData = { ...DATA, period: 'Outubro a dezembro de 2021', steps: [
      { id: 'gross', label: 'Receita bruta', kind: 'total', parts: [{ label: 'Produto A', value: 8 }, { label: 'Produto B', value: 2 }] },
      { id: 'deductions', label: 'Deduções', kind: 'decrease', parts: [{ label: 'Impostos', value: 5 }] },
      { id: 'result', label: 'Resultado', kind: 'total', parts: [{ label: 'Operacional', value: 5 }] }
    ] };
    const getWaterfall = jasmine.createSpy('getWaterfall').and.callFake((period: string) => of(period === 'Month' ? DATA : quarter));
    setup({ getWaterfall });
    component.setUnit('percent');
    component.setView('table');
    fixture.detectChanges();

    const bounds = { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) };
    component.onPeriodChange({ period: 'Day', range: null, bounds });
    fixture.detectChanges();

    expect(getWaterfall).toHaveBeenCalledWith('Day', bounds);
    expect(component.period).toBe('Day');
    expect(component.range).toBeNull();
    expect(component.data?.period).toBe('Outubro a dezembro de 2021');
    expect(component.unit).toBe('percent');
    expect(component.view).toBe('table');
    expect(component.resultLabel).toBe('50%');
    expect(component.ariaSummary).toContain('Outubro a dezembro de 2021');
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s/g, ' ') ?? '';
    expect(text).toContain('R$ 5 mi');
  });

  it('shows an error state when loading fails', () => {
    spyOn(console, 'error');
    setup({ getWaterfall: () => throwError(() => new Error('falha')) });
    expect(component.state).toBe('error');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeTruthy();
  });

  describe('period subtitle', () => {
    const subtitle = () =>
      ((fixture.nativeElement as HTMLElement).querySelector('.waterfall-header .text-medium-emphasis')?.textContent ?? '').trim();

    it('reads "Carregando período..." while loading and the data period when ready', () => {
      setup({ getWaterfall: () => NEVER });
      expect(component.state).toBe('loading');
      expect(subtitle()).toBe('Carregando período...');
      TestBed.resetTestingModule();
      setup({ getWaterfall: () => of(DATA) });
      expect(subtitle()).toBe('Janeiro a dezembro de 2021');
    });

    it('is hidden when the load fails, never "Carregando período..."', () => {
      spyOn(console, 'error');
      setup({ getWaterfall: () => throwError(() => new Error('falha')) });
      expect(component.state).toBe('error');
      expect(subtitle()).toBe('');
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Carregando período');
    });

    it('drops the previous period when a later period fails to load', () => {
      spyOn(console, 'error');
      const getWaterfall = jasmine.createSpy('getWaterfall').and.callFake((period: string) =>
        period === 'Month' ? of(DATA) : throwError(() => new Error('falha'))
      );
      setup({ getWaterfall });
      expect(subtitle()).toBe('Janeiro a dezembro de 2021');
      component.onPeriodChange({ period: 'Day', range: null, bounds: { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) } });
      fixture.detectChanges();
      expect(component.state).toBe('error');
      expect(subtitle()).toBe('');
    });
  });

  /** The c-chart canvas after rendering settles: CoreUI shows it (display block) and Chart.js has a live chart on it. */
  async function drawnChart() {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('c-chart canvas') as HTMLCanvasElement | null;
    return { display: canvas?.style.display, chart: canvas ? Chart.getChart(canvas) : undefined };
  }

  it('keeps the chart drawn after the period changes (chart updated, not torn down)', async () => {
    const quarter: WaterfallData = { ...DATA, period: 'Outubro a dezembro de 2021', steps: DATA.steps.slice(0, 2).concat([
      { id: 'result', label: 'Lucro', kind: 'total', parts: [{ label: 'Operacional', value: 40 }] }
    ]) };
    setup({ getWaterfall: (period: string) => of(period === 'Month' ? DATA : quarter) } as Partial<WaterfallDataService>);
    expect((await drawnChart()).chart).toBeDefined();
    component.onPeriodChange({ period: 'Day', range: null, bounds: { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) } });
    const after = await drawnChart();
    expect(after.display).toBe('block');
    expect(after.chart?.data.labels).toEqual(['Receita bruta', 'Deduções', 'Lucro']);
  });
});
