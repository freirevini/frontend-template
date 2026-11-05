import { CHAT_ERROR_TEXTS } from './chat-texts';
import {
  ChatAction,
  ChatApiMessage,
  ChatCancelReply,
  ChatCancelRequest,
  ChatFeedbackRating,
  ChatFeedbackRequest,
  ChatFileReply,
  ChatFileResult,
  ChatMessageRequest,
  ChatNode,
  ChatNodeType,
  ChatQuarantineCode,
  ChatReply,
  ChatRole,
  ChatSessionReply,
  ChatStatus
} from './chat.model';

/*
 * Hand-written types of the v1 contract, tag "Agente" of docs/contratos/openapi-agenda-normativa-v1.yaml (D9 of
 * ADR-023: no generated client), and pure adapters to and from the widget's model (docs/contratos-de-dados.md 11.6).
 * Field names are the contract's (pt-BR camelCase); a value outside a domain throws, so the widget shows its own
 * failure text and never the raw value.
 */

export type TipoPassoV1 = 'MENU' | 'TEXTO_LIVRE' | 'ENVIO_ARQUIVO' | 'FIM';
export type PapelV1 = 'AGENTE' | 'USUARIO' | 'SISTEMA';
export type SituacaoV1 = 'RESPOSTA' | 'PRECISA_MAIS_INFORMACAO' | 'FORA_DOS_DADOS' | 'FORA_DO_ESCOPO';
export type AcaoV1 = 'OPCAO' | 'TEXTO' | 'VOLTAR' | 'RECOMECAR' | 'PERGUNTAR';
export type StatusArquivoV1 = 'EM_VERIFICACAO' | 'APROVADO' | 'REJEITADO';
export type MotivoRejeicaoV1 = 'AMEACA_DETECTADA' | 'VERIFICACAO_FALHOU' | 'CONTEUDO_NAO_SUPORTADO';

export interface PassoAgenteV1 {
  id: string;
  tipo: TipoPassoV1;
  enunciado: string;
  opcoes?: { id: string; rotulo: string }[];
  entrada?: { habilitada: boolean; dica?: string; maxCaracteres?: number };
  envio?: { extensoes: string[]; maxBytesPorArquivo: number; maxBytesPorEnvio: number; maxArquivos: number };
  podeVoltar: boolean;
}

export interface MensagemAgenteV1 {
  papel: PapelV1;
  texto?: string;
  situacao?: SituacaoV1;
  citacoes?: { fonteId: string; trecho: string }[];
  perguntas?: string[];
  contatos?: { nome: string; area: string; canal: string }[];
  respostasRapidas?: string[];
  listaNormas?: {
    rotuloData?: string;
    itens: { id: string; titulo: string; detalhe?: string; segmento?: string; data?: string }[];
  };
  transitoria?: boolean;
}

export interface RespostaAgenteV1 {
  passo: PassoAgenteV1;
  mensagens: MensagemAgenteV1[];
}

export interface SessaoAgenteV1 extends RespostaAgenteV1 {
  sessaoId: string;
}

export interface PedidoMensagemV1 {
  passoId: string;
  acao: AcaoV1;
  opcaoId?: string;
  texto?: string;
  requisicaoId: string;
}

export interface ArquivoAgenteV1 {
  arquivoId: string;
  nome?: string;
  tamanhoBytes?: number;
  status: StatusArquivoV1;
  motivoRejeicao?: MotivoRejeicaoV1;
  avaliacao?: {
    aceito: boolean;
    motivo?: string;
    metadados?: { tipoDocumento?: string; emissor?: string; identificacaoNorma?: string };
  };
  resposta?: RespostaAgenteV1;
}

export interface EnvioArquivosAceitoV1 {
  requisicaoId: string;
  arquivos: ArquivoAgenteV1[];
}

export interface PedidoAvaliacaoV1 {
  nota: 'UTIL' | 'NAO_UTIL';
  fonteIds: string[];
}

export interface PedidoCancelamentoV1 {
  requisicaoId: string;
}

export interface RespostaCancelamentoV1 {
  passo: PassoAgenteV1;
}

