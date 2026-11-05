import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonGroupModule, ButtonModule, CardModule, GridModule, SpinnerModule, TableModule } from '@coreui/angular';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { of, Subject, throwError } from 'rxjs';
import { Chart } from 'chart.js';

import { iconSubset } from '../../../icons/icon-subset';
import { ThemeService } from '../../../core/services/theme.service';
import { PeriodFilterComponent } from '../period-filter/period-filter.component';
import { EmailsChartComponent } from './emails-chart.component';
import { EmailsDataService, localEmailQueries } from './emails-data.service';
import { EmailsData, SuggestionEmail } from './emails.model';

const norma = (code: string) => ({
  code,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: code,
  title: `Título ${code}`,
  suggestedClass: 'Aplicável' as const,
  area: 'Gestão de Capital',
  diretoria: 'Riscos'
});
const mail = (id: string, day: string, segment: string, codes: string[]): SuggestionEmail => ({
  id,
  sentAt: `${day}T09:14:00-03:00`,
  subject: `Sugestões de classificação — ${segment}`,
  segment,
  recipients: 3,
  normas: codes.map(norma)
});
const DATA: EmailsData = {
  asOf: '2021-12-31',
  emails: [
    mail('a', '2021-02-10', 'atacado', ['A1', 'A2']),
    mail('b', '2021-02-11', 'varejo', ['V1']),
    mail('c', '2021-11-30', 'atacado', ['A1', 'A3', 'A4'])
  ]
};

