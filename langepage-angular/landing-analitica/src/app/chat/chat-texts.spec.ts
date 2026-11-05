import { supportCodeText } from '../core/http/http-error-texts';
import { CHAT_ERROR_TEXTS, CHAT_GENERIC_ERROR_TEXT, CHAT_SUPPORT_CODE_LABEL, CHAT_TEXTS } from './chat-texts';
import { CHAT_LIMITS } from './chat.model';

describe('chat texts', () => {
  it('has a non-empty text for every error code', () => {
    const codes = [
      'INVALID_ACTION',
      'SESSION_NOT_FOUND',
      'FILE_TYPE_NOT_ALLOWED',
      'FILE_TOO_LARGE',
      'SEND_TOO_LARGE',
      'SESSION_QUOTA_EXCEEDED',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE',
      'FORBIDDEN',
      'FILE_REJECTED_UNSAFE',
      'FILE_CHECK_FAILED',
      'FILE_CONTENT_NOT_SUPPORTED',
      'FILE_CHECK_TIMEOUT'
    ] as const;
    expect(Object.keys(CHAT_ERROR_TEXTS).sort()).toEqual([...codes].sort());
    codes.forEach(code => expect(CHAT_ERROR_TEXTS[code].length).toBeGreaterThan(0));
    expect(CHAT_GENERIC_ERROR_TEXT).toBe(CHAT_ERROR_TEXTS.SERVICE_UNAVAILABLE);
  });

  it('keeps the 20 MB wording in sync with the limit', () => {
    expect(CHAT_LIMITS.maxSessionBytes).toBe(20 * 1024 * 1024);
    expect(CHAT_ERROR_TEXTS.SESSION_QUOTA_EXCEEDED).toContain('20 MB');
    expect(CHAT_TEXTS.uploadHint).toContain('20 MB por conversa');
  });

  it('keeps the 9 MB per send (D4) in the file, send and hint texts', () => {
    expect(CHAT_LIMITS.maxSendBytes).toBe(9 * 1024 * 1024);
    expect(CHAT_ERROR_TEXTS.FILE_TOO_LARGE).toBe('O arquivo é maior que o permitido. O limite é de 9 MB por envio.');
    expect(CHAT_ERROR_TEXTS.SEND_TOO_LARGE).toBe('Os documentos somam mais de 9 MB. Envie menos arquivos por vez.');
    expect(CHAT_TEXTS.uploadHint).toBe('PDF, Word (DOC ou DOCX), PNG, JPG ou WEBP; até 5 arquivos e 9 MB por envio, 20 MB por conversa.');
  });

  it('has the quarantine texts of contratos-de-dados 9.7 and the support code label', () => {
    expect(CHAT_TEXTS.fileChecking).toBe('Verificando o documento...');
    expect(CHAT_TEXTS.fileCheckingMany).toBe('Verificando os documentos...');
    expect(CHAT_TEXTS.fileQuarantined).toBe('Recusado na verificação de segurança');
    expect(CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE).toBe('O documento não passou na verificação de segurança e foi descartado. Envie outro arquivo.');
    expect(CHAT_ERROR_TEXTS.FILE_CHECK_FAILED).toBe('Não foi possível verificar o documento. Envie uma versão sem senha ou em outro formato.');
    expect(CHAT_ERROR_TEXTS.FILE_CONTENT_NOT_SUPPORTED).toBe('Este documento não pode ser avaliado (conteúdo ativo, mais de 200 páginas ou arquivo danificado).');
    expect(CHAT_ERROR_TEXTS.FILE_CHECK_TIMEOUT).toBe('A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes.');
    expect(`${CHAT_SUPPORT_CODE_LABEL}abc123`).toBe(supportCodeText('abc123'));
    expect(CHAT_SUPPORT_CODE_LABEL).toBe('Código de suporte: ');
  });

  it('names the agent and the user as the glossary says', () => {
    expect(CHAT_TEXTS.agentName).toBe('Agente da Agenda');
    expect(CHAT_TEXTS.userName).toBe('Você');
  });
});
