import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, Subscription, concat, defer, interval } from 'rxjs';
import { filter, finalize, ignoreElements, map, take, tap } from 'rxjs/operators';

import { ChatApiService } from './chat-api.service';
import { isFarewellMessage } from './chat-farewell';
import { withFileResults } from './chat-file-results';
import { buildGreeting, withGreeting } from './chat-greeting';
import { prefersReducedMotion } from './chat-format';
import { ChatRequestError } from './chat-request-error';
import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from './chat-texts';
import {
  CHAT_LIMITS,
  ChatAction,
  ChatApiMessage,
  ChatAttachment,
  ChatErrorCode,
  ChatFeedbackRating,
  ChatFileReply,
  ChatMessage,
  ChatNode,
  ChatOption,
  ChatReply,
  ChatRole,
  ChatStatus,
  canRateMessage,
  isFileChecking
} from './chat.model';

export interface ChatState {
  messages: ChatMessage[];
  /** Current step; null until the session starts. */
  node: ChatNode | null;
  /** A request or the typing effect is running: input is blocked and "Parar" shows. */
  busy: boolean;
  /** Waiting for the answer: typing bubble. */
  typing: boolean;
  /** Bytes of documents accepted in this conversation. */
  usedBytes: number;
  /** The last request failed and can be repeated. */
  canRetry: boolean;
  /** The user sent something (option, text, document or "Voltar"): enables "Recomeçar". */
  hasInteraction: boolean;
}

/** A message that reached the screen, without its content (for logs and metrics). */
export interface ChatMessageEvent {
  id: string;
  role: ChatRole;
  status?: ChatStatus;
  /** Step the conversation was on when the message arrived. */
  nodeId: string | null;
  hasFile: boolean;
  sourceCount: number;
}

/** A request that failed. */
export interface ChatErrorEvent {
  code: ChatErrorCode;
  /** "Tentar novamente" is offered. */
  retryable: boolean;
}

interface RequestBase {
  sessionId: string;
  nodeId: string;
  requestId: string;
}

/** Step shown after "Encerrar": only "Recomeçar" is left. It exists only in the browser; the server session is already gone. */
const CLOSED_NODE: ChatNode = { id: 'closed', type: 'end', prompt: CHAT_TEXTS.farewell, canGoBack: false };

const INITIAL_STATE: ChatState = { messages: [], node: null, busy: false, typing: false, usedBytes: 0, canRetry: false, hasInteraction: false };

/** Typing effect: one tick per chunk of words; long answers use bigger chunks so they never take long. */
const REVEAL_TICK_MS = 25;
const REVEAL_MAX_TICKS = 80;
const REVEAL_MIN_TOKENS = 8;

/**
 * Conversation of the assistant: session id, messages, current step. The id lives only in memory (no storage);
 * the BFF forgets the session after 30 minutes of inactivity. All requests go through ChatApiService.
 */
