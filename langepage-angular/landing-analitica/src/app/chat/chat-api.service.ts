import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import {
  EMPTY,
  Observable,
  catchError,
  concat,
  delay,
  distinctUntilChanged,
  expand,
  forkJoin,
  map,
  merge,
  of,
  shareReplay,
  switchMap,
  takeWhile,
  tap,
  throwError,
  timer
} from 'rxjs';

import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { ApiProblem, toApiProblem } from '../core/http/api-problem';
import { ApiService } from '../core/services/api.service';
import { UserService } from '../core/services/user.service';
import { ChatFlowMock, ChatMockServer } from './chat-mock-server';
import { ChatRequestError } from './chat-request-error';
import {
  ArquivoAgenteV1,
  acceptedFilesFromV1,
  cancelReplyFromV1,
  cancelToV1,
  feedbackToV1,
  fileFromV1,
  fileReplyFromV1,
  messageRequestToV1,
  replyFromV1,
  sessionFromV1
} from './chat-v1-adapters';
import {
  ChatCancelReply,
  ChatCancelRequest,
  ChatErrorCode,
  ChatFeedbackRequest,
  ChatFileChecking,
  ChatFileEvent,
  ChatFileReply,
  ChatMessageRequest,
  ChatReply,
  ChatSessionReply,
  isFileChecking
} from './chat.model';

export interface ChatApiConfig {
  /** true = simulated agent from the mock file; false = BFF. */
  mock: boolean;
  /** Fake network delay so "digitando" and "Parar" can be seen. */
  mockLatencyMs: number;
  /** Fake quarantine of the mock, after the upload; absent = MOCK_FILE_CHECK_MS. */
  mockFileCheckMs?: number;
}

/** `mock` comes from the runtime config (`chatMock` in assets/env.json), so each environment flips it without a build. */
export const CHAT_API_CONFIG = new InjectionToken<ChatApiConfig>('CHAT_API_CONFIG', {
  providedIn: 'root',
  factory: () => ({ mock: inject(RuntimeConfigService).config.chatMock, mockLatencyMs: 700 })
});

const MOCK_URL = 'assets/data/chat-fluxo-mock.json';
/** Agent resources of the v1 contract, under apiBase + /v1 (docs/contratos-de-dados.md 9.1). */
const SESSIONS = '/agente/sessoes';
/** Polling of a document in quarantine (contratos 9.4 and 9.7): every 2 s or the `Retry-After`, up to 2 minutes a send. */
export const FILE_CHECK_INTERVAL_MS = 2000;
export const FILE_CHECK_TIMEOUT_MS = 2 * 60 * 1000;
/** A server-sent `Retry-After` is kept between these bounds, so a wrong header neither floods nor stalls the polling. */
const RETRY_AFTER_MIN_MS = 1000;
const RETRY_AFTER_MAX_MS = 10_000;
/** Failed checks in a row (5xx or network) before the send gives up as SERVICE_UNAVAILABLE. */
export const FILE_CHECK_MAX_FAILURES = 3;
/** Quarantine of the simulated agent: short, so the flow can be shown, and long enough to see the state. */
export const MOCK_FILE_CHECK_MS = 1500;
/** Codes of the pre-v1 proposal: a body that still carries one is accepted as it comes. */
const KNOWN_CODES: ChatErrorCode[] = [
  'INVALID_ACTION', 'SESSION_NOT_FOUND', 'FILE_TYPE_NOT_ALLOWED', 'FILE_TOO_LARGE',
  'SESSION_QUOTA_EXCEEDED', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'FORBIDDEN'
];
/** Problem Details codes of the v1 contract → widget code (docs/contratos-de-dados.md table 9.3). */
const PROBLEM_CODES: Record<string, ChatErrorCode> = {
  'VAL-001': 'INVALID_ACTION',
  'NEG-001': 'INVALID_ACTION',
  'NEG-002': 'SESSION_NOT_FOUND',
  'VAL-002': 'FILE_TYPE_NOT_ALLOWED',
  'VAL-003': 'FILE_TOO_LARGE',
  'VAL-004': 'SEND_TOO_LARGE',
  'NEG-003': 'SESSION_QUOTA_EXCEEDED',
  'AUT-002': 'FORBIDDEN',
  'AUT-003': 'FORBIDDEN',
  'SIS-001': 'SERVICE_UNAVAILABLE',
  'SIS-002': 'SERVICE_UNAVAILABLE',
  'SIS-003': 'SERVICE_UNAVAILABLE'
};

/** Pre-v1 body code (`{ code: 'SESSION_NOT_FOUND' }`), read only when the error still carries the raw body. */
function legacyCode(error: unknown): ChatErrorCode | undefined {
  const body = (error as { error?: { code?: unknown } } | null)?.error;
  const code = body?.code;
  return typeof code === 'string' && (KNOWN_CODES as string[]).includes(code) ? (code as ChatErrorCode) : undefined;
}

/** Status alone, for a code the contract does not list (or no body at all, e.g. the gateway's 429 or 413 above 10 MB). */
function codeFromStatus(problem: ApiProblem): ChatErrorCode {
  if (problem.status === 403) {
    return 'FORBIDDEN';
  }
  if (problem.status === 413) {
    return 'SEND_TOO_LARGE';
  }
  return problem.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE';
}

