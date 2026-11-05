import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonModule, CardModule, SpinnerModule, TableModule } from '@coreui/angular';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { of, throwError } from 'rxjs';

import { ChatLauncherService } from '../../../chat/chat-launcher.service';
import { iconSubset } from '../../../icons/icon-subset';
import { ClassificationDataService, localClassificationQueries } from '../classification/classification-data.service';
import { ClassificationData, ClassifiedNorma } from '../classification/classification.model';
import { AnalyticTableComponent, ANALYTIC_PAGE_SIZE } from './analytic-table.component';

const norma = (code: string, day: string, theme: string, applicable: boolean, segment = 'atacado', numero = '1'): ClassifiedNorma => ({
  code,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero,
  classifiedAt: day,
  segment,
  theme,
  applicable,
  area: 'Gestão de Capital',
  diretoria: 'Riscos'
});
const DATA: ClassificationData = {
  asOf: '2021-12-31',
  normas: [
    norma('N1', '2021-02-10', 'Capital', true, 'atacado', '4.855'),
    norma('N2', '2021-03-11', 'Capital', false, 'varejo', '300'),
    norma('N3', '2021-04-12', 'Pix', true, 'atacado', '12'),
    norma('N4', '2021-11-30', 'Câmbio', false, 'corporativo', '5.001')
  ]
};

