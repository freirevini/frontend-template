import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_RUNTIME_CONFIG, RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { EmailsAggregate } from './emails-derive';
import { EmailsDataService } from './emails-data.service';

const YEAR = { start: new Date(2021, 0, 1), end: new Date(2021, 11, 31) };
const email = (id: string, day: string) => ({
  id,
  sentAt: `${day}T09:14:00-03:00`,
  subject: 'Assunto',
  segment: 'atacado',
  recipients: 1,
  normas: [{ code: 'C1', orgao: 'CMN', tipo: 'Resolução', numero: '1', title: 'Tema', suggestedClass: 'Aplicável', area: 'A', diretoria: 'D' }]
});

describe('EmailsDataService', () => {
  let service: EmailsDataService;
  let http: HttpTestingController;

  const setup = (dataMock: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { config: { ...DEFAULT_RUNTIME_CONFIG, dataMock } } }
      ]
    });
    service = TestBed.inject(EmailsDataService);
    http = TestBed.inject(HttpTestingController);
  };

  afterEach(() => http.verify());

  it('dataMock true: aggregates the local mock (no BFF call)', () => {
    setup(true);
    let aggregate: EmailsAggregate | undefined;
    service.getAggregate({ period: 'Month', bounds: YEAR, segment: null }).subscribe((value) => (aggregate = value));
    http.expectOne('assets/data/dashboard-emails.json').flush({ asOf: '2021-12-31', emails: [email('a', '2021-03-01'), email('b', '2021-05-01')] });
    expect(aggregate?.emails).toBe(2);
    expect(aggregate?.list.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('dataMock false: GET /resumo and the first page of 5 by dataEnvio desc, together', () => {
    setup(false);
    let aggregate: EmailsAggregate | undefined;
    service.getAggregate({ period: 'Year', bounds: YEAR, segment: 'atacado' }).subscribe((value) => (aggregate = value));
    const resumo = http.expectOne((r) => r.url === '/api/v1/emails-sugestao/resumo');
    expect(resumo.request.params.get('granularidade')).toBe('ANO');
    expect(resumo.request.params.get('segmento')).toBe('ATACADO');
    const page = http.expectOne((r) => r.url === '/api/v1/emails-sugestao');
    expect(['page', 'size', 'sort', 'inicio', 'fim'].map((key) => page.request.params.get(key))).toEqual(['0', '5', 'dataEnvio,desc', '2021-01-01', '2021-12-31']);
    page.flush({
      content: [{ id: 'e1', dataEnvio: '2021-12-28T09:14:00-03:00', assunto: 'x', segmento: 'ATACADO', destinatarios: 2, normas: [{ codigo: 'C1', orgao: 'CMN', tipo: 'R', numero: '1', tema: 'T', classeSugerida: 'NAO_APLICAVEL', area: 'A', diretoria: 'D' }] }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 5
    });
    resumo.flush({
      dataReferencia: '2021-12-31', granularidade: 'ANO', inicio: '2021-01-01', fim: '2021-12-31', totalEmails: 1, totalNormas: 1, normasDistintas: 1,
      mediaNormasPorEmail: 1, normasPorSegmento: [{ segmento: 'ATACADO', quantidade: 1 }],
      periodos: [{ inicio: '2021-01-01', fim: '2021-12-31', emails: 1, normasPorSegmento: [{ segmento: 'ATACADO', quantidade: 1 }], totalNormas: 1 }]
    });
    expect(aggregate?.emails).toBe(1);
    expect(aggregate?.buckets).toEqual([{ label: '2021', emails: 1, normas: [1, 0, 0, 0], total: 1 }]);
    expect(aggregate?.list[0].normas[0].suggestedClass).toBe('Não aplicável');
  });
});
