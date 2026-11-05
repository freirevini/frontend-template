import { of } from 'rxjs';

import { ThemeService } from '../../core/services/theme.service';
import { DashboardChartsData, presetRange, TO_CLASSIFY_INDEX } from './dashboard-charts-data';
import { DashboardComponent } from './dashboard.component';

/** Period selection and legend logic of the Tráfego chart (the filter UI itself is tested in PeriodFilterComponent). */
describe('DashboardComponent (Tráfego)', () => {
  let component: DashboardComponent;

  beforeEach(() => {
    const themeService = { appliedTheme$: of('light') } as unknown as ThemeService;
    component = new DashboardComponent(new DashboardChartsData(), themeService);
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('starts on Mês with the last 12 months', () => {
    expect(component.trafficPeriod).toBe('Month');
    expect(component.trafficRange).toBe(12);
    expect(component.mainChart['subtitle']).toBe('Janeiro a dezembro de 2021');
  });

  it('applies a preset selection from the shared filter', () => {
    component.onTrafficPeriod({ period: 'Day', range: 15, bounds: presetRange('Day', 15) });
    expect(component.trafficPeriod).toBe('Day');
    expect(component.trafficRange).toBe(15);
    expect(component.mainChart.data.labels.length).toBe(15);
    expect(component.trafficBounds).toEqual(presetRange('Day', 15));
  });

  it('applies a custom date range from the shared filter', () => {
    const bounds = { start: new Date(2021, 2, 1), end: new Date(2021, 5, 30) };
    component.onTrafficPeriod({ period: 'Month', range: null, bounds });
    expect(component.trafficRange).toBeNull();
    expect(component.mainChart.data.labels).toEqual(['Março', 'Abril', 'Maio', 'Junho']);
    expect(component.mainChart['subtitle']).toBe('Março a junho de 2021');
  });

  it('keeps the legend highlight when the period changes', () => {
    component.toggleHighlight(2);
    component.onTrafficPeriod({ period: 'Month', range: 6, bounds: presetRange('Month', 6) });
    expect(component.highlighted).toBe(2);
    expect(component.isLegendDimmed(0)).toBeTrue();
    expect(component.isLegendDimmed(TO_CLASSIFY_INDEX)).toBeFalse();
  });

  describe('segment cards filter ("a classificar")', () => {
    const click = (element: Element) => {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: element });
      component.onDocumentClick(event);
    };

    it('applies the filter: only the segment\'s "Normas a Classificar" line stays active', () => {
      component.onToClassifySelect('plataforma');
      expect(component.segmentFilter).toBe('plataforma');
      expect(component.segmentFilterLabel).toBe('Plataforma');
      expect(component.highlighted).toBe(TO_CLASSIFY_INDEX);
      expect(component.mainChart.data.datasets[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar · Plataforma');
      expect(component.isLegendDimmed(0)).toBeTrue();
    });

    it('removes the filter when the same badge is clicked again', () => {
      component.onToClassifySelect('varejo');
      component.onToClassifySelect('varejo');
      expect(component.segmentFilter).toBeNull();
      expect(component.highlighted).toBeNull();
    });

    it('switches segment when another badge is clicked', () => {
      component.onToClassifySelect('atacado');
      component.onToClassifySelect('corporativo');
      expect(component.segmentFilter).toBe('corporativo');
    });

    it('removes the filter on a click outside the badges, but not on a badge', () => {
      component.onToClassifySelect('atacado');
      const badge = document.createElement('button');
      badge.setAttribute('data-segment-filter', '');
      click(badge);
      expect(component.segmentFilter).toBe('atacado');
      click(document.createElement('div'));
      expect(component.segmentFilter).toBeNull();
    });

    it('keeps a legend highlight picked by the click that removed the filter', () => {
      component.onToClassifySelect('atacado');
      component.toggleHighlight(2);
      click(document.createElement('button'));
      expect(component.segmentFilter).toBeNull();
      expect(component.highlighted).toBe(2);
    });

    it('removes the filter with Esc', () => {
      component.onToClassifySelect('varejo');
      component.onEscape();
      expect(component.segmentFilter).toBeNull();
    });
  });

  describe('classification cross filters (pizza × temas)', () => {
    const click = (element: Element) => {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: element });
      component.onDocumentClick(event);
    };
    const control = (attribute: string) => {
      const element = document.createElement('button');
      element.setAttribute(attribute, '');
      return element;
    };

    it('toggles the applicability and the theme filters independently and names them', () => {
      component.onApplicabilitySelect(false);
      component.onThemeSelect('Pix');
      expect(component.applicabilityFilter).toBeFalse();
      expect(component.themeFilter).toBe('Pix');
      expect(component.classificationFilterLabel).toBe('Não aplicáveis · Tema: Pix');
      component.onApplicabilitySelect(false);
      component.onThemeSelect('Câmbio');
      expect(component.applicabilityFilter).toBeNull();
      expect(component.themeFilter).toBe('Câmbio');
      component.onThemeSelect('Câmbio');
      expect(component.themeFilter).toBeNull();
    });

    it('keeps every filter on a click on a filter control and clears them all on a click outside or Esc', () => {
      component.onToClassifySelect('atacado');
      component.onApplicabilitySelect(true);
      component.onThemeSelect('Pix');
      click(control('data-page-filter'));
      const sidebar = document.createElement('div');
      sidebar.className = 'sidebar';
      const menuLink = document.createElement('a');
      sidebar.appendChild(menuLink);
      click(menuLink);
      click(control('data-segment-filter'));
      expect([component.segmentFilter, component.applicabilityFilter, component.themeFilter]).toEqual(['atacado', true, 'Pix']);
      click(document.createElement('div'));
      expect([component.segmentFilter, component.applicabilityFilter, component.themeFilter]).toEqual([null, null, null]);
      component.onThemeSelect('Pix');
      component.onEscape();
      expect(component.themeFilter).toBeNull();
    });
  });

  describe('Gráfico / Tabela e exportação Excel', () => {
    it('starts on the chart and switches to the table', () => {
      expect(component.trafficView).toBe('chart');
      component.setTrafficView('table');
      expect(component.trafficView).toBe('table');
    });

    it('builds the table from the chart: one row per period, one column per series, totals per column', () => {
      const table = component.trafficTable;
      const datasets = component.mainChart.data.datasets as { label: string; data: number[] }[];
      expect(table.columns.map((column) => column.label)).toEqual(datasets.map((dataset) => dataset.label));
      expect(table.rows.length).toBe(12);
      expect(table.rows[0].period).toBe('Janeiro');
      expect(table.rows[0].values).toEqual(datasets.map((dataset) => dataset.data[0]));
      expect(table.totals[0]).toBe(datasets[0].data.reduce((sum, value) => sum + value, 0));
      expect(table.columns[TO_CLASSIFY_INDEX].dashed).toBeTrue();
    });

    it('follows the segment filter in the table and in the spreadsheet', () => {
      component.onToClassifySelect('varejo');
      expect(component.trafficTable.columns[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar · Varejo');
      const xlsx = component.trafficXlsxTable();
      expect(xlsx.fileName).toBe('normativos-recebidos-2021-01-01-a-2021-12-31-a-classificar-varejo.xlsx');
      expect(xlsx.subtitle).toContain('filtro: normas a classificar · Varejo');
      expect([xlsx.sheetName, xlsx.title]).toEqual(['Normativos Recebidos', 'Normativos recebidos por segmento']);
      expect(xlsx.columns.map((column) => column.header)[0]).toBe('Período');
      expect(xlsx.rows.length).toBe(12);
      expect(xlsx.totals?.['period']).toBe('Total');
    });

    it('names the file after the period on screen', () => {
      component.onTrafficPeriod({ period: 'Day', range: 7, bounds: presetRange('Day', 7) });
      expect(component.trafficXlsxTable().fileName).toBe('normativos-recebidos-2021-12-25-a-2021-12-31.xlsx');
    });

    it('keeps the page filters through the Excel download; a real click outside still clears them', async () => {
      // The native click of the download link, minus the download itself: same bubbling event, default action blocked.
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        this.addEventListener('click', (event) => event.preventDefault(), { once: true });
        this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      // Same wiring as @HostListener('document:click') in the running app.
      const listener = (event: MouseEvent) => component.onDocumentClick(event);
      document.addEventListener('click', listener);
      const outside = document.body.appendChild(document.createElement('div'));
      try {
        component.onToClassifySelect('varejo');
        component.onApplicabilitySelect(true);
        component.onThemeSelect('Pix');
        await component.exportTrafficXlsx();
        expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
        expect(component.exportError).toBeNull();
        expect([component.segmentFilter, component.applicabilityFilter, component.themeFilter]).toEqual(['varejo', true, 'Pix']);
        outside.click();
        expect([component.segmentFilter, component.applicabilityFilter, component.themeFilter]).toEqual([null, null, null]);
      } finally {
        document.removeEventListener('click', listener);
        outside.remove();
      }
    });
  });
});