/**
 * Maps any failure (HTTP error, ApiProblem from the interceptor, network down, unknown body) to a ChatRequestError with a
 * known code and the trace id for the "código de suporte". The server message never travels on.
 */
function toRequestError(error: unknown): ChatRequestError {
  if (error instanceof ChatRequestError) {
    return error;
  }
  const problem = toApiProblem(error);
  const code = legacyCode(error) ?? (problem.code ? PROBLEM_CODES[problem.code] : undefined) ?? codeFromStatus(problem);
  return new ChatRequestError(code, problem.status, problem.traceId);
}

/** `/agente/sessoes/{sessaoId}` plus a sub-resource; the id is encoded (it is a UUID, but it is never trusted). */
function sessionPath(sessionId: string, rest = ''): string {
  return `${SESSIONS}/${encodeURIComponent(sessionId)}${rest}`;
}

/** `Retry-After` in seconds (the contract's form), kept within bounds; anything else = the 2 s of the contract. */
export function retryAfterMs(headers: HttpHeaders | null | undefined): number {
  const seconds = Number(headers?.get('Retry-After') ?? NaN);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return FILE_CHECK_INTERVAL_MS;
  }
  return Math.min(RETRY_AFTER_MAX_MS, Math.max(RETRY_AFTER_MIN_MS, seconds * 1000));
}

/** Where a send is while its documents are in quarantine. */
interface FileCheckState {
  files: ArquivoAgenteV1[];
  delayMs: number;
  /** Failed checks in a row. */
  failures: number;
  reply?: ChatFileReply;
}

const sameChecking = (a: ChatFileEvent, b: ChatFileEvent): boolean =>
  isFileChecking(a) && isFileChecking(b) && a.checking.join() === b.checking.join();

/** The reply with the user from `usuarios/me` (a name the session reply may still carry is the fallback). */
function withFirstName(reply: ChatSessionReply, firstName: string): ChatSessionReply {
  return firstName ? { ...reply, user: { firstName } } : reply;
}

