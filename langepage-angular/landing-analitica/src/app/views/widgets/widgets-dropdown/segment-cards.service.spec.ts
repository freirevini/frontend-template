import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { SegmentCardsData, SegmentCardsService, validateSegmentCards } from './segment-cards.service';

const base = (toClassify: number, total = 54): SegmentCardsData => ({
  asOf: '2021-12-31',
  segments: [{ id: 'atacado', label: 'Atacado', icon: 'cilTruck', total, toClassify, trend: [1, 2, 3] }]
});

describe('validateSegmentCards', () => {
  it('accepts consistent segments', () => {
    expect(validateSegmentCards(base(7)).segments.length).toBe(1);
    expect(validateSegmentCards(base(0, 0)).segments[0].toClassify).toBe(0);
  });

  it('rejects normas a classificar above the segment total', () => {
    expect(() => validateSegmentCards(base(60))).toThrowError(/maiores que o total/);
  });

  it('rejects negative or fractional counts and empty lists', () => {
    expect(() => validateSegmentCards(base(-1))).toThrowError(/Quantidades inválidas/);
    expect(() => validateSegmentCards(base(2.5))).toThrowError(/Quantidades inválidas/);
    expect(() => validateSegmentCards({ asOf: '2021-12-31', segments: [] })).toThrowError(/Nenhum segmento/);
  });
});

describe('SegmentCardsService (dataMock)', () => {
  const setup = (dataMock: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock } } }
      ]
    });
    return { service: TestBed.inject(SegmentCardsService), http: TestBed.inject(HttpTestingController) };
  };

  it('reads the local mock with dataMock true (no BFF call)', () => {
    const { service, http } = setup(true);
    let data: SegmentCardsData | undefined;
    service.getSegments().subscribe((value) => (data = value));
    http.expectOne('assets/data/dashboard-segments.json').flush(base(7));
    expect(data?.segments[0].id).toBe('atacado');
    http.verify();
  });

  it('calls GET /api/v1/segmentos and adapts it with dataMock false', () => {
    const { service, http } = setup(false);
    let data: SegmentCardsData | undefined;
    service.getSegments().subscribe((value) => (data = value));
    http
      .expectOne('/api/v1/segmentos')
      .flush({ dataReferencia: '2021-12-31', segmentos: [{ id: 'VAREJO', nome: 'Varejo', total: 44, aClassificar: 6, tendencia: [1] }] });
    expect(data).toEqual({ asOf: '2021-12-31', segments: [{ id: 'varejo', label: 'Varejo', icon: 'cilCart', total: 44, toClassify: 6, trend: [1] }] });
    http.verify();
  });

  it('makes one GET /api/v1/segmentos for cards subscribing together, and a new one for the next view', () => {
    const { service, http } = setup(false);
    const body = { dataReferencia: '2021-12-31', segmentos: [{ id: 'VAREJO', nome: 'Varejo', total: 44, aClassificar: 6, tendencia: [1] }] };
    const received: SegmentCardsData[] = [];
    service.getSegments().subscribe((value) => received.push(value));
    service.getSegments().subscribe((value) => received.push(value));
    http.expectOne('/api/v1/segmentos').flush(body);
    expect(received.length).toBe(2);
    expect(received[0]).toEqual(received[1]);
    service.getSegments().subscribe((value) => received.push(value));
    http.expectOne('/api/v1/segmentos').flush(body);
    expect(received.length).toBe(3);
    http.verify();
  });
});
