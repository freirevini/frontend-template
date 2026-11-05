/**
 * pt-BR texts for failed BFF calls (rule R12; docs/contratos-de-dados.md section 2.4). The UI shows these, chosen by
 * HTTP status and code family, never the server's `message` or `details`. A block that already has its own sentence
 * ("Não foi possível carregar os segmentos.") keeps it; these cover the specific statuses (403, 429, 504, network).
 * Terms follow docs/glossario-ptbr.md.
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

/** Most rows the Excel of the Tabela Analítica takes (decision D5 of ADR-023): fetched in pages of 100. */
export const EXPORT_MAX_ROWS = 5000;

/** Shown instead of exporting when the filtered table has more than EXPORT_MAX_ROWS rows (no partial file, D5). */
export const EXPORT_LIMIT_TEXT = 'A tabela tem {total} linhas e o Excel aceita até 5.000. Refine os filtros para exportar.';

const countFormat = new Intl.NumberFormat('pt-BR');

/** "A tabela tem 12.345 linhas e o Excel aceita até 5.000. Refine os filtros para exportar." */
export function exportLimitText(total: number): string {
  return EXPORT_LIMIT_TEXT.replace('{total}', countFormat.format(total));
}