describe('AnalyticTableComponent', () => {
  let fixture: ComponentFixture<AnalyticTableComponent>;
  let component: AnalyticTableComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => (root().textContent ?? '').replace(/\s+/g, ' ');
  const column = (index: number) => Array.from(root().querySelectorAll('tbody tr')).map((row) => row.children[index].textContent?.trim());

  function setup(data: () => ReturnType<ClassificationDataService['getClassification']>) {
    TestBed.configureTestingModule({
    imports: [CardModule, ButtonModule, SpinnerModule, TableModule, IconModule, AnalyticTableComponent],
    providers: [IconSetService, { provide: ClassificationDataService, useValue: { getClassification: data, ...localClassificationQueries(data) } }]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(AnalyticTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function apply(patch: Partial<Pick<AnalyticTableComponent, 'bounds' | 'segmentFilter' | 'applicabilityFilter' | 'themeFilter'>>) {
    Object.assign(component, patch);
    component.ngOnChanges(
      Object.fromEntries(Object.keys(patch).map((key) => [key, { currentValue: 1, previousValue: 0, firstChange: false, isFirstChange: () => false }]))
    );
    fixture.detectChanges();
  }

  it('lists every classified norma of the period, newest first, with the 9 columns in pt-BR', () => {
    setup(() => of(DATA));
    const headers = Array.from(root().querySelectorAll('thead th')).map((cell) => cell.textContent?.trim());
    expect(headers).toEqual(['Data da classificação', 'Órgão', 'Tipo', 'Número', 'Tema', 'Segmento', 'Aplicável ao banco?', 'Área', 'Diretoria', 'Agente da Agenda']);
    expect(column(0)).toEqual(['30/11/2021', '12/04/2021', '11/03/2021', '10/02/2021']);
    expect(column(5)).toEqual(['Corporativo', 'Atacado', 'Varejo', 'Atacado']);
    expect(column(6)).toEqual(['Não', 'Sim', 'Não', 'Sim']);
    expect(text()).toContain('4 normas');
    expect(text()).toContain('Sem filtros');
  });

  it('sends a row to the assistant as a question, with a labelled button per row', () => {
    setup(() => of(DATA));
    const launcher = TestBed.inject(ChatLauncherService);
    spyOn(launcher, 'ask');
    const ask = root().querySelector<HTMLButtonElement>('tbody tr .analytic-ask')!;
    expect(ask.getAttribute('aria-label')).toBe('Perguntar ao Agente da Agenda sobre Resolução CMN nº 5.001');
    ask.click();
    expect(launcher.ask).toHaveBeenCalledOnceWith('Quais são os pontos principais da Resolução CMN nº 5.001?');
  });

  it('keeps the assistant button out of the Excel file', () => {
    setup(() => of(DATA));
    expect(component.xlsxTable().columns.length).toBe(9);
  });

  it('reflects every page filter and names them', () => {
    setup(() => of(DATA));
    apply({ applicabilityFilter: false });
    expect(column(4)).toEqual(['Câmbio', 'Capital']);
    apply({ themeFilter: 'Capital' });
    expect(column(4)).toEqual(['Capital']);
    apply({ segmentFilter: 'atacado' });
    expect(text()).toContain('Nenhuma norma para os filtros aplicados.');
    expect(component.activeFilters).toEqual(['Segmento: Atacado', 'Não aplicáveis', 'Tema: Capital']);
    apply({ segmentFilter: null, applicabilityFilter: null, themeFilter: null, bounds: { start: new Date(2021, 1, 1), end: new Date(2021, 2, 31) } });
    expect(column(0)).toEqual(['11/03/2021', '10/02/2021']);
  });

  it('sorts by a clicked header and flips on a second click; numbers by value', () => {
    setup(() => of(DATA));
    const sortButton = (index: number) => root().querySelectorAll<HTMLButtonElement>('.analytic-sort')[index];
    sortButton(3).click();
    fixture.detectChanges();
    expect(column(3)).toEqual(['12', '300', '4.855', '5.001']);
    expect(root().querySelectorAll('thead th')[3].getAttribute('aria-sort')).toBe('ascending');
    sortButton(3).click();
    fixture.detectChanges();
    expect(column(3)).toEqual(['5.001', '4.855', '300', '12']);
  });

  it('shows pages of 15 rows', () => {
    const many: ClassificationData = {
      asOf: '2021-12-31',
      normas: Array.from({ length: 20 }, (_, index) => norma(`M${index}`, `2021-05-${String(index + 1).padStart(2, '0')}`, 'Pix', true))
    };
    setup(() => of(many));
    expect(root().querySelectorAll('tbody tr').length).toBe(ANALYTIC_PAGE_SIZE);
    expect(text()).toContain('1–15 de 20');
    expect(text()).toContain('Página 1 de 2');
    const next = Array.from(root().querySelectorAll<HTMLButtonElement>('.analytic-pager button')).find((button) => button.textContent?.trim() === 'Próxima');
    next?.click();
    fixture.detectChanges();
    expect(root().querySelectorAll('tbody tr').length).toBe(5);
    expect(text()).toContain('16–20 de 20');
    apply({ themeFilter: 'Pix' });
    expect(component.page).toBe(1);
  });

  it('exports every filtered row sorted as on screen, with the filters in the subtitle and the file name', () => {
    setup(() => of(DATA));
    apply({ applicabilityFilter: true, themeFilter: 'Capital' });
    const table = component.xlsxTable();
    expect(table.sheetName).toBe('Tabela Analítica');
    expect(table.columns.map((item) => item.header)[6]).toBe('Aplicável ao banco?');
    expect(table.rows).toEqual([
      {
        classifiedAt: '10/02/2021',
        orgao: 'CMN',
        tipo: 'Resolução',
        numero: '4.855',
        theme: 'Capital',
        segment: 'Atacado',
        applicable: 'Sim',
        area: 'Gestão de Capital',
        diretoria: 'Riscos'
      }
    ]);
    expect(table.subtitle).toBe('Janeiro a dezembro de 2021 · 1 norma · filtros: Aplicáveis · Tema: Capital');
    expect(table.fileName).toBe('tabela-analitica-2021-01-01-a-2021-12-31-aplicaveis-tema-capital.xlsx');
  });

  it('shows the error state', () => {
    spyOn(console, 'error');
    setup(() => throwError(() => new Error('falha')));
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar a tabela analítica.');
  });
});
