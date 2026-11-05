import { validateChatFile } from './chat-file';
import { ChatRequestError } from './chat-request-error';
import { quarantinedResult } from './chat-v1-adapters';
import {
  CHAT_LIMITS,
  ChatApiMessage,
  ChatCancelReply,
  ChatCancelRequest,
  ChatContact,
  ChatFileReply,
  ChatFeedbackRequest,
  ChatFileResult,
  ChatMessageRequest,
  ChatNode,
  ChatNormList,
  ChatQuarantineCode,
  ChatReply,
  ChatSessionReply,
  ChatUser
} from './chat.model';

/** Message in the mock file; `contactsRef` is replaced by the list in `contacts`. */
export type ChatMockMessage = ChatApiMessage & { contactsRef?: string };

/** Shape of src/assets/data/chat-fluxo-mock.json (documented in docs/contratos-de-dados.md section 9.5). */
export interface ChatFlowMock {
  version: number;
  start: string;
  welcome: ChatApiMessage[];
  /** User the mock "signs in" with, as the BFF would from the Windows sign-in. */
  user?: ChatUser;
  nodes: Record<string, ChatNode>;
  transitions: Record<string, Record<string, string>>;
  /** Question step that `action: 'ask'` (questions from other screens) jumps to. */
  askNode?: string;
  /** Norms listed with the prompt of a node, by node id. */
  lists?: Record<string, ChatNormList>;
  back: Record<string, string>;
  contacts: Record<string, ChatContact[]>;
  maxClarificationRounds: number;
  maxOutOfScope?: number;
  textScenarios: { id: string; keywords: string[]; message: ChatMockMessage }[];
  fallbacks: {
    needMoreInfo: ChatMockMessage;
    notInData: ChatMockMessage;
    roundsExceeded: ChatMockMessage;
    outOfScopeLimit: ChatMockMessage;
    minWordsForAnswer: number;
  };
  fileScenarios: {
    accepted: { result: ChatFileResult; messages: ChatApiMessage[]; normIdentifiers?: string[] };
    rejected: { result: ChatFileResult; messages: ChatApiMessage[]; filenameKeywords: string[] };
    /** Reply text for several documents; `{total}`, `{accepted}` and `{rejected}` are replaced. */
    summary?: ChatApiMessage;
    /**
     * Quarantine (antivirus and checks, before any evaluation): a name with one of the keywords is barred with that
     * reason, does not count to the quota and gets `messages` when it was the only document.
     */
    quarantine?: { filenameKeywords: Partial<Record<ChatQuarantineCode, string[]>>; messages: ChatApiMessage[] };
  };
}

interface MockSnapshot {
  nodeId: string;
  rounds: number;
  outOfScope: number;
  usedBytes: number;
}

interface MockSession extends MockSnapshot {
  /** Replies by `requestId`, so a repeated request returns the same reply instead of acting twice. */
  replies: Map<string, ChatReply>;
  /** State before the last request, so "Parar" can undo it. */
  undo?: { requestId: string; before: MockSnapshot };
}

/** Replies kept per session for repeated requests. */
const MAX_STORED_REPLIES = 20;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const fold = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const invalid = () => new ChatRequestError('INVALID_ACTION', 400);

/**
 * Plays the BFF while it does not exist: same rules as docs/planejamento/agente-backend-spec.md, with answers
 * picked by keyword from the mock file. Holds sessions in memory, like the real one will.
 */
export class ChatMockServer {
  private readonly sessions = new Map<string, MockSession>();
  private sequence = 0;
  /** What the BFF would store: ratings only, never text. */
  readonly feedbackLog: ChatFeedbackRequest[] = [];

  constructor(private readonly flow: ChatFlowMock) {}

  startSession(): ChatSessionReply {
    const sessionId = `mock-${++this.sequence}-${Math.random().toString(36).slice(2, 10)}`;
    const session: MockSession = { nodeId: this.flow.start, rounds: 0, outOfScope: 0, usedBytes: 0, replies: new Map() };
    this.sessions.set(sessionId, session);
    return { sessionId, ...this.begin(session), ...(this.flow.user ? { user: clone(this.flow.user) } : {}) };
  }

  handleMessage(request: ChatMessageRequest): ChatReply {
    const session = this.session(request.sessionId);
    return this.once(session, request.requestId, () => this.act(session, request));
  }

  /**
   * "Parar": undoes the request if it was the last one the session handled (the mock answers at once, so the cancel
   * always arrives after it). Unknown or older requests change nothing. Answers the current step.
   */
  cancel(request: ChatCancelRequest): ChatCancelReply {
    const session = this.session(request.sessionId);
    if (session.undo?.requestId === request.requestId) {
      Object.assign(session, session.undo.before);
      session.replies.delete(request.requestId);
      session.undo = undefined;
    }
    return { node: clone(this.node(session.nodeId)) };
  }

