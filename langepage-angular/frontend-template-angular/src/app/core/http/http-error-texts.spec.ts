import { HTTP_ERROR_TEXTS, LOGIN_AGAIN_LABEL, SESSION_EXPIRED_TEXT, SUPPORT_CODE_TEXT, supportCodeText } from './http-error-texts';

describe('HTTP error texts', () => {
  it('has the pt-BR texts of the table in docs/contratos-de-dados.md', () => {
    expect(HTTP_ERROR_TEXTS).toEqual({
      forbidden: 'Você não tem acesso a esta informação.',
      badRequest: 'Não foi possível processar o pedido. Confira os filtros e tente novamente.',
      notFound: 'A informação pedida não foi encontrada.',
      rateLimited: 'Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente.',
      serverError: 'Não foi possível carregar os dados agora. Tente novamente em instantes.',
      timeout: 'O servidor demorou a responder. Tente novamente em instantes.',
      network: 'Sem conexão com o servidor. Verifique a rede e tente novamente.'
    });
    expect(SESSION_EXPIRED_TEXT).toBe('Sua sessão expirou e não foi possível entrar de novo automaticamente.');
    expect(LOGIN_AGAIN_LABEL).toBe('Entrar novamente');
  });

  it('puts the trace id in the support code line', () => {
    expect(SUPPORT_CODE_TEXT).toBe('Código de suporte: {traceId}');
    expect(supportCodeText('4bf92f35')).toBe('Código de suporte: 4bf92f35');
  });
});