describe('EmailsChartComponent', () => {
  let fixture: ComponentFixture<EmailsChartComponent>;
  let component: EmailsChartComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ');

  function setup(getEmails: () => ReturnType<EmailsDataService['getEmails']>) {
    TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, CardModule, GridModule, ButtonModule, ButtonGroupModule, SpinnerModule, TableModule, ChartjsModule, IconModule, EmailsChartComponent, PeriodFilterComponent],
    providers: [
        IconSetService,
        { provide: EmailsDataService, useValue: { getEmails, ...localEmailQueries(getEmails) } },
        { provide: ThemeService, useValue: { appliedTheme$: of('light') } }
    ]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(EmailsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows the loading state until the data arrives', () => {
    const pending = new Subject<EmailsData>();
    setup(() => pending);
    expect(component.state).toBe('loading');
    expect(text()).toContain('Carregando dados...');
    pending.next(DATA);
    fixture.detectChanges();
    expect(component.state).toBe('ready');
  });

  it('shows indicators and builds one stacked dataset per segment', () => {
    setup(() => of(DATA));
    expect(component.state).toBe('ready');
    expect(component.aggregate?.emails).toBe(3);
    expect(component.chartData?.datasets.map((dataset) => dataset.label)).toEqual(['Atacado', 'Corporativo', 'Plataforma', 'Varejo']);
    expect(component.chartData?.labels?.length).toBe(12);
    const stats = Array.from(root().querySelectorAll('.emails-stat')).map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(stats).toEqual(['E-mails enviados3', 'Normas sugeridas 6 5 distintas', 'Média por e-mail2,0']);
    expect(root().querySelector('.emails-chart')?.getAttribute('aria-label')).toContain('3 e-mails e 6 normas sugeridas');
  });

  it('shows the error state', () => {
    setup(() => throwError(() => new Error('boom')));
    expect(component.state).toBe('error');
    expect(text()).toContain('Não foi possível carregar os e-mails.');
  });

  it('shows the empty message when the period has no e-mails', () => {
    setup(() => of({ asOf: '2021-12-31', emails: [] }));
    expect(text()).toContain('Nenhum e-mail enviado neste período.');
    expect(root().querySelector('c-chart')).toBeNull();
  });

  it('recalculates when the period changes', () => {
    setup(() => of(DATA));
    component.onPeriodChange({ period: 'Month', range: null, bounds: { start: new Date(2021, 0, 1), end: new Date(2021, 2, 31) } });
    fixture.detectChanges();
    expect(component.aggregate?.emails).toBe(2);
    expect(component.chartData?.labels).toEqual(['Janeiro', 'Fevereiro', 'Março']);
  });

  it('keeps only the filtered segment and clears the highlight', () => {
    setup(() => of(DATA));
    component.toggleHighlight(0);
    component.segmentFilter = 'atacado';
    component.ngOnChanges({ segmentFilter: { currentValue: 'atacado', previousValue: null, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();
    expect(component.highlighted).toBeNull();
    expect(component.chartData?.datasets.length).toBe(1);
    expect(component.aggregate?.emails).toBe(2);
    expect(component.legend.map((item) => item.label)).toEqual(['Atacado']);
    expect(text()).toContain('Atacado');
  });

  it('toggles the legend highlight and dims the other segments', () => {
    setup(() => of(DATA));
    component.toggleHighlight(3);
    expect(component.highlighted).toBe(3);
    expect(component.isDimmed(0)).toBeTrue();
    expect(component.isDimmed(3)).toBeFalse();
    component.toggleHighlight(3);
    expect(component.highlighted).toBeNull();
  });

  it('shows the table view with totals and the export button only there', () => {
    setup(() => of(DATA));
    expect(root().querySelector('.emails-export')).toBeNull();
    component.setView('table');
    fixture.detectChanges();
    const rows = root().querySelectorAll('.emails-table tbody tr');
    expect(rows.length).toBe(12);
    const cells = Array.from(root().querySelectorAll('.emails-table tfoot th, .emails-table tfoot td')).map((cell) => cell.textContent?.trim());
    expect(cells).toEqual(['Total', '3', '5', '0', '0', '1', '6']);
    expect(root().querySelector('.emails-export')).not.toBeNull();
  });

  it('builds the spreadsheet with period, segment columns, totals and a file name', () => {
    setup(() => of(DATA));
    const table = component.xlsxTable();
    expect(table.title).toBe('Fluxo de e-mail - Triagem');
    expect(root().querySelector('#emails-title')?.textContent?.trim()).toBe('Fluxo de e-mail - Triagem');
    expect(table.columns.map((column) => column.header)).toEqual(['Período', 'E-mails', 'Atacado', 'Corporativo', 'Plataforma', 'Varejo', 'Total de normas']);
    expect(table.rows.length).toBe(12);
    expect(table.rows[1]['total']).toBe(3);
    expect(table.totals?.['total']).toBe(6);
    expect(table.totals?.['emails']).toBe(3);
    expect(table.fileName).toBe('fluxo-email-triagem-2021-01-01-a-2021-12-31.xlsx');
  });

  it('adds the segment to the spreadsheet when the page filter is on', () => {
    setup(() => of(DATA));
    component.segmentFilter = 'varejo';
    component.ngOnChanges({ segmentFilter: { currentValue: 'varejo', previousValue: null, firstChange: false, isFirstChange: () => false } });
    const table = component.xlsxTable();
    expect(table.columns.map((column) => column.header)).toEqual(['Período', 'E-mails', 'Varejo', 'Total de normas']);
    expect(table.subtitle).toContain('segmento: Varejo');
    expect(table.fileName).toBe('fluxo-email-triagem-2021-01-01-a-2021-12-31-varejo.xlsx');
  });

  it('lists the latest e-mails, newest first, and opens their normas', () => {
    setup(() => of(DATA));
    const heads = root().querySelectorAll<HTMLButtonElement>('.emails-item-head');
    expect(heads.length).toBe(3);
    const head = (heads[0].textContent ?? '').replace(/\s+/g, ' ');
    expect(head).toContain('30/11/2021');
    expect(head).not.toContain('09:14');
    expect(head).toContain('Atacado');
    expect(head).not.toContain('Sugestões de classificação');
    expect(head).not.toContain('destinatário');
    expect(heads[0].textContent).toContain('3 normas');
    expect(heads[1].textContent).toContain('1 norma');
    expect(heads[0].getAttribute('aria-expanded')).toBe('false');
    heads[0].click();
    fixture.detectChanges();
    expect(heads[0].getAttribute('aria-expanded')).toBe('true');
    expect(text()).toContain('Título A3');
    expect(root().querySelectorAll('.emails-normas tbody tr').length).toBe(3);
    const headers = Array.from(root().querySelectorAll('.emails-normas thead th')).map((cell) => cell.textContent?.trim());
    expect(headers).toEqual(['Órgão', 'Tipo', 'Número', 'Tema', 'Aplicável ao segmento?', 'Área', 'Diretoria']);
    const cells = Array.from(root().querySelectorAll('.emails-normas tbody tr')[0].children).map((cell) => cell.textContent?.trim());
    expect(cells).toEqual(['CMN', 'Resolução', 'A1', 'Título A1', 'Sim', 'Gestão de Capital', 'Riscos']);
    heads[0].click();
    fixture.detectChanges();
    expect(root().querySelector('.emails-normas')).toBeNull();
  });

  it('offers Dia and Mês only and shows the legend under the chart', () => {
    setup(() => of(DATA));
    const granularity = Array.from(root().querySelectorAll('.period-filter-granularity button')).map((button) => button.textContent?.trim());
    expect(granularity).toEqual(['Dia', 'Mês']);
    const chart = root().querySelector('.emails-chart') as HTMLElement;
    const legend = root().querySelector('.emails-legend') as HTMLElement;
    expect(chart.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lists at most five e-mails', () => {
    const many: EmailsData = { asOf: '2021-12-31', emails: Array.from({ length: 8 }, (_, index) => mail(`m${index}`, `2021-05-${String(index + 1).padStart(2, '0')}`, 'atacado', ['X'])) };
    setup(() => of(many));
    expect(root().querySelectorAll('.emails-item').length).toBe(5);
  });

  describe('period subtitle', () => {
    const subtitle = () => (root().querySelector('.emails-header .text-medium-emphasis')?.textContent ?? '').replace(/\s+/g, ' ').trim();

    it('reads "Carregando período..." while loading and the period when ready', () => {
      const pending = new Subject<EmailsData>();
      setup(() => pending);
      expect(subtitle()).toBe('Carregando período...');
      pending.next(DATA);
      fixture.detectChanges();
      expect(subtitle()).toBe(component.aggregate?.subtitle ?? 'sem subtítulo');
    });

    it('is hidden when the load fails, never "Carregando período..."', () => {
      spyOn(console, 'error');
      setup(() => throwError(() => new Error('boom')));
      expect(component.state).toBe('error');
      expect(subtitle()).toBe('');
      expect(text()).not.toContain('Carregando período');
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
    setup(() => of(DATA));
    expect((await drawnChart()).chart).toBeDefined();
    component.onPeriodChange({ period: 'Month', range: null, bounds: { start: new Date(2021, 0, 1), end: new Date(2021, 2, 31) } });
    const after = await drawnChart();
    expect(after.display).toBe('block');
    expect(after.chart?.data.labels?.length).toBe(3);
  });
});