@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  private readonly subject = new BehaviorSubject<ChatState>(INITIAL_STATE);
  readonly state$ = this.subject.asObservable();
  private readonly messageEvents = new Subject<ChatMessageEvent>();
  private readonly errorEvents = new Subject<ChatErrorEvent>();
  /** Every message that reaches the screen, without text (M21). */
  readonly messages$ = this.messageEvents.asObservable();
  /** Every failed request (M22). */
  readonly errors$ = this.errorEvents.asObservable();

  private sessionId: string | null = null;
  private starting = false;
  /** "Encerrar" was chosen: the conversation stays on screen and no new session starts until "Recomeçar". */
  private closed = false;
  private sequence = 0;
  private pending?: Subscription;
  private revealing?: Subscription;
  private batch?: { messages: ChatMessage[]; node: ChatNode };
  private retryAction: (() => void) | null = null;
  /** Request in flight that "Parar" must undo on the server. */
  private inFlight: { sessionId: string; requestId: string } | null = null;
  /** Question from another screen, sent as soon as the session is free. */
  private queuedQuestion: string | null = null;
  /** Counts requests, so a late cancel reply never overwrites the step of a newer one. */
  private runs = 0;
  /** Id of the "Verificando o documento..." note while a send is in quarantine. */
  private checkingNote: string | null = null;

  /** Clock of the user's computer, for the greeting; replaceable in tests. */
  now: () => Date = () => new Date();

  constructor(private readonly api: ChatApiService) {}

  get state(): ChatState {
    return this.subject.value;
  }

  /** Opens the session on first use; later calls do nothing. */
  start(): void {
    if (this.sessionId || this.starting || this.closed) {
      return;
    }
    this.starting = true;
    const begin = (): void => {
      const greeted$ = this.api
        .startSession()
        .pipe(map(reply => ({ ...reply, messages: withGreeting(reply.messages, buildGreeting(reply.user, this.now())) })));
      this.run(greeted$, begin, null, reply => {
        this.sessionId = reply.sessionId;
        this.starting = false;
      });
    };
    begin();
  }

  pickOption(option: ChatOption): void {
    const request = this.requestBase();
    if (!request) {
      return;
    }
    this.addUserMessage({ text: option.label });
    this.sendAction(request, 'option', { optionId: option.id });
  }

  /** Sends what the user typed; a plain goodbye ("tchau", "obrigado, era só isso") closes the conversation instead. */
  sendText(text: string): void {
    const request = this.requestBase();
    if (!request || !text.trim()) {
      return;
    }
    this.addUserMessage({ text });
    if (isFarewellMessage(text)) {
      this.end();
      return;
    }
    this.sendAction(request, 'text', { text });
  }

  /**
   * A question from another screen (M18): restarts a closed conversation, opens one if needed and, when the agent is free,
   * sends it with `action: 'ask'` so the BFF answers it from whatever step the conversation is on.
   */
  ask(question: string): void {
    const text = question.trim().slice(0, CHAT_LIMITS.maxInputChars);
    if (!text) {
      return;
    }
    if (this.closed) {
      this.restart();
    }
    this.queuedQuestion = text;
    this.start();
    this.flushQuestion();
  }

  /**
   * Sends one or more documents together. While they are in quarantine each one shows "Verificando o documento..." and
   * a progress note says so (the log is aria-live, so the change is announced). Then each gets its verdict on the
   * user's message (a quarantine refusal with its reason); with more than one, the first agent message of the reply
   * also carries the results table (`fileResults`). Only accepted bytes count to the quota.
   */
  sendFiles(files: File[]): void {
    const request = this.requestBase();
    if (!request || !files.length) {
      return;
    }
    const attachments: ChatAttachment[] = files.map(file => ({ name: file.name, sizeBytes: file.size }));
    const message = this.addUserMessage({ files: attachments });
    const send = (): void =>
      this.run(
        this.api.sendFiles(request.sessionId, request.nodeId, files, request.requestId).pipe(
          tap(event => isFileChecking(event) && this.showChecking(message.id, attachments, event.checking)),
          filter((event): event is ChatFileReply => !isFileChecking(event)),
          map(reply => withFileResults(reply, files)),
          finalize(() => this.clearChecking(message.id))
        ),
        send,
        request,
        reply => {
          this.replaceMessage(message.id, {
            files: attachments.map((item, i) => {
              const result = reply.files[i];
              return { ...item, accepted: result?.accepted, ...(result?.quarantine ? { reason: result.reason } : {}) };
            })
          });
          const acceptedBytes = files.reduce((sum, file, i) => sum + (reply.files[i]?.accepted ? file.size : 0), 0);
          if (acceptedBytes) {
            this.patch({ usedBytes: this.state.usedBytes + acceptedBytes });
          }
        }
      );
    send();
  }

  /** Marks the documents still in quarantine and, once per send, adds the progress note in place of the typing dots. */
  private showChecking(messageId: string, attachments: ChatAttachment[], checking: boolean[]): void {
    this.replaceMessage(messageId, { files: attachments.map((item, i) => (checking[i] ? { ...item, checking: true } : item)) });
    if (!this.checkingNote) {
      const text = attachments.length > 1 ? CHAT_TEXTS.fileCheckingMany : CHAT_TEXTS.fileChecking;
      this.checkingNote = this.append(this.toMessage({ role: 'system', text, transient: true })).id;
      this.patch({ typing: false });
    }
  }

  /** The send ended (reply, failure, "Parar" or a new conversation): no document stays "verificando". */
  private clearChecking(messageId: string): void {
    const note = this.checkingNote;
    this.checkingNote = null;
    const message = this.state.messages.find(item => item.id === messageId);
    if (message?.files?.some(file => file.checking)) {
      this.replaceMessage(messageId, { files: message.files.map(({ checking, ...file }) => file) });
    }
    if (note && this.state.messages.some(item => item.id === note)) {
      this.patch({ messages: this.state.messages.filter(item => item.id !== note) });
    }
  }

  back(): void {
    const request = this.requestBase();
    if (!request) {
      return;
    }
    this.dropTransient();
    this.sendAction(request, 'back');
  }

  /** Forgets the conversation, tells the BFF to drop it and opens a new one. */
  restart(): void {
    this.dropSession();
    this.queuedQuestion = null;
    this.closed = false;
    this.subject.next(INITIAL_STATE);
    this.start();
  }

  /**
   * "Encerrar": says goodbye and tells the BFF to drop the session (and its documents), but keeps the conversation on
   * screen and does not close the panel; the user decides whether to minimize or to restart.
   */
  end(): void {
    if (this.closed || this.state.messages.length === 0) {
      return;
    }
    this.dropSession();
    this.closed = true;
    this.patch({ hasInteraction: true, canRetry: false, typing: false, busy: true });
    this.present([{ role: 'ai', text: CHAT_TEXTS.farewell }], CLOSED_NODE);
  }

  private dropSession(): void {
    this.cancel();
    const old = this.sessionId;
    if (old) {
      this.api.endSession(old).subscribe({ error: () => undefined }); // the TTL covers a failure here
    }
    this.sessionId = null;
    this.starting = false;
  }

  /**
   * Rates an answer. Optimistic: the thanks shows at once and is taken back (with an error note) if sending fails.
   * Independent of the conversation: it works while the agent is busy and never adds a message.
   */
  rateMessage(messageId: string, rating: ChatFeedbackRating): void {
    const message = this.state.messages.find(item => item.id === messageId);
    if (!this.sessionId || !message || message.feedback || !canRateMessage(message)) {
      return;
    }
    this.replaceMessage(messageId, { feedback: rating, feedbackError: false });
    const sourceIds = (message.citations ?? []).map(citation => citation.sourceId);
    this.api.sendFeedback({ sessionId: this.sessionId, rating, sourceIds }).subscribe({
      error: () => this.replaceMessage(messageId, { feedback: undefined, feedbackError: true })
    });
  }

  /**
   * "Parar": drops the pending request and asks the BFF to undo it (it may already have acted), or shows the rest of the
   * answer at once. The step the BFF reports back replaces the current one, so both sides stay on the same step.
   */
  stop(): void {
    if (this.pending) {
      this.pending.unsubscribe();
      this.pending = undefined;
      this.starting = false;
      this.retryAction = null;
      this.patch({ busy: false, typing: false });
      this.cancelOnServer();
      this.flushQuestion();
    } else if (this.revealing) {
      this.revealing.unsubscribe();
      this.revealing = undefined;
      this.finishBatch();
    }
  }

  retry(): void {
    const action = this.retryAction;
    if (!action || this.state.busy) {
      return;
    }
    const messages = this.state.messages;
    this.patch({ messages: messages.slice(0, -1), canRetry: false });
    action();
  }

  // ---------------------------------------------------------------------------------------------

  private requestBase(): RequestBase | null {
    const { node, busy } = this.state;
    return this.sessionId && node && !busy ? { sessionId: this.sessionId, nodeId: node.id, requestId: this.newRequestId() } : null;
  }

  /** Unique per request; not random enough for security, only to tell requests apart (no crypto API on plain HTTP). */
  private newRequestId(): string {
    return `r${Date.now().toString(36)}-${++this.sequence}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Sends an action; a retry repeats the same `requestId`, so the BFF never acts twice. */
  private sendAction(request: RequestBase, action: ChatAction, extra: { optionId?: string; text?: string } = {}): void {
    this.patch({ hasInteraction: true });
    const send = (): void => this.run(this.api.sendMessage({ ...request, ...extra, action }), send, request);
    send();
  }

  private flushQuestion(): void {
    const request = this.queuedQuestion ? this.requestBase() : null;
    if (!request || !this.queuedQuestion) {
      return;
    }
    const text = this.queuedQuestion;
    this.queuedQuestion = null;
    this.addUserMessage({ text });
    this.sendAction(request, 'ask', { text });
  }

  private cancelOnServer(): void {
    const target = this.inFlight;
    const run = this.runs;
    this.inFlight = null;
    if (!target) {
      return;
    }
    this.api.cancelRequest(target).subscribe({
      next: reply => {
        if (this.runs === run && this.sessionId === target.sessionId && !this.state.busy && !this.closed) {
          this.patch({ node: reply.node });
        }
      },
      error: () => undefined // the BFF drops a cancelled request on its own when it finishes; nothing to show
    });
  }

  private run<R extends ChatReply>(
    request: Observable<R>,
    retry: () => void,
    target: RequestBase | null,
    onReply?: (reply: R) => void
  ): void {
    this.runs++;
    this.retryAction = retry;
    this.inFlight = target ? { sessionId: target.sessionId, requestId: target.requestId } : null;
    this.patch({ busy: true, typing: true, canRetry: false });
    const subscription = request.subscribe({
      next: reply => {
        this.pending = undefined;
        this.inFlight = null;
        this.retryAction = null;
        this.patch({ typing: false });
        onReply?.(reply);
        this.present(reply.messages, reply.node);
      },
      error: error => {
        this.pending = undefined;
        this.inFlight = null;
        this.fail(error);
      }
    });
    // A synchronous source has already finished here; keeping its closed subscription would make "Parar" think a request is pending.
    this.pending = subscription.closed ? undefined : subscription;
  }

  private fail(error: unknown): void {
    this.starting = false;
    const code = error instanceof ChatRequestError ? error.code : 'SERVICE_UNAVAILABLE';
    if (code === 'SESSION_NOT_FOUND') {
      // Expired on the server: say so and open a new session, keeping what is on screen.
      this.sessionId = null;
      this.retryAction = null;
      this.errorEvents.next({ code, retryable: false });
      this.announce(this.append(this.toMessage({ role: 'system', text: CHAT_TEXTS.sessionExpired, transient: true })));
      this.patch({ busy: false, typing: false, node: null });
      this.start();
      return;
    }
    const retryable = this.retryAction !== null;
    // The trace id becomes the "Código de suporte" under the text (D6); the server message never shows.
    const traceId = error instanceof ChatRequestError ? error.traceId : undefined;
    this.errorEvents.next({ code, retryable });
    this.announce(this.append(this.toMessage({ role: 'ai', status: 'error', text: CHAT_ERROR_TEXTS[code], ...(traceId ? { supportCode: traceId } : {}) })));
    this.patch({ busy: false, typing: false, canRetry: retryable });
  }

  /** Shows the answer (typing effect for agent text) and only then offers the next step. */
  private present(apiMessages: ChatApiMessage[], node: ChatNode): void {
    const messages = apiMessages.map(message => this.toMessage(message));
    this.batch = { messages, node };
    this.revealing = concat(...messages.map(message => this.revealOne(message))).subscribe({
      complete: () => {
        this.revealing = undefined;
        this.finishBatch();
      }
    });
  }

  private revealOne(message: ChatMessage): Observable<never> {
    const tokens = message.text?.split(/(\s+)/) ?? [];
    if (message.role !== 'ai' || prefersReducedMotion() || tokens.length < REVEAL_MIN_TOKENS) {
      return defer(() => {
        this.upsert(message);
        return EMPTY;
      });
    }
    const ticks = Math.min(REVEAL_MAX_TICKS, tokens.length);
    const size = Math.ceil(tokens.length / ticks);
    return concat(
      defer(() => {
        this.upsert({ ...message, text: '', status: undefined, citations: undefined, questions: undefined, contacts: undefined });
        return interval(REVEAL_TICK_MS).pipe(
          take(ticks - 1),
          tap(index => this.replaceMessage(message.id, { text: tokens.slice(0, (index + 1) * size).join('') })),
          ignoreElements()
        );
      }),
      defer(() => {
        this.upsert(message); // full text plus sources, questions and contacts
        return EMPTY;
      })
    );
  }

  private finishBatch(): void {
    if (this.batch) {
      const { messages, node } = this.batch;
      this.batch = undefined;
      messages.forEach(message => this.upsert(message));
      this.patch({ node, busy: false, typing: false });
      messages.forEach(message => this.announce(message));
      this.flushQuestion();
    }
  }

  private announce(message: ChatMessage): void {
    this.messageEvents.next({
      id: message.id,
      role: message.role,
      status: message.status,
      nodeId: this.state.node?.id ?? null,
      hasFile: !!message.files?.length,
      sourceCount: message.citations?.length ?? 0
    });
  }

  /** Progress notes go away when the user acts again (M11). */
  private dropTransient(): void {
    if (this.state.messages.some(message => message.transient)) {
      this.patch({ messages: this.state.messages.filter(message => !message.transient) });
    }
  }

  private cancel(): void {
    this.pending?.unsubscribe();
    this.revealing?.unsubscribe();
    this.pending = this.revealing = this.batch = undefined;
    this.retryAction = null;
    this.inFlight = null;
  }

  /** The user's own message: clears progress notes and marks the conversation as started. */
  private addUserMessage(content: Pick<ChatMessage, 'text' | 'files'>): ChatMessage {
    this.dropTransient();
    const message = this.append(this.toMessage({ role: 'user', ...content }));
    this.patch({ hasInteraction: true });
    this.announce(message);
    return message;
  }

  private toMessage(message: ChatApiMessage & Partial<ChatMessage>): ChatMessage {
    return { id: `m${++this.sequence}`, createdAt: new Date(), ...message };
  }

  private append(message: ChatMessage): ChatMessage {
    this.patch({ messages: [...this.state.messages, message] });
    return message;
  }

  private upsert(message: ChatMessage): void {
    const exists = this.state.messages.some(item => item.id === message.id);
    if (exists) {
      this.replaceMessage(message.id, message);
    } else {
      this.append(message);
    }
  }

  private replaceMessage(id: string, changes: Partial<ChatMessage>): void {
    this.patch({ messages: this.state.messages.map(message => (message.id === id ? { ...message, ...changes } : message)) });
  }

  private patch(changes: Partial<ChatState>): void {
    this.subject.next({ ...this.state, ...changes });
  }
}
