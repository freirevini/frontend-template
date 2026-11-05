import { SUPPORT_CODE_TEXT } from '../core/http/http-error-texts';
import { ChatErrorCode } from './chat.model';

/** Every visible text of the chat widget (pt-BR, rule R12). Terms follow docs/glossario-ptbr.md. */
export const CHAT_TEXTS = {
  agentName: 'Agente da Agenda',
  userName: 'Você',
  open: 'Abrir Agente da Agenda',
  openConversation: 'Abrir Agente da Agenda (conversa em andamento)',
  minimize: 'Minimizar Agente da Agenda',
  expand: 'Expandir Agente da Agenda',
  collapse: 'Reduzir Agente da Agenda',
  title: 'Agente da Agenda',
  inputPlaceholder: 'Digite sua pergunta',
  inputLabel: 'Mensagem para o Agente da Agenda',
  send: 'Enviar',
  stop: 'Parar',
  attach: 'Anexar documentos',
  restart: 'Recomeçar',
  back: 'Voltar',
  end: 'Encerrar',
  farewell: 'Foi um prazer ajudar! Obrigado por usar o Agente da Agenda. Se precisar de algo mais, é só recomeçar a conversa. Até logo!',
  scrollToEnd: 'Ir para o fim',
  retry: 'Tentar novamente',
  sources: 'Fontes',
  contacts: 'Fale com a equipe responsável',
  typing: 'O Agente da Agenda está digitando',
  messagesLabel: 'Conversa com o Agente da Agenda',
  characters: 'caracteres',
  feedbackQuestion: 'Esta resposta ajudou?',
  feedbackUseful: 'Útil',
  feedbackNotUseful: 'Não útil',
  feedbackThanks: 'Obrigado pelo feedback.',
  feedbackFailed: 'Não foi possível enviar o feedback. Tente novamente.',
  clarify: 'Para continuar, preciso saber:',
  fileRejected: 'Documento não aceito',
  fileAccepted: 'Documento aceito',
  /** Quarantine (antivirus and checks) still running: on each document and as a progress note. */
  fileChecking: 'Verificando o documento...',
  fileCheckingMany: 'Verificando os documentos...',
  /** Result column of a document barred in quarantine. */
  fileQuarantined: 'Recusado na verificação de segurança',
  newMessages: 'Novas mensagens',
  optionsLabel: 'Opções',
  suggestions: 'Sugestões de resposta',
  uploadHint: 'PDF, Word (DOC ou DOCX), PNG, JPG ou WEBP; até 5 arquivos e 9 MB por envio, 20 MB por conversa.',
  pasteHint: 'Para enviar um print copiado, cole com Ctrl+V.',
  pastedImage: 'imagem-colada',
  fileEmpty: 'O arquivo está vazio.',
  fileTooMany: 'Passou do limite de arquivos por envio; este não foi enviado.',
  fileResultsTitle: 'Resultado da avaliação dos documentos',
  fileResultsSheet: 'Documentos',
  fileColumnName: 'Arquivo',
  fileColumnResult: 'Resultado',
  fileColumnNorm: 'Norma identificada',
  fileColumnIssuer: 'Emissor',
  fileColumnKind: 'Tipo de documento',
  fileColumnNote: 'Observação',
  fileKinds: { norma_integral: 'Norma completa', trecho_norma: 'Trecho de norma' } as Record<string, string>,
  sessionExpired: 'A conversa expirou por inatividade. Vamos recomeçar.',
  normsFilter: 'Filtrar por segmento',
  normsAll: 'Todos',
  normsShowTable: 'Ver em formato tabela',
  normsShowList: 'Ver em formato lista',
  normsExport: 'Extrair em Excel',
  normsExporting: 'Gerando arquivo...',
  normsExportFailed: 'Não foi possível gerar o arquivo Excel.',
  normsSheet: 'Normas',
  normsDate: 'Data',
  normsColumnTitle: 'Norma',
  normsColumnDetail: 'Observação',
  normsColumnSegment: 'Segmento',
  askAbout: 'Perguntar ao Agente da Agenda sobre',
  goodMorning: 'Bom dia',
  goodAfternoon: 'Boa tarde',
  goodEvening: 'Boa noite'
} as const;

/** Text shown when a request fails, by the code the BFF returns. */
export const CHAT_ERROR_TEXTS: Record<ChatErrorCode, string> = {
  INVALID_ACTION: 'Não foi possível processar essa opção. Escolha uma das opções disponíveis.',
  SESSION_NOT_FOUND: CHAT_TEXTS.sessionExpired,
  FILE_TYPE_NOT_ALLOWED: 'Arquivo não aceito. Envie PDF, Word (DOC ou DOCX) ou imagem (PNG, JPG ou WEBP).',
  FILE_TOO_LARGE: 'O arquivo é maior que o permitido. O limite é de 9 MB por envio.',
  SEND_TOO_LARGE: 'Os documentos somam mais de 9 MB. Envie menos arquivos por vez.',
  SESSION_QUOTA_EXCEEDED: 'O limite de 20 MB por conversa foi atingido. Recomece para enviar outro documento.',
  RATE_LIMITED: 'Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.',
  SERVICE_UNAVAILABLE: 'Não consegui responder agora. Tente novamente em instantes.',
  FORBIDDEN: 'Você não tem acesso ao agente.',
  FILE_REJECTED_UNSAFE: 'O documento não passou na verificação de segurança e foi descartado. Envie outro arquivo.',
  FILE_CHECK_FAILED: 'Não foi possível verificar o documento. Envie uma versão sem senha ou em outro formato.',
  FILE_CONTENT_NOT_SUPPORTED: 'Este documento não pode ser avaliado (conteúdo ativo, mais de 200 páginas ou arquivo danificado).',
  FILE_CHECK_TIMEOUT: 'A verificação do documento está demorando mais que o esperado. Tente enviar de novo em instantes.'
};

/** "Código de suporte: " before the selectable trace id of a failed request (SUPPORT_CODE_TEXT of core/http, D6). */
export const CHAT_SUPPORT_CODE_LABEL = SUPPORT_CODE_TEXT.replace('{traceId}', '');

/** Used when the request fails without a known `ChatApiError.code` (network down, unexpected status). */
export const CHAT_GENERIC_ERROR_TEXT = CHAT_ERROR_TEXTS.SERVICE_UNAVAILABLE;