/**
 * Talks to the BFF (`apiBase` + `/v1/agente/sessoes/...`, contract v1 through `chat-v1-adapters.ts`) or, while
 * `chatMock` is on, to ChatMockServer. Errors are always ChatRequestError.
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private mockServer$?: Observable<ChatMockServer>;

  constructor(
    private readonly api: ApiService,
    private readonly http: HttpClient,
    private readonly users: UserService,
    @Inject(CHAT_API_CONFIG) private readonly config: ChatApiConfig
  ) {}

  startSession(): Observable<ChatSessionReply> {
    return this.call(
      server => server.startSession(),
      // The first name for the greeting comes from GET /v1/usuarios/me (never fails: empty name → greeting without it).
      () =>
        this.api.post<unknown>(SESSIONS).pipe(
          map(sessionFromV1),
          switchMap(reply => this.users.firstName$().pipe(map(firstName => withFirstName(reply, firstName))))
        )
    );
  }

  sendMessage(request: ChatMessageRequest): Observable<ChatReply> {
    return this.call(
      server => server.handleMessage(request),
      () => this.api.post<unknown>(sessionPath(request.sessionId, '/mensagens'), messageRequestToV1(request)).pipe(map(replyFromV1))
    );
  }

  /**
   * One multipart request with every document (`arquivos`, repeated, in order). The BFF answers 202 and each document
   * goes through quarantine: this emits ChatFileChecking (which ones are still being checked) while it polls
   * `GET .../arquivos/{arquivoId}`, then the ChatFileReply built from the `resposta` of the send, and completes.
   * Unsubscribing ("Parar", "Recomeçar", "Encerrar") stops the polling. After FILE_CHECK_TIMEOUT_MS it asks the BFF to
   * cancel the send and fails with FILE_CHECK_TIMEOUT.
   */
  sendFiles(sessionId: string, nodeId: string, files: File[], requestId: string): Observable<ChatFileEvent> {
    const events$ = this.config.mock ? this.mockFiles(sessionId, nodeId, files, requestId) : this.uploadFiles(sessionId, nodeId, files, requestId);
    return events$.pipe(catchError(error => throwError(() => toRequestError(error))));
  }

  sendFeedback(request: ChatFeedbackRequest): Observable<void> {
    return this.call(
      server => server.handleFeedback(request),
      () => this.api.post<void>(sessionPath(request.sessionId, '/avaliacoes'), feedbackToV1(request))
    );
  }

  /** "Parar": the BFF drops the request or, if it already acted, undoes it. Answers the step the session is on. */
  cancelRequest(request: ChatCancelRequest): Observable<ChatCancelReply> {
    return this.call(
      server => server.cancel(request),
      () => this.api.post<unknown>(sessionPath(request.sessionId, '/cancelamentos'), cancelToV1(request)).pipe(map(cancelReplyFromV1))
    );
  }

  endSession(sessionId: string): Observable<void> {
    return this.call(
      server => server.endSession(sessionId),
      () => this.api.delete<void>(sessionPath(sessionId))
    );
  }

  /** The simulated agent: same checks and verdicts at once, then a short fake quarantine so the state can be seen. */
  private mockFiles(sessionId: string, nodeId: string, files: File[], requestId: string): Observable<ChatFileEvent> {
    const checking: ChatFileChecking = { checking: files.map(() => true) };
    return this.mockServer().pipe(
      map(server => server.handleFiles(sessionId, nodeId, files, requestId)),
      delay(this.config.mockLatencyMs),
      switchMap(reply => concat(of(checking), timer(this.config.mockFileCheckMs ?? MOCK_FILE_CHECK_MS).pipe(map(() => reply))))
    );
  }

  private uploadFiles(sessionId: string, nodeId: string, files: File[], requestId: string): Observable<ChatFileEvent> {
    const body = new FormData();
    body.append('passoId', nodeId);
    body.append('requisicaoId', requestId);
    files.forEach(file => body.append('arquivos', file, file.name));
    return this.api.postMultipartResponse<unknown>(sessionPath(sessionId, '/arquivos'), body).pipe(
      switchMap(response => {
        const state: FileCheckState = { files: acceptedFilesFromV1(response.body, files.length), delayMs: retryAfterMs(response.headers), failures: 0 };
        const deadline$ = timer(FILE_CHECK_TIMEOUT_MS).pipe(
          tap(() => this.cancelQuietly({ sessionId, requestId })),
          switchMap(() => throwError(() => new ChatRequestError('FILE_CHECK_TIMEOUT', 0)))
        );
        // The deadline only errors; the poll ends the stream with the reply (takeWhile drops the deadline with it).
        return merge(this.pollFiles(sessionId, state), deadline$);
      }),
      takeWhile(isFileChecking, true)
    );
  }

  /** Checks the documents still in quarantine until all are out and the `resposta` of the send arrives. */
  private pollFiles(sessionId: string, first: FileCheckState): Observable<ChatFileEvent> {
    return of(first).pipe(
      expand(state => (state.reply ? EMPTY : timer(state.delayMs).pipe(switchMap(() => this.checkFiles(sessionId, state))))),
      map((state): ChatFileEvent => state.reply ?? { checking: state.files.map(file => file.status === 'EM_VERIFICACAO') }),
      distinctUntilChanged(sameChecking)
    );
  }

  /**
   * One round: `GET` each document still in quarantine (or, when all are out but the reply has not come, the last one,
   * which then carries it). 404 = the session expired; 5xx or network FILE_CHECK_MAX_FAILURES times in a row = unavailable.
   */
  private checkFiles(sessionId: string, state: FileCheckState): Observable<FileCheckState> {
    const pending = state.files.flatMap((file, i) => (file.status === 'EM_VERIFICACAO' ? [i] : []));
    const targets = pending.length ? pending : [state.files.length - 1];
    const checks = targets.map(i =>
      this.api.getResponse<unknown>(sessionPath(sessionId, `/arquivos/${encodeURIComponent(state.files[i].arquivoId)}`))
    );
    return forkJoin(checks).pipe(
      map((responses: HttpResponse<unknown>[]) => {
        const files = [...state.files];
        const checked = responses.map(response => fileFromV1(response.body));
        checked.forEach((file, k) => (files[targets[k]] = file));
        const done = files.every(file => file.status !== 'EM_VERIFICACAO');
        const answer = done ? checked.find(file => file.resposta)?.resposta : undefined;
        return { files, failures: 0, delayMs: retryAfterMs(responses[0]?.headers), reply: answer ? fileReplyFromV1(files, answer) : undefined };
      }),
      catchError(error => {
        const failure = toRequestError(error);
        if (failure.status === 404) {
          return throwError(() => new ChatRequestError('SESSION_NOT_FOUND', 404, failure.traceId));
        }
        const transient = failure.status === 0 || failure.status >= 500;
        if (transient && state.failures + 1 < FILE_CHECK_MAX_FAILURES) {
          return of({ ...state, failures: state.failures + 1, delayMs: FILE_CHECK_INTERVAL_MS });
        }
        return throwError(() => (transient ? new ChatRequestError('SERVICE_UNAVAILABLE', failure.status, failure.traceId) : failure));
      })
    );
  }

  /** Fire and forget: the BFF drops a send that is never polled again on its own, so a failure here changes nothing. */
  private cancelQuietly(request: ChatCancelRequest): void {
    this.cancelRequest(request).subscribe({ error: () => undefined });
  }

  private call<T>(mock: (server: ChatMockServer) => T, real: () => Observable<T>): Observable<T> {
    const result$ = this.config.mock
      ? this.mockServer().pipe(
          map(mock),
          delay(this.config.mockLatencyMs)
        )
      : real();
    return result$.pipe(catchError(error => throwError(() => toRequestError(error))));
  }

  /** The mock file is read once; the server (and its sessions) lives as long as the service. */
  private mockServer(): Observable<ChatMockServer> {
    this.mockServer$ ??= this.http.get<ChatFlowMock>(MOCK_URL).pipe(
      map(flow => new ChatMockServer(flow)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.mockServer$;
  }
}