const NODE_TYPES: Record<TipoPassoV1, ChatNodeType> = { MENU: 'menu', TEXTO_LIVRE: 'free_text', ENVIO_ARQUIVO: 'upload', FIM: 'end' };
const ROLES: Record<PapelV1, ChatRole> = { AGENTE: 'ai', USUARIO: 'user', SISTEMA: 'system' };
const STATUSES: Record<SituacaoV1, ChatStatus> = {
  RESPOSTA: 'answer',
  PRECISA_MAIS_INFORMACAO: 'need_more_info',
  FORA_DOS_DADOS: 'not_in_data',
  FORA_DO_ESCOPO: 'out_of_scope'
};
const ACTIONS: Record<ChatAction, AcaoV1> = { option: 'OPCAO', text: 'TEXTO', back: 'VOLTAR', restart: 'RECOMECAR', ask: 'PERGUNTAR' };
const RATINGS: Record<ChatFeedbackRating, PedidoAvaliacaoV1['nota']> = { useful: 'UTIL', not_useful: 'NAO_UTIL' };
const FILE_STATUSES: Record<StatusArquivoV1, StatusArquivoV1> = { EM_VERIFICACAO: 'EM_VERIFICACAO', APROVADO: 'APROVADO', REJEITADO: 'REJEITADO' };
const QUARANTINE: Record<MotivoRejeicaoV1, ChatQuarantineCode> = {
  AMEACA_DETECTADA: 'FILE_REJECTED_UNSAFE',
  VERIFICACAO_FALHOU: 'FILE_CHECK_FAILED',
  CONTEUDO_NAO_SUPORTADO: 'FILE_CONTENT_NOT_SUPPORTED'
};

/** Payload that breaks the contract. The message names the field only, never the value received. */
export class ChatContractError extends Error {
  constructor(field: string) {
    super(`chat v1: unexpected ${field}`);
    this.name = 'ChatContractError';
  }
}

function domain<K extends string, V>(map: Record<K, V>, value: unknown, field: string): V {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(map, value)) {
    return map[value as K];
  }
  throw new ChatContractError(field);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ChatContractError(field);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) {
    throw new ChatContractError(field);
  }
  return value;
}

function list<T>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) {
    throw new ChatContractError(field);
  }
  return value as T[];
}

/** Drops the keys whose value is undefined, so optional fields are absent rather than present and empty. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export function nodeFromV1(raw: unknown): ChatNode {
  const step = record(raw, 'passo') as unknown as PassoAgenteV1;
  const { entrada, envio } = step;
  return compact<ChatNode>({
    id: text(step.id, 'passo.id'),
    type: domain(NODE_TYPES, step.tipo, 'passo.tipo'),
    prompt: typeof step.enunciado === 'string' ? step.enunciado : '',
    options: step.opcoes?.map(option => ({ id: option.id, label: option.rotulo })),
    input: entrada && compact({ enabled: entrada.habilitada === true, placeholder: entrada.dica, maxChars: entrada.maxCaracteres }),
    upload: envio && {
      accept: list<string>(envio.extensoes, 'passo.envio.extensoes').map(extension => extension.toLowerCase()),
      maxBytes: envio.maxBytesPorArquivo,
      maxFiles: envio.maxArquivos,
      maxSendBytes: envio.maxBytesPorEnvio
    },
    canGoBack: step.podeVoltar === true
  });
}

export function messageFromV1(raw: unknown): ChatApiMessage {
  const message = record(raw, 'mensagem') as unknown as MensagemAgenteV1;
  const norms = message.listaNormas;
  return compact<ChatApiMessage>({
    role: domain(ROLES, message.papel, 'mensagem.papel'),
    text: message.texto,
    status: message.situacao === undefined ? undefined : domain(STATUSES, message.situacao, 'mensagem.situacao'),
    citations: message.citacoes?.map(citation => ({ sourceId: citation.fonteId, excerpt: citation.trecho })),
    questions: message.perguntas,
    contacts: message.contatos?.map(contact => ({ name: contact.nome, area: contact.area, channel: contact.canal })),
    quickReplies: message.respostasRapidas,
    normList:
      norms &&
      compact({
        dateLabel: norms.rotuloData,
        items: list<NonNullable<MensagemAgenteV1['listaNormas']>['itens'][number]>(norms.itens, 'listaNormas.itens').map(item =>
          compact({ id: item.id, title: item.titulo, detail: item.detalhe, segment: item.segmento, date: item.data })
        )
      }),
    transient: message.transitoria
  });
}

/** `RespostaAgente` → `ChatReply`. */
export function replyFromV1(raw: unknown): ChatReply {
  const reply = record(raw, 'resposta');
  return { node: nodeFromV1(reply['passo']), messages: list(reply['mensagens'], 'mensagens').map(messageFromV1) };
}

