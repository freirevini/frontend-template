/**
 * Internal model of the chat widget plus its own message model. The BFF speaks the v1 contract
 * (`/v1/agente/sessoes/...`, pt-BR fields, docs/contratos/openapi-agenda-normativa-v1.yaml); `chat-v1-adapters.ts`
 * converts it to and from these types (docs/contratos-de-dados.md sections 9 and 11.6).
 */

export type ChatRole = 'ai' | 'user' | 'system';

export type ChatNodeType = 'menu' | 'free_text' | 'upload' | 'end';

/** Outcome of an agent answer; `error` is produced by the widget itself when a request fails. */
export type ChatStatus = 'answer' | 'need_more_info' | 'not_in_data' | 'out_of_scope' | 'error';

/** Why the quarantine (antivirus and technical checks) barred a document before it was evaluated. */
export type ChatQuarantineCode = 'FILE_REJECTED_UNSAFE' | 'FILE_CHECK_FAILED' | 'FILE_CONTENT_NOT_SUPPORTED';

/**
 * Widget codes for a failure (from the BFF's status and Problem Details code, table 9.3) or for a quarantine verdict;
 * each one has a pt-BR text in CHAT_ERROR_TEXTS.
 */
export type ChatErrorCode =
  | 'INVALID_ACTION'
  | 'SESSION_NOT_FOUND'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_TOO_LARGE'
  | 'SEND_TOO_LARGE'
  | 'SESSION_QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'FILE_CHECK_TIMEOUT'
  | ChatQuarantineCode;

/** `ask`: a question sent from another screen; the BFF moves to its question step and answers it there. */
export type ChatAction = 'option' | 'text' | 'back' | 'restart' | 'ask';

export interface ChatOption {
  id: string;
  label: string;
}

export interface ChatInputConfig {
  enabled: boolean;
  placeholder?: string;
  maxChars?: number;
}

export interface ChatUploadConfig {
  /** File extensions with the dot, lower case (e.g. `.pdf`). */
  accept: string[];
  maxBytes: number;
  maxFiles: number;
  /** Sum of the documents of one send (`envio.maxBytesPorEnvio`); never above CHAT_LIMITS.maxSendBytes. */
  maxSendBytes?: number;
}

export interface ChatContact {
  name: string;
  area: string;
  /** E-mail or other channel to reach the team. */
  channel: string;
}

/** One norm of a list the agent shows (e.g. "Normas a Classificar"). */
export interface ChatNormItem {
  id: string;
  /** e.g. "Resolução CMN nº 5.100". */
  title: string;
  /** Short note (pt-BR), e.g. "2 requisitos sem aderência". */
  detail?: string;
  /** Segment name as shown on screen (e.g. "Varejo"); the list can be filtered by it. */
  segment?: string;
  /** ISO date `yyyy-mm-dd`; its meaning is given by `ChatNormList.dateLabel`. */
  date?: string;
}

export interface ChatNormList {
  /** What `date` means, e.g. "Vigência" or "Recebida em". */
  dateLabel?: string;
  items: ChatNormItem[];
}

export interface ChatCitation {
  sourceId: string;
  excerpt: string;
}

export interface ChatNode {
  id: string;
  type: ChatNodeType;
  /** Text shown for the step (pt-BR). */
  prompt: string;
  /** Only in `menu` nodes. */
  options?: ChatOption[];
  input?: ChatInputConfig;
  /** Only in `upload` nodes. */
  upload?: ChatUploadConfig;
  canGoBack: boolean;
}

/** Message as it travels in the API: no id or timestamp, the widget adds them. */
export interface ChatApiMessage {
  role: ChatRole;
  /** Simple markdown; always rendered through `safeMarkdown`. Never HTML. */
  text?: string;
  status?: ChatStatus;
  citations?: ChatCitation[];
  /** Clarification questions the agent needs answered. */
  questions?: string[];
  /** Present when the clarification rounds ran out. */
  contacts?: ChatContact[];
  /** Ready answers to the clarification questions; shown as chips that send the text. */
  quickReplies?: string[];
  /** List of norms shown as a block that can be filtered by segment. */
  normList?: ChatNormList;
  /** Progress note: removed from the conversation at the user's next action. */
  transient?: boolean;
  /** Filled by the widget (never by the BFF) when several documents were evaluated together: the results table. */
  fileResults?: ChatFileResultRow[];
}

export type ChatFeedbackRating = 'useful' | 'not_useful';

export interface ChatMessage extends ChatApiMessage {
  id: string;
  createdAt: Date;
  /** The user's rating of this answer (only on `answer` and `not_in_data` messages, see `canRateMessage`). */
  feedback?: ChatFeedbackRating;
  /** The last attempt to send the rating failed. */
  feedbackError?: boolean;
  /** Documents the user attached with this message (one or more, sent together). */
  files?: ChatAttachment[];
  /** `traceId` of a failed request, shown as "Código de suporte" under the error text. */
  supportCode?: string;
}