  private act(session: MockSession, request: ChatMessageRequest): ChatReply {
    const node = this.node(session.nodeId);
    if (request.nodeId !== node.id) {
      throw invalid();
    }
    switch (request.action) {
      case 'restart':
        Object.assign(session, { rounds: 0, outOfScope: 0, usedBytes: 0 });
        return this.begin(session);
      case 'back': {
        const previous = this.flow.back[node.id];
        if (!node.canGoBack || !previous) {
          throw invalid();
        }
        return this.enter(session, previous);
      }
      case 'option': {
        const next = node.type === 'menu' ? this.flow.transitions[node.id]?.[request.optionId ?? ''] : undefined;
        if (!next || !node.options?.some(option => option.id === request.optionId)) {
          throw invalid();
        }
        return this.enter(session, next);
      }
      case 'text':
        return this.answerText(session, node, request.text);
      case 'ask': {
        // From any step: jump to the question step without showing its prompt and answer there.
        const target = this.flow.askNode ? this.node(this.flow.askNode) : undefined;
        const length = request.text?.trim().length ?? 0;
        if (!target || target.type !== 'free_text' || !length || length > (target.input?.maxChars ?? CHAT_LIMITS.maxInputChars)) {
          throw invalid();
        }
        session.nodeId = target.id;
        session.rounds = 0;
        return this.answerText(session, target, request.text);
      }
      default:
        throw invalid();
    }
  }

  /**
   * Several documents in one request, as the BFF: every technical check first (any failure refuses the whole request,
   * nothing is kept), then one verdict per document in the order sent. Moves on when at least one is accepted.
   */
  handleFiles(sessionId: string, nodeId: string, files: Pick<File, 'name' | 'size' | 'type'>[], requestId: string): ChatFileReply {
    const session = this.session(sessionId);
    return this.once(session, requestId, () => this.receiveFiles(session, nodeId, files)) as ChatFileReply;
  }

  private receiveFiles(session: MockSession, nodeId: string, files: Pick<File, 'name' | 'size' | 'type'>[]): ChatFileReply {
    const node = this.node(session.nodeId);
    if (nodeId !== node.id || node.type !== 'upload' || !node.upload) {
      throw invalid();
    }
    if (!files.length || files.length > Math.min(node.upload.maxFiles, CHAT_LIMITS.maxFilesPerSend)) {
      throw invalid();
    }
    let bytes = session.usedBytes;
    files.forEach(file => {
      const problem = validateChatFile(file, node.upload!, bytes);
      if (problem === 'FILE_TYPE_NOT_ALLOWED') {
        throw new ChatRequestError(problem, 415);
      }
      if (problem === 'FILE_TOO_LARGE' || problem === 'SESSION_QUOTA_EXCEEDED') {
        throw new ChatRequestError(problem, 413);
      }
      if (problem) {
        throw invalid();
      }
      bytes += file.size;
    });

    const { accepted, rejected, summary, quarantine } = this.flow.fileScenarios;
    const identifiers = accepted.normIdentifiers ?? [];
    let acceptedCount = 0;
    const results = files.map((file): ChatFileResult => {
      const id = `mock-arquivo-${++this.sequence}`;
      const barred = this.quarantineVerdict(file.name);
      if (barred) {
        return quarantinedResult(id, barred);
      }
      if (rejected.filenameKeywords.some(keyword => fold(file.name).includes(fold(keyword)))) {
        return { ...clone(rejected.result), id };
      }
      session.usedBytes += file.size;
      const result: ChatFileResult = { ...clone(accepted.result), id };
      const normIdentifier = identifiers.length ? identifiers[acceptedCount % identifiers.length] : undefined;
      acceptedCount++;
      return normIdentifier ? { ...result, metadata: { ...result.metadata, normIdentifier } } : result;
    });

    const several = files.length > 1 && summary;
    const counted = several
      ? [{ ...clone(summary), text: (summary.text ?? '')
          .replace('{total}', String(files.length))
          .replace('{accepted}', String(acceptedCount))
          .replace('{rejected}', String(files.length - acceptedCount)) }]
      : null;
    if (!acceptedCount) {
      const alone = results.length === 1 && results[0].quarantine && quarantine ? quarantine.messages : rejected.messages;
      return { node: clone(node), messages: counted ?? clone(alone), files: results };
    }
    const next = this.flow.transitions[node.id]?.['accepted'];
    const entered = next ? this.enter(session, next) : { node: clone(node), messages: [] };
    return { node: entered.node, messages: [...(counted ?? clone(accepted.messages)), ...entered.messages], files: results };
  }

