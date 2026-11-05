/**
 * pt-BR texts for failed BFF calls (rule R10; docs/contratos-de-dados.md, error texts table). The UI shows these, chosen
 * by HTTP status and code family, never the server's `message` or `details`. A block that already has its own sentence
 * ("Não foi possível carregar os dados.") keeps it; these cover the specific statuses (403, 429, 504, network).
 */
export const HTTP_ERROR_TEXTS = {
  forbidden: 'Você não tem acesso a esta informação.',
  badRequest: 'Não foi possível processar o pedido. Confira os filtros e tente novamente.',
  notFound: 'A informação pedida não foi encontrada.',
  rateLimited: 'Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente.',
  serverError: 'Não foi possível carregar os dados agora. Tente novamente em instantes.',
  timeout: 'O servidor demorou a responder. Tente novamente em instantes.',
  network: 'Sem conexão com o servidor. Verifique a rede e tente novamente.'
} as const;

export type HttpErrorTextKey = keyof typeof HTTP_ERROR_TEXTS;

/**
 * 401 right after a trip to sign-in (the gateway sent the user back unauthenticated): no automatic redirect again;
 * the page shows this text and the "Entrar novamente" link (SessionExpiredNoticeComponent).
 */
export const SESSION_EXPIRED_TEXT = 'Sua sessão expirou e não foi possível entrar de novo automaticamente.';
export const LOGIN_AGAIN_LABEL = 'Entrar novamente';

/** Shown on its own line below the message, only when the answer carried a `traceId`. */
export const SUPPORT_CODE_TEXT = 'Código de suporte: {traceId}';

/** "Código de suporte: 4bf92f35..." for a trace id already validated by `toApiProblem`. */
export function supportCodeText(traceId: string): string {
  return SUPPORT_CODE_TEXT.replace('{traceId}', traceId);
}
