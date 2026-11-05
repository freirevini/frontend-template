import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { WaterfallDataService } from './waterfall-data.service';
import { WaterfallData } from './waterfall.model';

describe('WaterfallDataService (dataMock)', () => {
  const bounds = { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) };
  const setup = (dataMock: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock } } }
      ]
    });
    return { service: TestBed.inject(WaterfallDataService), http: TestBed.inject(HttpTestingController) };
  };

  it('dataMock false: GET /api/v1/cascatas-resultado with granularidade, inicio and fim, adapted', () => {
    const { service, http } = setup(false);
    let data: WaterfallData | undefined;
    service.getWaterfall('Month', bounds).subscribe((value) => (data = value));
    const request = http.expectOne((r) => r.url === '/api/v1/cascatas-resultado');
    expect(['granularidade', 'inicio', 'fim'].map((key) => request.request.params.get(key))).toEqual(['MES', '2021-10-01', '2021-12-31']);
    request.flush({ moeda: 'BRL', escalaUnidade: 1000000, etapas: [{ id: 'gross-revenue', rotulo: 'Receita bruta', tipo: 'TOTAL', partes: [{ rotulo: 'A', valor: 2 }] }] });
    expect(data?.period).toBe('Outubro a dezembro de 2021');
    expect(data?.steps[0].kind).toBe('total');
    http.expectNone('assets/data/dashboard-waterfall.json');
    http.verify();
  });

  it('dataMock true: reads only the mock base', () => {
    const { service, http } = setup(true);
    service.getWaterfall('Month', bounds).subscribe();
    http.expectOne('assets/data/dashboard-waterfall.json');
    http.verify();
  });
});
