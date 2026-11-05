import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardModule, SpinnerModule } from '@coreui/angular';
import { of, throwError } from 'rxjs';

import { ClassificationDataService, localClassificationQueries } from './classification-data.service';
import { ClassificationData, ClassifiedNorma } from './classification.model';
import { ThemesListComponent } from './themes-list.component';

const norma = (code: string, day: string, theme: string, applicable: boolean, segment = 'atacado'): ClassifiedNorma => ({
  code,
  classifiedAt: day,
  segment,
  theme,
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
    norma('N1', '2021-02-10', 'Capital', true),
    norma('N2', '2021-03-11', 'Capital', true, 'varejo'),
    norma('N3', '2021-04-12', 'Pix', true),
    norma('N4', '2021-11-30', 'Câmbio', false)
  ]
};

describe('ThemesListComponent', () => {
  let fixture: ComponentFixture<ThemesListComponent>;
  let component: ThemesListComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const rows = () =>
    Array.from(root().querySelectorAll('.theme-row')).map((row) =>
      Array.from(row.children).map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')
    );

  function setup(getClassification: () => ReturnType<ClassificationDataService['getClassification']>) {
    TestBed.configureTestingModule({
    imports: [CardModule, SpinnerModule, ThemesListComponent],
    providers: [{ provide: ClassificationDataService, useValue: { getClassification, ...localClassificationQueries(getClassification) } }]
});
    fixture = TestBed.createComponent(ThemesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('lists the themes of the applicable normas, largest first, with count and share', () => {
    setup(() => of(DATA));
    expect(root().querySelector('h4')?.textContent?.trim()).toBe('Assunto das Normas Aplicáveis');
    expect(rows()).toEqual(['Capital 2 67%', 'Pix 1 33%']);
    expect(root().textContent).not.toContain('Câmbio');
    expect(root().querySelector('app-period-filter')).toBeNull();
  });

  it('emits a clicked theme and highlights it while filtered, without filtering itself', () => {
    setup(() => of(DATA));
    const emitted: string[] = [];
    component.themeSelect.subscribe((theme) => emitted.push(theme));
    const buttons = root().querySelectorAll<HTMLButtonElement>('button.theme-row');
    buttons[1].click();
    expect(emitted).toEqual(['Pix']);
    component.themeFilter = 'Pix';
    component.ngOnChanges({ themeFilter: { currentValue: 'Pix', previousValue: null, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();
    const after = root().querySelectorAll<HTMLButtonElement>('button.theme-row');
    expect(after[1].getAttribute('aria-pressed')).toBe('true');
    expect(after[0].classList).toContain('is-dimmed');
    expect(rows()).toEqual(['Capital 2 67%', 'Pix 1 33%']);
  });

  it('lists the themes of the not applicable normas when that slice is picked', () => {
    setup(() => of(DATA));
    component.applicabilityFilter = false;
    component.ngOnChanges({ applicabilityFilter: { currentValue: false, previousValue: null, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();
    expect(root().querySelector('h4')?.textContent).toContain('Assunto das Normas Não Aplicáveis');
    expect(rows()).toEqual(['Câmbio 1 100%']);
  });

  it('follows the segment filter and the Tráfego dates', () => {
    setup(() => of(DATA));
    component.segmentFilter = 'varejo';
    component.ngOnChanges({ segmentFilter: { currentValue: 'varejo', previousValue: null, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();
    expect(rows()).toEqual(['Capital 1 100%']);
    component.segmentFilter = null;
    component.bounds = { start: new Date(2021, 10, 1), end: new Date(2021, 11, 31) };
    component.ngOnChanges({ bounds: { currentValue: component.bounds, previousValue: null, firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();
    expect(root().textContent).toContain('Nenhuma norma aplicável neste período.');
  });

  it('shows the error state', () => {
    spyOn(console, 'error');
    setup(() => throwError(() => new Error('falha')));
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar a classificação das normas.');
  });
});