  /** What the fake antivirus says about a file name: the first reason whose keyword it contains, or null (clean). */
  private quarantineVerdict(name: string): ChatQuarantineCode | null {
    const keywords = this.flow.fileScenarios.quarantine?.filenameKeywords ?? {};
    const hit = (Object.keys(keywords) as ChatQuarantineCode[]).find(code => keywords[code]?.some(word => fold(name).includes(fold(word))));
    return hit ?? null;
  }

  handleFeedback(request: ChatFeedbackRequest): void {
    this.session(request.sessionId);
    if ((request.rating !== 'useful' && request.rating !== 'not_useful') || !Array.isArray(request.sourceIds)) {
      throw invalid();
    }
    this.feedbackLog.push(clone(request));
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Runs a request once per `requestId`: a repeat gets the stored reply; a failure leaves the session as it was. */
  private once(session: MockSession, requestId: string, handle: () => ChatReply): ChatReply {
    const stored = session.replies.get(requestId);
    if (stored) {
      return clone(stored);
    }
    const before: MockSnapshot = { nodeId: session.nodeId, rounds: session.rounds, outOfScope: session.outOfScope, usedBytes: session.usedBytes };
    let reply: ChatReply;
    try {
      reply = handle();
    } catch (error) {
      Object.assign(session, before);
      throw error;
    }
    session.replies.set(requestId, clone(reply));
    if (session.replies.size > MAX_STORED_REPLIES) {
      // TypeScript 5.6+ types an iterator result as possibly done, so the key may be undefined.
      const oldest = session.replies.keys().next().value;
      if (oldest !== undefined) {
        session.replies.delete(oldest);
      }
    }
    session.undo = { requestId, before };
    return reply;
  }

  private answerText(session: MockSession, node: ChatNode, rawText: string | undefined): ChatReply {
    const text = rawText?.trim() ?? '';
    const maxChars = node.input?.maxChars ?? CHAT_LIMITS.maxInputChars;
    if (node.type !== 'free_text' || !text || text.length > maxChars) {
      throw invalid();
    }
    const { fallbacks } = this.flow;
    const folded = fold(text);
    const hit = this.flow.textScenarios.find(scenario => scenario.keywords.some(word => folded.includes(fold(word))));

    if (hit?.message.status === 'out_of_scope') {
      session.outOfScope++;
      const limitReached = session.outOfScope >= (this.flow.maxOutOfScope ?? 3);
      return { node: clone(node), messages: [this.resolve(limitReached ? fallbacks.outOfScopeLimit : hit.message)] };
    }
    if (hit) {
      const next = this.flow.transitions[node.id]?.['answered'];
      const entered = next ? this.enter(session, next) : { node: clone(node), messages: [] };
      return { node: entered.node, messages: [this.resolve(hit.message), ...entered.messages] };
    }

    session.rounds++;
    if (session.rounds >= this.flow.maxClarificationRounds) {
      session.rounds = 0;
      return { node: clone(node), messages: [this.resolve(fallbacks.roundsExceeded)] };
    }
    const words = text.split(/\s+/).length;
    return { node: clone(node), messages: [this.resolve(words < fallbacks.minWordsForAnswer ? fallbacks.needMoreInfo : fallbacks.notInData)] };
  }

  /** Initial step: welcome messages and the prompt of the first node. */
  private begin(session: MockSession): ChatReply {
    const entered = this.enter(session, this.flow.start);
    return { node: entered.node, messages: [...clone(this.flow.welcome), ...entered.messages] };
  }

  /** Moves to a node; its prompt is shown as an agent message, so every reply carries what to display. */
  private enter(session: MockSession, nodeId: string): ChatReply {
    const node = this.node(nodeId);
    session.nodeId = nodeId;
    session.rounds = 0;
    const list = this.flow.lists?.[nodeId];
    return { node: clone(node), messages: [{ role: 'ai', text: node.prompt, ...(list ? { normList: clone(list) } : {}) }] };
  }

  private resolve(message: ChatMockMessage): ChatApiMessage {
    const { contactsRef, ...rest } = clone(message);
    return contactsRef ? { ...rest, contacts: clone(this.flow.contacts[contactsRef] ?? []) } : rest;
  }

  private session(sessionId: string): MockSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ChatRequestError('SESSION_NOT_FOUND', 404);
    }
    return session;
  }

  private node(nodeId: string): ChatNode {
    const node = this.flow.nodes[nodeId];
    if (!node) {
      throw new ChatRequestError('SERVICE_UNAVAILABLE', 500);
    }
    return node;
  }
}
