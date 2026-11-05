import { HttpHeaders } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_URL, RuntimeConfigService } from '../core/config/runtime-config.service';
import { provideAppHttpClient } from '../core/http/api-error.interceptor';
import {
  CHAT_API_CONFIG,
  ChatApiConfig,
  ChatApiService,
  FILE_CHECK_INTERVAL_MS,
  FILE_CHECK_TIMEOUT_MS,
  MOCK_FILE_CHECK_MS,
  retryAfterMs
} from './chat-api.service';
import { ChatRequestError } from './chat-request-error';
import { ChatFlowMock } from './chat-mock-server';
import { loadChatFlow } from './chat-test-helpers';
import { CHAT_ERROR_TEXTS } from './chat-texts';
import { ChatFileEvent, ChatFileReply } from './chat.model';

const MOCK_URL = 'assets/data/chat-fluxo-mock.json';
/** Smallest valid v1 payloads (schemas PassoAgente, RespostaAgente, SessaoAgente of the OpenAPI). */
const PASSO = { id: 'inicio', tipo: 'MENU', enunciado: 'O que você precisa?', opcoes: [{ id: 'a', rotulo: 'A' }], podeVoltar: false };
const RESPOSTA = { passo: PASSO, mensagens: [] };
const SESSAO = { sessaoId: 's1', ...RESPOSTA };
const arquivo = (arquivoId: string, status = 'EM_VERIFICACAO', extra: object = {}) =>
  ({ arquivoId, nome: `${arquivoId}.pdf`, tamanhoBytes: 10, status, ...extra });

function setup(config: ChatApiConfig) {
  TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: CHAT_API_CONFIG, useValue: config }] });
  return { service: TestBed.inject(ChatApiService), http: TestBed.inject(HttpTestingController) };
}