export interface ChatAttachment {
  name: string;
  sizeBytes: number;
  /** Verdict of the BFF; absent while it is being evaluated. */
  accepted?: boolean;
  /** In quarantine (antivirus and checks): "Verificando o documento...". */
  checking?: boolean;
  /** Why the quarantine barred it (pt-BR text of CHAT_ERROR_TEXTS); absent otherwise. */
  reason?: string;
}

/** One line of the results table: the document as the user sent it plus the BFF's verdict. */
export interface ChatFileResultRow {
  name: string;
  sizeBytes: number;
  result: ChatFileResult;
}

/**
 * Who is talking, as the BFF knows them from the Windows sign-in (SSO). Only the first name, for the greeting; the
 * widget keeps it in memory and never sends it back or logs it.
 */
export interface ChatUser {
  /** Given name (e.g. "Vinicius"), never the login. Absent when the BFF does not know the user. */
  firstName?: string;
}

/** `POST /v1/agente/sessoes` (`SessaoAgente`) */
export interface ChatSessionReply {
  sessionId: string;
  node: ChatNode;
  /** Welcome without a greeting: the widget adds "Bom dia / Boa tarde / Boa noite[, nome]!" by the local clock. */
  messages: ChatApiMessage[];
  user?: ChatUser;
}

/** `POST /v1/agente/sessoes/{sessaoId}/mensagens` (`PedidoMensagem`; `sessionId` goes in the path) */
export interface ChatMessageRequest {
  sessionId: string;
  nodeId: string;
  action: ChatAction;
  optionId?: string;
  text?: string;
  /**
   * Id the widget gives each request. Sending the same id again (retry) returns the stored reply instead of acting twice;
   * `POST .../cancelamentos` uses it to undo the request ("Parar").
   */
  requestId: string;
}

/** `POST /v1/agente/sessoes/{sessaoId}/cancelamentos` (`PedidoCancelamento`). */
export interface ChatCancelRequest {
  sessionId: string;
  requestId: string;
}

/** `RespostaCancelamento`: the step the session is on after the request was dropped or undone. */
export interface ChatCancelReply {
  node: ChatNode;
}

/** `RespostaAgente`: reply to a message and the base of the file reply */
export interface ChatReply {
  node: ChatNode;
  messages: ChatApiMessage[];
}

export interface ChatFileResult {
  id: string;
  accepted: boolean;
  /** Why the document was refused (pt-BR), when `accepted` is false. */
  reason?: string;
  metadata?: { documentKind?: string; issuer?: string; normIdentifier?: string };
  /** Barred in quarantine (`REJEITADO`) before any evaluation; `reason` then holds its CHAT_ERROR_TEXTS text. */
  quarantine?: ChatQuarantineCode;
}

/** End of a send (`resposta` of the last check of `GET .../arquivos/{arquivoId}`): one result per document, in order. */
export interface ChatFileReply extends ChatReply {
  files: ChatFileResult[];
}

/** While the documents of a send are in quarantine: which ones are still being checked, in the order sent. */
export interface ChatFileChecking {
  checking: boolean[];
}

/** What a send emits: zero or more ChatFileChecking (after the 202), then the ChatFileReply. */
export type ChatFileEvent = ChatFileChecking | ChatFileReply;

export function isFileChecking(event: ChatFileEvent): event is ChatFileChecking {
  return 'checking' in event;
}

/** `POST /v1/agente/sessoes/{sessaoId}/avaliacoes` (`PedidoAvaliacao`). Answers 204. Carries no text from the conversation. */
export interface ChatFeedbackRequest {
  sessionId: string;
  rating: ChatFeedbackRating;
  /** Sources shown with the answer (empty for "not found"), so ratings can be tied to the data behind them. */
  sourceIds: string[];
}

/**
 * A quick reply shown inside the conversation: an option of the step, a ready answer to a clarification question
 * (`reply`, sends `label` as text), "Voltar", "Encerrar" or "Recomeçar".
 */
export interface ChatSuggestion {
  kind: 'option' | 'reply' | 'back' | 'end' | 'restart';
  label: string;
  /** Present when `kind` is `option`. */
  option?: ChatOption;
}

/** Which agent messages can be rated: answers and "not found", but not the hand-over to the team. */
export function canRateMessage(message: Pick<ChatApiMessage, 'role' | 'status' | 'contacts'>): boolean {
  return message.role === 'ai' && (message.status === 'answer' || (message.status === 'not_in_data' && !message.contacts?.length));
}

/** Error body of the pre-v1 proposal (still read when it comes); v1 errors are Problem Details (`ApiProblem`). */
export interface ChatApiError {
  code: ChatErrorCode;
  message?: string;
}

/** Limits the widget enforces before sending; the BFF enforces the same ones again. */
export const CHAT_LIMITS = {
  maxSessionBytes: 20 * 1024 * 1024,
  /** Documents of one send summed (D4 of ADR-023: below the ~10 MB the gateway accepts per request). */
  maxSendBytes: 9 * 1024 * 1024,
  maxInputChars: 1000,
  /** Documents sent together in one request (the upload step's `maxFiles` may be lower). */
  maxFilesPerSend: 5,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'],
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
} as const;
