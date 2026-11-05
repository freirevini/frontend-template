import { HttpErrorResponse } from '@angular/common/http';

import { ApiProblem, apiProblemText, problemKind, toApiProblem } from './api-problem';
import { HTTP_ERROR_TEXTS, SUPPORT_CODE_TEXT, supportCodeText } from './http-error-texts';

const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error, url: '/api/v1/x' });

describe('toApiProblem', () => {
  it('keeps status, a contract code and a trace id from a parsed body', () => {
    const problem = toApiProblem(httpError(422, { status: 422, code: 'NEG-001', message: 'segredo', traceId: 'ab-12' }));
    expect([problem.status, problem.code, problem.traceId, problem.kind]).toEqual([422, 'NEG-001', 'ab-12', 'badRequest']);
  });

  it('parses a Problem Details body that arrived as text', () => {
    const problem = toApiProblem(httpError(500, '{"status":500,"code":"SIS-003","traceId":"t9"}'));
    expect([problem.code, problem.traceId]).toEqual(['SIS-003', 't9']);
  });

  it('drops a code outside the contract families and a trace id with other characters', () => {
    const problem = toApiProblem(httpError(500, { code: 'ALGO_NOVO', traceId: '<b>oi</b>' }));
    expect(problem.code).toBeUndefined();
    expect(problem.traceId).toBeUndefined();
    expect(toApiProblem(httpError(503, '<html>erro</html>')).kind).toBe('serverError');
  });

  it('returns the same ApiProblem and treats anything else as a network failure', () => {
    const same = new ApiProblem(404);
    expect(toApiProblem(same)).toBe(same);
    expect(toApiProblem(new Error('x')).kind).toBe('network');
  });
});

describe('problemKind and texts', () => {
  it('chooses the text by status, refined by the code family', () => {
    const cases: [number, string | undefined, string][] = [
      [0, undefined, HTTP_ERROR_TEXTS.network],
      [400, 'VAL-005', HTTP_ERROR_TEXTS.badRequest],
      [403, 'AUT-003', HTTP_ERROR_TEXTS.forbidden],
      [404, 'NEG-002', HTTP_ERROR_TEXTS.notFound],
      [429, undefined, HTTP_ERROR_TEXTS.rateLimited],
      [500, 'SIS-003', HTTP_ERROR_TEXTS.serverError],
      [502, 'SIS-001', HTTP_ERROR_TEXTS.serverError],
      [503, undefined, HTTP_ERROR_TEXTS.serverError],
      [504, 'SIS-002', HTTP_ERROR_TEXTS.timeout],
      [500, 'SIS-002', HTTP_ERROR_TEXTS.timeout]
    ];
    for (const [status, code, text] of cases) {
      expect(apiProblemText(new ApiProblem(status, code))).withContext(`${status} ${code}`).toBe(text);
    }
    expect(problemKind(401, 'AUT-001')).toBe('unauthenticated');
  });

  it('has the pt-BR texts of docs/contratos-de-dados.md error texts table', () => {
    expect(HTTP_ERROR_TEXTS.forbidden).toBe('Você não tem acesso a esta informação.');
    expect(Object.keys(HTTP_ERROR_TEXTS).sort()).toEqual(
      ['badRequest', 'forbidden', 'network', 'notFound', 'rateLimited', 'serverError', 'timeout']
    );
    expect(SUPPORT_CODE_TEXT).toBe('Código de suporte: {traceId}');
    expect(supportCodeText('abc')).toBe('Código de suporte: abc');
  });
});
