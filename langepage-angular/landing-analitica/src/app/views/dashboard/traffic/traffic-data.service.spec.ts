import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { ApiProblem } from '../../../core/http/api-problem';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardChartsData, presetRange } from '../dashboard-charts-data';
import { DashboardComponent } from '../dashboard.component';
import { TrafficDataService, TrafficResponse } from './traffic-data.service';

describe('TrafficDataService', () => {
  it('GET /api/v1/normativos-recebidos with the period; mock flag from the runtime config', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock: false } } }
      ]
    });
    const service = TestBed.inject(TrafficDataService);
    const http = TestBed.inject(HttpTestingController);
    expect(service.mock).toBeFalse();
    let response: TrafficResponse | undefined;
    service.getTraffic('Year', presetRange('Year', 3)).subscribe((value) => (response = value));
    const request = http.expectOne((r) => r.url === '/api/v1/normativos-recebidos');
    expect(['granularidade', 'inicio', 'fim'].map((key) => request.request.params.get(key))).toEqual(['ANO', '2019-01-01', '2021-12-31']);
    request.flush({ granularidade: 'ANO', inicio: '2019-01-01', fim: '2021-12-31', pontos: ['2019'], segmentos: [] });
    expect(response?.period).toBe('Year');
    http.verify();
  });
});

describe('DashboardComponent with BFF data (dataMock false)', () => {
  const themeService = { appliedTheme$: of('light') } as unknown as ThemeService;
  const series = (points: number, value: number) => Array.from({ length: points }, () => value);
  const response = (points: number): TrafficResponse => ({
    period: 'Month',
    start: '',
    end: '',
    points: [],
    segments: ['atacado', 'corporativo', 'plataforma', 'varejo'].map((segment, index) => ({
      segment,
      label: segment,
      classified: series(points, 400 + index),
      toClassify: series(points, 2)
    }))
  });

  it('shows the BFF values (never the mock ones) and asks again when the period changes', () => {
    const calls: string[] = [];
    const traffic = {
      mock: false,
      getTraffic: (period: string, bounds: { start: Date }) => {
        calls.push(`${period} ${bounds.start.getFullYear()}-${bounds.start.getMonth() + 1}`);
        return of(response(period === 'Month' ? (calls.length === 1 ? 12 : 3) : 0));
      }
    } as unknown as TrafficDataService;
    const component = new DashboardComponent(new DashboardChartsData(), themeService, traffic);
    component.ngOnInit();
    expect(component.trafficState).toBe('ready');
    expect(component.mainChart.data.datasets[0].data).toEqual(series(12, 400));
    // y axis follows the data (403 + 10% rounded to 5), not the mock's fixed 250.
    expect(component.mainChart.options.scales.y.max).toBe(445);
    component.onTrafficPeriod({ period: 'Month', range: 3, bounds: presetRange('Month', 3) });
    expect(calls).toEqual(['Month 2021-1', 'Month 2021-10']);
    expect(component.mainChart.data.labels).toEqual(['Outubro', 'Novembro', 'Dezembro']);
    expect(component.trafficSummary[0].total).toBe(1200);
    component.ngOnDestroy();
  });

  it('keeps the error (for the pt-BR text and support code) and hides the totals', () => {
    spyOn(console, 'error');
    const problem = new ApiProblem(503, 'SIS-001', 'trace-1');
    const traffic = { mock: false, getTraffic: () => throwError(() => problem) } as unknown as TrafficDataService;
    const component = new DashboardComponent(new DashboardChartsData(), themeService, traffic);
    component.ngOnInit();
    expect(component.trafficState).toBe('error');
    expect(component.trafficProblem).toBe(problem);
    component.ngOnDestroy();
  });

  it('refuses data that does not fit the period (one value per point)', () => {
    spyOn(console, 'error');
    const traffic = { mock: false, getTraffic: () => of(response(5)) } as unknown as TrafficDataService;
    const component = new DashboardComponent(new DashboardChartsData(), themeService, traffic);
    component.ngOnInit();
    expect(component.trafficState).toBe('error');
    component.ngOnDestroy();
  });

  it('with dataMock true keeps the in-memory mock and never calls the service', () => {
    const traffic = jasmine.createSpyObj<TrafficDataService>('TrafficDataService', ['getTraffic'], { mock: true });
    const component = new DashboardComponent(new DashboardChartsData(), themeService, traffic);
    component.ngOnInit();
    component.onTrafficPeriod({ period: 'Day', range: 7, bounds: presetRange('Day', 7) });
    expect(traffic.getTraffic).not.toHaveBeenCalled();
    expect(component.trafficState).toBe('ready');
    expect(component.mainChart.options.scales.y.max).toBe(250);
    component.ngOnDestroy();
  });
});
