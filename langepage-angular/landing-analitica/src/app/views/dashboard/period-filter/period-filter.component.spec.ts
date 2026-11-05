import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonGroupModule, ButtonModule } from '@coreui/angular';
import { IconModule, IconSetService } from '@coreui/icons-angular';

import { iconSubset } from '../../../icons/icon-subset';
import { PeriodFilterComponent, PeriodSelection } from './period-filter.component';

describe('PeriodFilterComponent', () => {
  let fixture: ComponentFixture<PeriodFilterComponent>;
  let component: PeriodFilterComponent;
  let emitted: PeriodSelection[];

  const date = (year: number, month: number, day: number) => new Date(year, month - 1, day);
  const chips = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.filter-chip'));

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [ReactiveFormsModule, ButtonModule, ButtonGroupModule, IconModule, PeriodFilterComponent],
    providers: [IconSetService]
});
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(PeriodFilterComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.selectionChange.subscribe((selection) => emitted.push(selection));
    fixture.detectChanges();
  });

  it('starts on Mês with the month presets and "Personalizado"', () => {
    expect(component.period).toBe('Month');
    expect(component.range).toBe(12);
    expect(chips().map((chip) => chip.textContent?.trim())).toEqual(['3 meses', '6 meses', '12 meses', 'Personalizado']);
    expect(chips()[2].classList).toContain('is-active');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dia');
    expect(text).toContain('Mês');
    expect(text).toContain('Ano');
    expect(text).toContain('Últimos');
  });

  it('offers only the granularities it receives', () => {
    component.periods = ['Day', 'Month'];
    fixture.detectChanges();
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.period-filter-granularity button')).map((button) => button.textContent?.trim());
    expect(labels).toEqual(['Dia', 'Mês']);
  });

  it('emits the preset range with its dates', () => {
    component.setRange(3);
    expect(emitted.length).toBe(1);
    expect(emitted[0].period).toBe('Month');
    expect(emitted[0].range).toBe(3);
    expect(emitted[0].bounds.start).toEqual(date(2021, 10, 1));
    expect(emitted[0].bounds.end).toEqual(date(2021, 12, 31));
  });

  it('switches the granularity to its default preset and offers its ranges', () => {
    component.setPeriod('Day');
    fixture.detectChanges();
    expect(emitted[0]).toEqual(jasmine.objectContaining({ period: 'Day', range: 7 }));
    expect(component.rangeOptions.map((option) => option.label)).toEqual(['7 dias', '15 dias', '30 dias']);
    expect(component.customNotice).toBeNull();
  });

  describe('intervalo personalizado', () => {
    it('opens prefilled with the dates on screen and closes on Cancelar', () => {
      component.toggleCustomRange();
      fixture.detectChanges();
      expect(component.customOpen).toBeTrue();
      expect(component.customForm.getRawValue()).toEqual({ start: '2021-01-01', end: '2021-12-31' });
      expect((fixture.nativeElement as HTMLElement).querySelector(`form#${component.customFormId}`)).toBeTruthy();
      component.toggleCustomRange();
      expect(component.customOpen).toBeFalse();
    });

    it('applies a valid range as a custom selection', () => {
      component.toggleCustomRange();
      component.customForm.setValue({ start: '2021-03-01', end: '2021-06-30' });
      component.applyCustomRange();
      expect(component.customError).toBeNull();
      expect(component.customOpen).toBeFalse();
      expect(emitted[0].range).toBeNull();
      expect(emitted[0].bounds).toEqual({ start: date(2021, 3, 1), end: date(2021, 6, 30) });
      expect(component.range).toBeNull();
    });

    it('shows the validation messages in pt-BR and emits nothing', () => {
      component.toggleCustomRange();
      component.customForm.setValue({ start: '', end: '2021-06-30' });
      component.applyCustomRange();
      expect(component.customError).toBe('Informe as duas datas.');

      component.customForm.setValue({ start: '2021-06-30', end: '2021-03-01' });
      component.applyCustomRange();
      expect(component.customError).toBe('A data inicial deve ser anterior ou igual à data final.');

      component.setPeriod('Day');
      emitted = [];
      component.toggleCustomRange();
      component.customForm.setValue({ start: '2021-01-01', end: '2021-12-31' });
      component.applyCustomRange();
      expect(component.customError).toContain('até 92 dias');
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('até 92 dias');
      expect(emitted.length).toBe(0);
      expect(component.customOpen).toBeTrue();
    });

    it('carries a custom range to a granularity it fits, otherwise falls back with a notice', () => {
      component.toggleCustomRange();
      component.customForm.setValue({ start: '2021-12-01', end: '2021-12-31' });
      component.applyCustomRange();
      component.setPeriod('Day');
      expect(emitted[1]).toEqual(jasmine.objectContaining({ period: 'Day', range: null }));
      expect(component.customNotice).toBeNull();

      component.setPeriod('Year');
      component.toggleCustomRange();
      component.customForm.setValue({ start: '2017-01-01', end: '2021-12-31' });
      component.applyCustomRange();
      component.setPeriod('Day');
      const last = emitted[emitted.length - 1];
      expect(last.period).toBe('Day');
      expect(last.range).toBe(7);
      expect(component.customNotice).toContain('últimos 7 dias');
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent).toContain('não cabe nesta visão');
    });

  });

  it('follows a selection pushed by the parent', () => {
    component.period = 'Year';
    component.range = 3;
    component.bounds = { start: date(2019, 1, 1), end: date(2021, 12, 31) };
    component.ngOnChanges({ period: {} as never, range: {} as never, bounds: {} as never });
    fixture.detectChanges();
    expect(chips().map((chip) => chip.textContent?.trim())).toEqual(['3 anos', '5 anos', 'Personalizado']);
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
  });
});