/** `SessaoAgente` → `ChatSessionReply` (the first name comes from `usuarios/me`, not from here). */
export function sessionFromV1(raw: unknown): ChatSessionReply {
  const session = record(raw, 'sessao');
  return { sessionId: text(session['sessaoId'], 'sessaoId'), ...replyFromV1(session) };
}

export function messageRequestToV1(request: ChatMessageRequest): PedidoMensagemV1 {
  return compact<PedidoMensagemV1>({
    passoId: request.nodeId,
    acao: ACTIONS[request.action],
    opcaoId: request.optionId,
    texto: request.text,
    requisicaoId: request.requestId
  });
}

export function feedbackToV1(request: ChatFeedbackRequest): PedidoAvaliacaoV1 {
  return { nota: RATINGS[request.rating], fonteIds: [...request.sourceIds] };
}

export function cancelToV1(request: ChatCancelRequest): PedidoCancelamentoV1 {
  return { requisicaoId: request.requestId };
}

export function cancelReplyFromV1(raw: unknown): ChatCancelReply {
  return { node: nodeFromV1(record(raw, 'cancelamento')['passo']) };
}

/** One `ArquivoAgente` (202 or a check), with its id and status checked; the rest is read when the send ends. */
export function fileFromV1(raw: unknown): ArquivoAgenteV1 {
  const file = record(raw, 'arquivo') as unknown as ArquivoAgenteV1;
  text(file.arquivoId, 'arquivo.arquivoId');
  domain(FILE_STATUSES, file.status, 'arquivo.status');
  return file;
}

/** `EnvioArquivosAceito` (202): one file per document sent, in the same order. */
export function acceptedFilesFromV1(raw: unknown, count: number): ArquivoAgenteV1[] {
  const files = list(record(raw, 'envio')['arquivos'], 'envio.arquivos').map(fileFromV1);
  if (files.length !== count) {
    throw new ChatContractError('envio.arquivos');
  }
  return files;
}

/** Result of a document barred in quarantine: refused, with the front's own pt-BR reason. */
export function quarantinedResult(id: string, quarantine: ChatQuarantineCode): ChatFileResult {
  return { id, accepted: false, quarantine, reason: CHAT_ERROR_TEXTS[quarantine] };
}

/** `ArquivoAgente` at the end of a send → verdict. `REJEITADO` without a reason counts as "could not be checked". */
export function fileResultFromV1(file: ArquivoAgenteV1): ChatFileResult {
  if (file.status === 'REJEITADO') {
    const quarantine = file.motivoRejeicao === undefined ? 'FILE_CHECK_FAILED' : domain(QUARANTINE, file.motivoRejeicao, 'arquivo.motivoRejeicao');
    return quarantinedResult(file.arquivoId, quarantine);
  }
  const evaluation = file.avaliacao;
  const meta = evaluation?.metadados;
  return compact<ChatFileResult>({
    id: file.arquivoId,
    accepted: evaluation?.aceito === true,
    reason: evaluation?.motivo,
    metadata: meta && compact({ documentKind: meta.tipoDocumento, issuer: meta.emissor, normIdentifier: meta.identificacaoNorma })
  });
}

/** Every document out of quarantine plus the `resposta` of the send → the reply the widget applies. */
export function fileReplyFromV1(files: ArquivoAgenteV1[], resposta: unknown): ChatFileReply {
  return { ...replyFromV1(resposta), files: files.map(fileResultFromV1) };
}
