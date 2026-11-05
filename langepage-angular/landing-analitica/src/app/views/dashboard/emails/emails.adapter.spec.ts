import { aggregateEmails } from './emails-derive';
import {
  emailsSummaryParams,
  EmailSugestaoV1,
  fromEmailSugestaoV1,
  fromPaginaEmailsV1,
  fromResumoEmailsV1,
  latestEmailsParams,
  ResumoEmailsSugestaoV1
} from './emails.adapter';

const Q4 = { start: new Date(2021, 9, 1), end: new Date(2021, 11, 31) };

/** `EmailSugestao` example of the OpenAPI. */
const EMAIL_V1: EmailSugestaoV1 = {
  id: 'em-2021-12-28-001',
  dataEnvio: '2021-12-28T09:14:00-03:00',
  assunto: 'Sugestões de classificação — Atacado',
  segmento: 'ATACADO',
  destinatarios: 3,
  normas: [
    { codigo: 'Resolução CMN 5.123', orgao: 'CMN', tipo: 'Resolução', numero: '5.123', tema: 'Capital', classeSugerida: 'APLICAVEL_PARCIALMENTE', area: 'Gestão de Capital', diretoria: 'Riscos' },
    { codigo: 'Resolução CMN 5.124', orgao: 'CMN', tipo: 'Resolução', numero: '5.124', tema: 'Capital', classeSugerida: 'APLICAVEL', area: 'Gestão de Capital', diretoria: 'Riscos' }
  ]
};

describe('e-mails adapters (contract v1)', () => {
  it('maps every field of EmailSugestao and NormaSugerida', () => {
    expect(fromEmailSugestaoV1(EMAIL_V1)).toEqual({
      id: 'em-2021-12-28-001',
      sentAt: '2021-12-28T09:14:00-03:00',
      subject: 'Sugestões de classificação — Atacado',
      segment: 'atacado',
      recipients: 3,
      normas: [
        { code: 'Resolução CMN 5.123', orgao: 'CMN', tipo: 'Resolução', numero: '5.123', title: 'Capital', suggestedClass: 'Aplicável parcialmente', area: 'Gestão de Capital', diretoria: 'Riscos' },
        { code: 'Resolução CMN 5.124', orgao: 'CMN', tipo: 'Resolução', numero: '5.124', title: 'Capital', suggestedClass: 'Aplicável', area: 'Gestão de Capital', diretoria: 'Riscos' }
      ]
    });
    const bad = { ...EMAIL_V1, normas: [{ ...EMAIL_V1.normas[0], classeSugerida: 'TALVEZ' }] } as unknown as EmailSugestaoV1;
    expect(() => fromEmailSugestaoV1(bad)).toThrowError(/outside the v1 domain/);
  });

  it('maps PaginaEmailsSugestao to a page', () => {
    expect(fromPaginaEmailsV1({ content: [EMAIL_V1], totalElements: 44, totalPages: 9, number: 0, size: 5 }).total).toBe(44);
  });

  it('maps ResumoEmailsSugestao to the same aggregate the mock computes', () => {
    const latest = [fromEmailSugestaoV1(EMAIL_V1)];
    const resumo: ResumoEmailsSugestaoV1 = {
      dataReferencia: '2021-12-31',
      granularidade: 'MES',
      inicio: '2021-10-01',
      fim: '2021-12-31',
      totalEmails: 1,
      totalNormas: 2,
      normasDistintas: 2,
      mediaNormasPorEmail: 2,
      normasPorSegmento: [{ segmento: 'ATACADO', quantidade: 2 }, { segmento: 'VAREJO', quantidade: 0 }],
      periodos: [
        { inicio: '2021-10-01', fim: '2021-10-31', emails: 0, normasPorSegmento: [], totalNormas: 0 },
        { inicio: '2021-11-01', fim: '2021-11-30', emails: 0, normasPorSegmento: [], totalNormas: 0 },
        { inicio: '2021-12-01', fim: '2021-12-31', emails: 1, normasPorSegmento: [{ segmento: 'ATACADO', quantidade: 2 }], totalNormas: 2 }
      ]
    };
    expect(fromResumoEmailsV1(resumo, latest, 'Month', Q4)).toEqual(aggregateEmails(latest, 'Month', Q4));
  });

  it('refuses a summary whose periods do not match the points of the period', () => {
    const resumo = { periodos: [] } as unknown as ResumoEmailsSugestaoV1;
    expect(() => fromResumoEmailsV1(resumo, [], 'Month', Q4)).toThrowError(/0 periods for 3 points/);
  });

  it('asks the summary by granularity and the latest 5 newest first', () => {
    expect(emailsSummaryParams('Day', Q4, 'varejo')).toEqual({ granularidade: 'DIA', inicio: '2021-10-01', fim: '2021-12-31', segmento: 'VAREJO' });
    expect(latestEmailsParams(Q4, null, 5)).toEqual({ inicio: '2021-10-01', fim: '2021-12-31', page: 0, size: 5, sort: 'dataEnvio,desc' });
  });
});