describe('ChatApiService', () => {
  let flow: ChatFlowMock;
  beforeAll(async () => (flow = await loadChatFlow()));

  describe('mock mode', () => {
    it('reads the mock file once and keeps one server (sessions survive between calls)', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 50 });
      let sessionId = '';
      let nodeId = '';
      let reply: unknown;

      service.startSession().subscribe(session => ((sessionId = session.sessionId), (nodeId = session.node.id)));
      http.expectOne(MOCK_URL).flush(flow);
      tick(50);
      expect(sessionId).toBeTruthy();

      service.sendMessage({ sessionId, nodeId, action: 'option', optionId: 'consultar', requestId: 'r1' }).subscribe(r => (reply = r));
      http.expectNone(MOCK_URL);
      tick(49);
      expect(reply).toBeUndefined(); // latency still running (this is what makes "Parar" visible)
      tick(1);
      expect((reply as { node: { id: string } }).node.id).toBe('consultar_tema');
      http.verify();
    }));

    it('reports server errors as ChatRequestError with the BFF code', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 0 });
      let error: unknown;
      service.sendMessage({ sessionId: 'nope', nodeId: 'x', action: 'back', requestId: 'r1' }).subscribe({ error: e => (error = e) });
      http.expectOne(MOCK_URL).flush(flow);
      tick();
      expect(error instanceof ChatRequestError).toBeTrue();
      expect((error as ChatRequestError).code).toBe('SESSION_NOT_FOUND');
      expect((error as ChatRequestError).status).toBe(404);
    }));

    it('records feedback in the mock server and rejects an unknown session', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 0 });
      let sessionId = '';
      let error: unknown;
      let ok = false;
      service.startSession().subscribe(s => (sessionId = s.sessionId));
      http.expectOne(MOCK_URL).flush(flow);
      tick();
      service.sendFeedback({ sessionId, rating: 'not_useful', sourceIds: [] }).subscribe(() => (ok = true));
      tick();
      expect(ok).toBeTrue();
      service.sendFeedback({ sessionId: 'nope', rating: 'useful', sourceIds: [] }).subscribe({ error: e => (error = e) });
      tick();
      expect((error as ChatRequestError).code).toBe('SESSION_NOT_FOUND');
    }));

    it('reports a missing mock file as SERVICE_UNAVAILABLE', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 0 });
      let error: unknown;
      service.startSession().subscribe({ error: e => (error = e) });
      http.expectOne(MOCK_URL).flush('', { status: 404, statusText: 'Not Found' });
      tick();
      expect((error as ChatRequestError).code).toBe('SERVICE_UNAVAILABLE');
    }));
  });

  describe('BFF mode', () => {
    let service: ChatApiService;
    let http: HttpTestingController;
    const base = `${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/agente/sessoes`;

    beforeEach(() => ({ service, http } = setup({ mock: false, mockLatencyMs: 0 })));
    afterEach(() => http.verify());

    it('calls the session endpoints under apiBase', () => {
      service.startSession().subscribe();
      const start = http.expectOne(base);
      expect(start.request.method).toBe('POST');
      expect(start.request.withCredentials).toBeFalse();
      start.flush(SESSAO);
      http.expectOne(`${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/usuarios/me`).flush({});

      service.sendMessage({ sessionId: 's1', nodeId: 'inicio', action: 'option', optionId: 'a', requestId: 'r1' }).subscribe();
      const message = http.expectOne(`${base}/s1/mensagens`);
      expect(message.request.method).toBe('POST');
      expect(message.request.body).toEqual({ passoId: 'inicio', acao: 'OPCAO', opcaoId: 'a', requisicaoId: 'r1' });
      message.flush(RESPOSTA);

      service.cancelRequest({ sessionId: 's1', requestId: 'r1' }).subscribe();
      const cancel = http.expectOne(`${base}/s1/cancelamentos`);
      expect(cancel.request.method).toBe('POST');
      expect(cancel.request.body).toEqual({ requisicaoId: 'r1' });
      cancel.flush({ passo: PASSO });

      service.endSession('a/b c').subscribe();
      const end = http.expectOne(`${base}/a%2Fb%20c`);
      expect(end.request.method).toBe('DELETE');
      end.flush(null);
    });

    it('uploads the documents as one multipart with step, request id and every file in order', () => {
      const file = new File(['conteudo'], 'norma.pdf', { type: 'application/pdf' });
      const word = new File(['texto'], 'circular.docx');
      const sending = service.sendFiles('s1', 'enviar_arquivo', [file, word], 'r9').subscribe();
      const request = http.expectOne(`${base}/s1/arquivos`);
      expect(request.request.method).toBe('POST');
      const form = request.request.body as FormData;
      expect(form.get('passoId')).toBe('enviar_arquivo');
      expect(form.get('requisicaoId')).toBe('r9');
      expect((form.getAll('arquivos') as File[]).map(item => item.name)).toEqual(['norma.pdf', 'circular.docx']);
      request.flush({ requisicaoId: 'r9', arquivos: [arquivo('f1'), arquivo('f2')] }, { status: 202, statusText: 'Accepted' });
      sending.unsubscribe(); // the polling is covered in "BFF mode: quarantine"
    });

    it('posts the rating to /avaliacoes and accepts an empty 204', () => {
      let done = false;
      service.sendFeedback({ sessionId: 's1', rating: 'useful', sourceIds: ['a'] }).subscribe(() => (done = true));
      const request = http.expectOne(`${base}/s1/avaliacoes`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ nota: 'UTIL', fonteIds: ['a'] });
      request.flush(null, { status: 204, statusText: 'No Content' });
      expect(done).toBeTrue();
    });

    const failWith = (status: number, body: object | string | null): ChatRequestError => {
      let error: unknown;
      service.sendMessage({ sessionId: 's', nodeId: 'n', action: 'back', requestId: 'r' }).subscribe({ error: e => (error = e) });
      http.expectOne(`${base}/s/mensagens`).flush(body, { status, statusText: 'x' });
      return error as ChatRequestError;
    };

    it('takes the code from the error body', () => {
      const error = failWith(404, { code: 'SESSION_NOT_FOUND' });
      expect([error.code, error.status]).toEqual(['SESSION_NOT_FOUND', 404]);
      expect(failWith(413, { code: 'SESSION_QUOTA_EXCEEDED' }).code).toBe('SESSION_QUOTA_EXCEEDED');
    });

    it('maps 429 without a body to RATE_LIMITED and anything unknown to SERVICE_UNAVAILABLE', () => {
      expect(failWith(429, null).code).toBe('RATE_LIMITED');
      expect(failWith(500, { code: 'ALGO_NOVO' }).code).toBe('SERVICE_UNAVAILABLE');
      expect(failWith(503, '<html>erro</html>').code).toBe('SERVICE_UNAVAILABLE');
    });

    it('maps a network failure to SERVICE_UNAVAILABLE', () => {
      let error: unknown;
      service.startSession().subscribe({ error: e => (error = e) });
      http.expectOne(base).error(new ProgressEvent('error'));
      expect((error as ChatRequestError).code).toBe('SERVICE_UNAVAILABLE');
      expect((error as ChatRequestError).status).toBe(0);
    });
  });

  describe('CHAT_API_CONFIG default', () => {
    it('takes the mock flag from the runtime config (chatMock in assets/env.json)', async () => {
      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      const http = TestBed.inject(HttpTestingController);
      const loading = TestBed.inject(RuntimeConfigService).load();
      http.expectOne(RUNTIME_CONFIG_URL).flush({ chatMock: false });
      await loading;
      expect(TestBed.inject(CHAT_API_CONFIG)).toEqual({ mock: false, mockLatencyMs: 700 });
    });

    it('stays on the simulated agent when env.json was not loaded', () => {
      TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
      expect(TestBed.inject(CHAT_API_CONFIG).mock).toBeTrue();
    });
  });

  describe('BFF mode: Problem Details and first name (contract v1)', () => {
    let service: ChatApiService;
    let http: HttpTestingController;
    const apiBase = DEFAULT_RUNTIME_CONFIG.apiBase;
    const base = `${apiBase}/v1/agente/sessoes`;

    beforeEach(() => ({ service, http } = setup({ mock: false, mockLatencyMs: 0 })));
    afterEach(() => http.verify());

    const failWith = (status: number, body: object | null): ChatRequestError => {
      let error: unknown;
      service.sendMessage({ sessionId: 's', nodeId: 'n', action: 'back', requestId: 'r' }).subscribe({ error: e => (error = e) });
      http.expectOne(`${base}/s/mensagens`).flush(body, { status, statusText: 'x' });
      return error as ChatRequestError;
    };
    const problem = (status: number, code: string) =>
      ({ timestamp: '2026-11-04T10:15:30-03:00', status, code, message: 'texto do servidor', details: [], traceId: 'abc123' });

    it('maps the v1 codes of table 9.3 and keeps the trace id', () => {
      const cases: [number, string, string][] = [
        [400, 'VAL-001', 'INVALID_ACTION'],
        [422, 'NEG-001', 'INVALID_ACTION'],
        [404, 'NEG-002', 'SESSION_NOT_FOUND'],
        [413, 'VAL-003', 'FILE_TOO_LARGE'],
        [413, 'VAL-004', 'SEND_TOO_LARGE'],
        [422, 'NEG-003', 'SESSION_QUOTA_EXCEEDED'],
        [415, 'VAL-002', 'FILE_TYPE_NOT_ALLOWED'],
        [403, 'AUT-002', 'FORBIDDEN'],
        [403, 'AUT-003', 'FORBIDDEN'],
        [503, 'SIS-001', 'SERVICE_UNAVAILABLE'],
        [504, 'SIS-002', 'SERVICE_UNAVAILABLE'],
        [500, 'SIS-003', 'SERVICE_UNAVAILABLE']
      ];
      for (const [status, code, expected] of cases) {
        const error = failWith(status, problem(status, code));
        expect([error.code, error.status, error.traceId]).withContext(code).toEqual([expected, status, 'abc123']);
        expect(error.message).not.toContain('texto do servidor');
      }
    });

    it('maps 403 without a body to FORBIDDEN', () => {
      expect(failWith(403, null).code).toBe('FORBIDDEN');
    });

    it('greets with the first name from GET /v1/usuarios/me', () => {
      let reply: { user?: { firstName?: string } } | undefined;
      service.startSession().subscribe(r => (reply = r));
      http.expectOne(base).flush(SESSAO);
      expect(reply).toBeUndefined(); // waits for the name
      const me = http.expectOne(`${apiBase}/v1/usuarios/me`);
      expect(me.request.method).toBe('GET');
      me.flush({ primeiroNome: 'Vinicius' });
      expect(reply?.user).toEqual({ firstName: 'Vinicius' });
    });

    it('opens the session without a name when usuarios/me fails', () => {
      let reply: { sessionId?: string; user?: unknown } | undefined;
      service.startSession().subscribe(r => (reply = r));
      http.expectOne(base).flush(SESSAO);
      http.expectOne(`${apiBase}/v1/usuarios/me`).flush(problem(500, 'SIS-003'), { status: 500, statusText: 'x' });
      expect(reply?.sessionId).toBe('s1');
      expect(reply?.user).toBeUndefined();
    });
  });

  describe('with the app HttpClient (error interceptor)', () => {
    it('maps the ApiProblem the interceptor throws, with code and trace id', () => {
      TestBed.configureTestingModule({
        providers: [provideAppHttpClient(), provideHttpClientTesting(), { provide: CHAT_API_CONFIG, useValue: { mock: false, mockLatencyMs: 0 } }]
      });
      const service = TestBed.inject(ChatApiService);
      const http = TestBed.inject(HttpTestingController);
      let error: unknown;
      service.sendMessage({ sessionId: 's', nodeId: 'n', action: 'back', requestId: 'r' }).subscribe({ error: e => (error = e) });
      http
        .expectOne(`${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/agente/sessoes/s/mensagens`)
        .flush({ status: 404, code: 'NEG-002', message: 'x', traceId: 'tr-1' }, { status: 404, statusText: 'x' });
      expect(error instanceof ChatRequestError).toBeTrue();
      expect([(error as ChatRequestError).code, (error as ChatRequestError).traceId]).toEqual(['SESSION_NOT_FOUND', 'tr-1']);
      http.verify();
    });
  });

  describe('mock mode and the first name', () => {
    it('keeps the mock user and never calls usuarios/me', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 0 });
      let reply: { user?: unknown } | undefined;
      service.startSession().subscribe(r => (reply = r));
      http.expectOne(MOCK_URL).flush(flow);
      tick();
      expect(reply?.user).toEqual(flow.user);
      http.expectNone(`${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/usuarios/me`);
      http.verify();
    }));
  });
  describe('BFF mode: quarantine (202 + polling)', () => {
    let service: ChatApiService;
    let http: HttpTestingController;
    const base = `${DEFAULT_RUNTIME_CONFIG.apiBase}/v1/agente/sessoes/s1`;
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.pdf', { type: 'application/pdf' })];
    const UPLOAD_PASSO = { id: 'pergunta', tipo: 'TEXTO_LIVRE', enunciado: 'Pergunte.', podeVoltar: true };
    const resposta = { passo: UPLOAD_PASSO, mensagens: [{ papel: 'AGENTE', texto: 'Avaliei.' }] };
    const aprovado = (id: string, extra: object = {}) =>
      arquivo(id, 'APROVADO', { avaliacao: { aceito: true, metadados: { identificacaoNorma: 'Resolução 1' } }, ...extra });

    let events: ChatFileEvent[];
    let error: ChatRequestError | undefined;
    let done: boolean;
    let subscription: Subscription;

    const send = (retryAfter?: string) => {
      subscription = service.sendFiles('s1', 'enviar_arquivo', files, 'r1').subscribe({
        next: event => events.push(event),
        error: e => (error = e),
        complete: () => (done = true)
      });
      http
        .expectOne(`${base}/arquivos`)
        .flush({ requisicaoId: 'r1', arquivos: [arquivo('f1'), arquivo('f2')] }, {
          status: 202,
          statusText: 'Accepted',
          headers: retryAfter ? { 'Retry-After': retryAfter } : {}
        });
    };
    const check = (id: string) => {
      const request = http.expectOne(`${base}/arquivos/${id}`);
      expect(request.request.method).toBe('GET');
      return request;
    };

    beforeEach(() => {
      ({ service, http } = setup({ mock: false, mockLatencyMs: 0 }));
      events = [];
      error = undefined;
      done = false;
    });
    afterEach(() => http.verify());

    it('reports the documents in quarantine, polls every 2 s until both are out, then gives the reply and stops', fakeAsync(() => {
      send();
      expect(events).toEqual([{ checking: [true, true] }]);
      tick(FILE_CHECK_INTERVAL_MS - 1);
      http.expectNone(`${base}/arquivos/f1`);
      tick(1);
      check('f1').flush(aprovado('f1'));
      check('f2').flush(arquivo('f2'));
      expect(events).toEqual([{ checking: [true, true] }, { checking: [false, true] }]);

      tick(FILE_CHECK_INTERVAL_MS);
      http.expectNone(`${base}/arquivos/f1`); // f1 is out: only f2 is checked again
      check('f2').flush(aprovado('f2', { resposta }));
      const reply = events[2] as ChatFileReply;
      expect(reply.node.id).toBe('pergunta');
      expect(reply.messages).toEqual([{ role: 'ai', text: 'Avaliei.' }]);
      expect(reply.files.map(file => [file.id, file.accepted, file.metadata?.normIdentifier])).toEqual([
        ['f1', true, 'Resolução 1'],
        ['f2', true, 'Resolução 1']
      ]);
      expect(done).toBeTrue();
      tick(FILE_CHECK_TIMEOUT_MS); // neither another check nor the deadline after the end
      http.expectNone(() => true);
      expect(error).toBeUndefined();
    }));

    it('follows the Retry-After of the 202 and of each check', fakeAsync(() => {
      send('5');
      tick(4999);
      http.expectNone(`${base}/arquivos/f1`);
      tick(1);
      check('f1').flush(arquivo('f1'), { headers: { 'Retry-After': '1' } });
      check('f2').flush(arquivo('f2'));
      tick(1000);
      check('f1').flush(aprovado('f1'));
      check('f2').flush(aprovado('f2', { resposta }));
      expect(done).toBeTrue();
    }));

    it('asks the last document again when all are out but the reply has not come yet', fakeAsync(() => {
      send();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f1').flush(aprovado('f1'));
      check('f2').flush(aprovado('f2'));
      expect(done).toBeFalse();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f2').flush(aprovado('f2', { resposta }));
      expect(done).toBeTrue();
    }));

    it('turns a quarantine refusal into a refused result with the pt-BR reason', fakeAsync(() => {
      send();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f1').flush(arquivo('f1', 'REJEITADO', { motivoRejeicao: 'AMEACA_DETECTADA' }));
      check('f2').flush(arquivo('f2', 'REJEITADO', { motivoRejeicao: 'CONTEUDO_NAO_SUPORTADO', resposta }));
      const reply = events[events.length - 1] as ChatFileReply;
      expect(reply.files).toEqual([
        { id: 'f1', accepted: false, quarantine: 'FILE_REJECTED_UNSAFE', reason: CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE },
        { id: 'f2', accepted: false, quarantine: 'FILE_CONTENT_NOT_SUPPORTED', reason: CHAT_ERROR_TEXTS.FILE_CONTENT_NOT_SUPPORTED }
      ]);
      expect(done).toBeTrue();
    }));

    it('gives up after 2 minutes: cancels the send on the BFF and fails with FILE_CHECK_TIMEOUT', fakeAsync(() => {
      send();
      for (let elapsed = FILE_CHECK_INTERVAL_MS; elapsed < FILE_CHECK_TIMEOUT_MS; elapsed += FILE_CHECK_INTERVAL_MS) {
        tick(FILE_CHECK_INTERVAL_MS);
        check('f1').flush(arquivo('f1'));
        check('f2').flush(arquivo('f2'));
      }
      expect(error).toBeUndefined();
      tick(FILE_CHECK_INTERVAL_MS); // the deadline fires before the next check goes out
      expect([error?.code, error?.status]).toEqual(['FILE_CHECK_TIMEOUT', 0]);
      const cancel = http.expectOne(`${base}/cancelamentos`);
      expect(cancel.request.method).toBe('POST');
      expect(cancel.request.body).toEqual({ requisicaoId: 'r1' });
      cancel.flush({ passo: PASSO });
      tick(FILE_CHECK_TIMEOUT_MS);
      http.expectNone(() => true);
    }));

    it('stops polling when the conversation drops the send ("Parar", "Recomeçar", "Encerrar")', fakeAsync(() => {
      send();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f1').flush(arquivo('f1'));
      check('f2').flush(arquivo('f2'));
      subscription.unsubscribe();
      tick(FILE_CHECK_TIMEOUT_MS);
      http.expectNone(() => true); // no check and no timeout cancel: the session asks for the cancel itself
      expect(error).toBeUndefined();
    }));

    it('reads 404 on a check as an expired session, with the trace id', fakeAsync(() => {
      send();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f1').flush({ status: 404, code: 'NEG-002', traceId: 'tr-9' }, { status: 404, statusText: 'x' });
      http.expectOne(`${base}/arquivos/f2`); // cancelled together with the failed one
      expect([error?.code, error?.traceId]).toEqual(['SESSION_NOT_FOUND', 'tr-9']);
    }));

    it('tolerates two failed checks in a row and gives up on the third (SERVICE_UNAVAILABLE)', fakeAsync(() => {
      const fail = () => {
        tick(FILE_CHECK_INTERVAL_MS);
        check('f1').flush(null, { status: 503, statusText: 'x' });
        http.match(`${base}/arquivos/f2`);
      };
      send();
      fail();
      fail();
      expect(error).toBeUndefined();
      tick(FILE_CHECK_INTERVAL_MS);
      check('f1').flush(arquivo('f1'));
      check('f2').flush(arquivo('f2')); // a good round resets the count
      fail();
      fail();
      expect(error).toBeUndefined();
      fail();
      expect([error?.code, error?.status]).toEqual(['SERVICE_UNAVAILABLE', 503]);
    }));

    it('maps the synchronous refusal of the upload (413 VAL-004, 413 without body, 415) with the trace id', () => {
      const failUpload = (status: number, body: object | null) => {
        service.sendFiles('s1', 'enviar_arquivo', files, 'r1').subscribe({ error: e => (error = e) });
        http.expectOne(`${base}/arquivos`).flush(body, { status, statusText: 'x' });
        return error!;
      };
      expect([failUpload(413, { status: 413, code: 'VAL-004', traceId: 't1' }).code, error?.traceId]).toEqual(['SEND_TOO_LARGE', 't1']);
      expect(failUpload(413, null).code).toBe('SEND_TOO_LARGE');
      expect(failUpload(413, { status: 413, code: 'VAL-003' }).code).toBe('FILE_TOO_LARGE');
      expect(failUpload(415, { status: 415, code: 'VAL-002' }).code).toBe('FILE_TYPE_NOT_ALLOWED');
      expect(failUpload(422, { status: 422, code: 'NEG-003' }).code).toBe('SESSION_QUOTA_EXCEEDED');
    });

    it('treats a 202 that does not list every document as unavailable', () => {
      service.sendFiles('s1', 'enviar_arquivo', files, 'r1').subscribe({ error: e => (error = e) });
      http.expectOne(`${base}/arquivos`).flush({ requisicaoId: 'r1', arquivos: [arquivo('f1')] }, { status: 202, statusText: 'Accepted' });
      expect(error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('mock mode: quarantine', () => {
    it('shows the documents in quarantine for a short, fixed time, then the verdicts', fakeAsync(() => {
      const { service, http } = setup({ mock: true, mockLatencyMs: 100, mockFileCheckMs: 300 });
      let sessionId = '';
      service.startSession().subscribe(s => (sessionId = s.sessionId));
      http.expectOne(MOCK_URL).flush(flow);
      tick(100);
      service.sendMessage({ sessionId, nodeId: 'inicio', action: 'option', optionId: 'avaliar_arquivo', requestId: 'r1' }).subscribe();
      tick(100);

      const events: ChatFileEvent[] = [];
      const pdf = (name: string) => new File([new Uint8Array(10)], name, { type: 'application/pdf' });
      service.sendFiles(sessionId, 'enviar_arquivo', [pdf('norma.pdf'), pdf('arquivo-com-virus.pdf')], 'r2').subscribe(e => events.push(e));
      tick(99);
      expect(events).toEqual([]);
      tick(1);
      expect(events).toEqual([{ checking: [true, true] }]);
      tick(299);
      expect(events.length).toBe(1);
      tick(1);
      const reply = events[1] as ChatFileReply;
      expect(reply.files.map(file => [file.accepted, file.quarantine])).toEqual([[true, undefined], [false, 'FILE_REJECTED_UNSAFE']]);
      expect(reply.files[1].reason).toBe(CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE);
    }));

    it('waits MOCK_FILE_CHECK_MS when the config does not say', () => {
      expect(MOCK_FILE_CHECK_MS).toBeGreaterThan(0);
      expect(MOCK_FILE_CHECK_MS).toBeLessThanOrEqual(2000);
    });
  });

  describe('retryAfterMs', () => {
    const headers = (value?: string) => new HttpHeaders(value === undefined ? {} : { 'Retry-After': value });

    it('reads seconds and keeps them between 1 and 10 s; anything else is the 2 s of the contract', () => {
      expect(retryAfterMs(headers('3'))).toBe(3000);
      expect(retryAfterMs(headers('0.2'))).toBe(1000);
      expect(retryAfterMs(headers('3600'))).toBe(10_000);
      expect(retryAfterMs(headers())).toBe(FILE_CHECK_INTERVAL_MS);
      expect(retryAfterMs(headers('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(FILE_CHECK_INTERVAL_MS);
      expect(retryAfterMs(null)).toBe(FILE_CHECK_INTERVAL_MS);
    });
  });
});
