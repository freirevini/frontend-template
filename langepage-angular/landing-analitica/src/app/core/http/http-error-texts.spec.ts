import { EXPORT_LIMIT_TEXT, EXPORT_MAX_ROWS, exportLimitText } from './http-error-texts';

describe('export limit text', () => {
  it('has the pt-BR text of docs/contratos-de-dados.md section 2.4, with the same cap as EXPORT_MAX_ROWS', () => {
    expect(EXPORT_LIMIT_TEXT).toBe('A tabela tem {total} linhas e o Excel aceita até 5.000. Refine os filtros para exportar.');
    expect(EXPORT_MAX_ROWS).toBe(5000);
    expect(EXPORT_LIMIT_TEXT).toContain(new Intl.NumberFormat('pt-BR').format(EXPORT_MAX_ROWS));
  });

  it('formats the total in pt-BR', () => {
    expect(exportLimitText(12345)).toBe('A tabela tem 12.345 linhas e o Excel aceita até 5.000. Refine os filtros para exportar.');
  });
});
