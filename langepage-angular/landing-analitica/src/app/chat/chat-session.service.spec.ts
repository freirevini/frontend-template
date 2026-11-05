import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { ChatApiService } from './chat-api.service';
import { buildChatSuggestions } from './chat-suggestions';
import { ChatRequestError } from './chat-request-error';
import { ChatSessionService, ChatState } from './chat-session.service';
import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from './chat-texts';
import { ChatApiMessage, ChatFileEvent, ChatFileReply, ChatNode, ChatReply, ChatSessionReply } from './chat.model';

const MENU: ChatNode = { id: 'inicio', type: 'menu', prompt: 'O que você precisa?', canGoBack: false, options: [{ id: 'consultar', label: 'Consultar uma norma' }] };
const TEXT: ChatNode = { id: 'consultar_tema', type: 'free_text', prompt: 'Descreva.', canGoBack: true, input: { enabled: true, maxChars: 1000 } };
const UPLOAD: ChatNode = { id: 'enviar_arquivo', type: 'upload', prompt: 'Envie.', canGoBack: true, upload: { accept: ['.pdf'], maxBytes: 20 * 1024 * 1024, maxFiles: 1 } };

const session = (messages: ChatApiMessage[] = [{ role: 'ai', text: 'Olá' }]): ChatSessionReply => ({ sessionId: 's1', node: MENU, messages });
const reply = (node: ChatNode, messages: ChatApiMessage[]): ChatReply => ({ node, messages });
const LONG = 'uma resposta bem longa para mostrar o efeito de digitação palavra por palavra no painel do assistente';

describe('ChatSessionService', () => {
  let service: ChatSessionService;
  let api: jasmine.SpyObj<ChatApiService>;
  let current: ChatState;

  const texts = () => current.messages.map(m => m.text);
  const last = () => current.messages[current.messages.length - 1];
  const started = () => {
    api.startSession.and.returnValue(of(session()));
    service.start();
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['startSession', 'sendMessage', 'sendFiles', 'sendFeedback', 'endSession', 'cancelRequest']);
    api.endSession.and.returnValue(of(undefined));
    api.cancelRequest.and.returnValue(of({ node: MENU }));
    TestBed.configureTestingModule({ providers: [{ provide: ChatApiService, useValue: api }] });
    service = TestBed.inject(ChatSessionService);
    service.now = () => new Date(2026, 9, 28, 15, 0); // afternoon
    service.state$.subscribe(state => (current = state));
  });

  describe('start', () => {
    it('shows the typing bubble while waiting, then the welcome and the first step', () => {
      const pending = new Subject<ChatSessionReply>();
      api.startSession.and.returnValue(pending);
      service.start();
      expect(current.busy).toBeTrue();
      expect(current.typing).toBeTrue();
      expect(current.node).toBeNull();

      pending.next(session());
      expect(texts()).toEqual(['Boa tarde! Olá']);
      expect(current.node).toEqual(MENU);
      expect(current.busy).toBeFalse();
      expect(current.typing).toBeFalse();
    });

    it('opens only one session', () => {
      started();
      service.start();
      expect(api.startSession).toHaveBeenCalledTimes(1);
    });

    it('shows a retryable error when it fails and retries on demand', () => {
      api.startSession.and.returnValues(throwError(() => new ChatRequestError('SERVICE_UNAVAILABLE', 503)), of(session()));
      service.start();
      expect(last().status).toBe('error');
      expect(last().text).toBe(CHAT_ERROR_TEXTS.SERVICE_UNAVAILABLE);
      expect(current.canRetry).toBeTrue();
      expect(current.busy).toBeFalse();

      service.retry();
      expect(api.startSession).toHaveBeenCalledTimes(2);
      expect(texts()).toEqual(['Boa tarde! Olá']); // the error message is gone
      expect(current.node).toEqual(MENU);
      expect(current.canRetry).toBeFalse();
    });
  });

  describe('interaction flag (enables "Recomeçar")', () => {
    beforeEach(started);

    it('is off at the start and on after an option, text, document or "Voltar"', () => {
      expect(current.hasInteraction).toBeFalse();
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      expect(current.hasInteraction).toBeTrue();
    });

    it('turns on for text, document and back too', () => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.sendText('oi');
      expect(current.hasInteraction).toBeTrue();
    });

    it('turns on for a document', () => {
      api.sendFiles.and.returnValue(of({ node: UPLOAD, messages: [], files: [{ id: 'f', accepted: true }] }));
      service.sendFiles([new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })]);
      expect(current.hasInteraction).toBeTrue();
    });

    it('turns on for back', () => {
      api.sendMessage.and.returnValue(of(reply(MENU, [])));
      service.back();
      expect(current.hasInteraction).toBeTrue();
    });

    it('is not turned on by the agent speaking or by a failure at the start', () => {
      expect(current.hasInteraction).toBeFalse();
      expect(current.messages.length).toBeGreaterThan(0);
    });

    it('turns off again on restart', () => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      api.startSession.and.returnValue(of({ ...session(), sessionId: 's2' }));
      service.restart();
      expect(current.hasInteraction).toBeFalse();
    });
  });

  describe('conversation', () => {
    beforeEach(started);

    it('sends the chosen option with the session, node and option ids, and shows what the user chose', () => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: 'Descreva.' }])));
      service.pickOption(MENU.options![0]);
      expect(api.sendMessage).toHaveBeenCalledWith({ sessionId: 's1', nodeId: 'inicio', action: 'option', optionId: 'consultar', requestId: jasmine.any(String) });
      expect(texts()).toEqual(['Boa tarde! Olá', 'Consultar uma norma', 'Descreva.']);
      expect(current.messages[1].role).toBe('user');
      expect(current.node).toEqual(TEXT);
    });

    it('sends text for the current step', () => {
      api.sendMessage.and.returnValues(of(reply(TEXT, [])), of(reply(TEXT, [{ role: 'ai', status: 'answer', text: 'Resposta', citations: [{ sourceId: 'a', excerpt: 'b' }] }])));
      service.pickOption(MENU.options![0]);
      service.sendText('qual o prazo?');
      expect(api.sendMessage).toHaveBeenCalledWith({ sessionId: 's1', nodeId: 'consultar_tema', action: 'text', text: 'qual o prazo?', requestId: jasmine.any(String) });
      expect(last().citations!.length).toBe(1);
    });

    it('ignores blank text and actions while busy or before the session exists', () => {
      service.sendText('   ');
      expect(api.sendMessage).not.toHaveBeenCalled();

      api.sendMessage.and.returnValue(new Subject<ChatReply>());
      service.pickOption(MENU.options![0]);
      service.pickOption(MENU.options![0]);
      service.sendText('outra');
      expect(api.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('goes back without adding a user message', () => {
      api.sendMessage.and.returnValue(of(reply(MENU, [{ role: 'ai', text: MENU.prompt }])));
      service.back();
      expect(api.sendMessage).toHaveBeenCalledWith({ sessionId: 's1', nodeId: 'inicio', action: 'back', requestId: jasmine.any(String) });
      expect(current.messages.filter(m => m.role === 'user').length).toBe(0);
    });

    it('turns a failed request into an error message and repeats it without duplicating the user message', () => {
      api.sendMessage.and.returnValues(throwError(() => new ChatRequestError('RATE_LIMITED', 429)), of(reply(TEXT, [{ role: 'ai', text: 'ok' }])));
      service.pickOption(MENU.options![0]);
      expect(last().text).toBe(CHAT_ERROR_TEXTS.RATE_LIMITED);
      expect(current.canRetry).toBeTrue();

      service.retry();
      expect(api.sendMessage).toHaveBeenCalledTimes(2);
      expect(texts()).toEqual(['Boa tarde! Olá', 'Consultar uma norma', 'ok']);
      // Same request id on the retry, so the BFF answers it once even if the first try reached it.
      const [first, second] = api.sendMessage.calls.allArgs().map(([request]) => request.requestId);
      expect(second).toBe(first);
    });

    it('gives each new request its own id', () => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      service.sendText('qual o prazo?');
      const [first, second] = api.sendMessage.calls.allArgs().map(([request]) => request.requestId);
      expect(first).toBeTruthy();
      expect(second).not.toBe(first);
    });

    it('opens a new session when the old one expired and says so', () => {
      api.sendMessage.and.returnValue(throwError(() => new ChatRequestError('SESSION_NOT_FOUND', 404)));
      api.startSession.and.returnValue(of({ ...session([{ role: 'ai', text: 'De novo' }]), sessionId: 's2' }));
      service.pickOption(MENU.options![0]);
      expect(api.startSession).toHaveBeenCalledTimes(2);
      expect(texts()).toContain(CHAT_TEXTS.sessionExpired);
      expect(last().text).toBe('Boa tarde! De novo');
      expect(current.node).toEqual(MENU);
      expect(current.canRetry).toBeFalse();
    });

    it('treats an unexpected failure as service unavailable', () => {
      api.sendMessage.and.returnValue(throwError(() => new Error('boom')));
      service.pickOption(MENU.options![0]);
      expect(last().text).toBe(CHAT_ERROR_TEXTS.SERVICE_UNAVAILABLE);
    });
  });

  describe('documents', () => {
    const file = new File([new Uint8Array(2048)], 'norma.pdf', { type: 'application/pdf' });
    const fileReply = (accepted: boolean): ChatFileReply => ({
      node: UPLOAD,
      messages: [{ role: 'ai', text: accepted ? 'Recebi.' : 'Não é norma.' }],
      files: [{ id: 'f1', accepted }]
    });

    beforeEach(() => {
      started();
      api.sendMessage.and.returnValue(of(reply(UPLOAD, [])));
      service.pickOption(MENU.options![0]);
    });

    it('shows the file, then its verdict, and counts only accepted bytes', () => {
      const pending = new Subject<ChatFileReply>();
      api.sendFiles.and.returnValue(pending);
      service.sendFiles([file]);
      expect(api.sendFiles).toHaveBeenCalledWith('s1', 'enviar_arquivo', [file], jasmine.any(String));
      const mine = current.messages.find(m => m.files)!;
      expect(mine.files).toEqual([{ name: 'norma.pdf', sizeBytes: 2048 }]);

      pending.next(fileReply(true));
      expect(current.messages.find(m => m.files)!.files![0].accepted).toBeTrue();
      expect(current.usedBytes).toBe(2048);
      expect(current.messages.some(m => m.fileResults)).toBeFalse(); // one document: no table

      api.sendFiles.and.returnValue(of(fileReply(false)));
      service.sendFiles([file]);
      expect(current.messages.filter(m => m.files).pop()!.files![0].accepted).toBeFalse();
      expect(current.usedBytes).toBe(2048);
    });

    it('sends several documents together, marks each one and adds the results table to the answer', () => {
      const word = new File([new Uint8Array(1000)], 'circular.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      api.sendFiles.and.returnValue(of({
        node: TEXT,
        messages: [{ role: 'ai', text: 'Avaliei 2.' }, { role: 'ai', text: 'Pergunta?' }],
        files: [{ id: 'f1', accepted: true, metadata: { normIdentifier: 'Resolução 1' } }, { id: 'f2', accepted: false, reason: 'Não é norma.' }]
      }));
      service.sendFiles([file, word]);
      expect(api.sendFiles.calls.mostRecent().args[2]).toEqual([file, word]);
      expect(current.messages.find(m => m.files)!.files!.map(f => [f.name, f.accepted])).toEqual([['norma.pdf', true], ['circular.docx', false]]);
      expect(current.usedBytes).toBe(2048);
      const table = current.messages.find(m => m.text === 'Avaliei 2.')!.fileResults!;
      expect(table.map(row => [row.name, row.sizeBytes, row.result.accepted])).toEqual([['norma.pdf', 2048, true], ['circular.docx', 1000, false]]);
      expect(current.messages.find(m => m.text === 'Pergunta?')!.fileResults).toBeUndefined();
    });

    it('shows the BFF refusal as an error message', () => {
      api.sendFiles.and.returnValue(throwError(() => new ChatRequestError('FILE_TOO_LARGE', 413)));
      service.sendFiles([file]);
      expect(last().text).toBe(CHAT_ERROR_TEXTS.FILE_TOO_LARGE);
    });

    describe('quarantine', () => {
      const note = () => current.messages.find(m => m.role === 'system' && m.text?.startsWith('Verificando'));
      const mine = () => current.messages.find(m => m.files)!;

      it('shows "Verificando o documento..." on the file and as a note, then the verdict, and drops the note', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        service.sendFiles([file]);
        expect(current.typing).toBeTrue();

        pending.next({ checking: [true] });
        expect(mine().files).toEqual([{ name: 'norma.pdf', sizeBytes: 2048, checking: true }]);
        expect(note()?.text).toBe(CHAT_TEXTS.fileChecking);
        expect(note()?.transient).toBeTrue();
        expect(current.typing).toBeFalse(); // the note replaces the typing dots
        expect(current.busy).toBeTrue(); // "Parar" stays

        pending.next({ checking: [true] }); // a later round does not add another note
        expect(current.messages.filter(m => m.role === 'system').length).toBe(1);

        pending.next(fileReply(true));
        pending.complete();
        expect(mine().files).toEqual([{ name: 'norma.pdf', sizeBytes: 2048, accepted: true }]);
        expect(note()).toBeUndefined();
        expect(current.usedBytes).toBe(2048);
      });

      it('says "Verificando os documentos..." for several and marks only those still in quarantine', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        const other = new File([new Uint8Array(10)], 'b.pdf', { type: 'application/pdf' });
        service.sendFiles([file, other]);
        pending.next({ checking: [false, true] });
        expect(mine().files!.map(f => !!f.checking)).toEqual([false, true]);
        expect(note()?.text).toBe(CHAT_TEXTS.fileCheckingMany);
      });

      it('shows the pt-BR reason of a quarantine refusal on the file and counts no bytes', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        service.sendFiles([file]);
        pending.next({ checking: [true] });
        pending.next({
          node: UPLOAD,
          messages: [{ role: 'ai', text: 'Não consegui avaliar.' }],
          files: [{ id: 'f1', accepted: false, quarantine: 'FILE_REJECTED_UNSAFE', reason: CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE }]
        });
        pending.complete();
        expect(mine().files).toEqual([{ name: 'norma.pdf', sizeBytes: 2048, accepted: false, reason: CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE }]);
        expect(current.usedBytes).toBe(0);
        expect(note()).toBeUndefined();
      });

      it('does not put the evaluation reason (not a quarantine refusal) on the file', () => {
        api.sendFiles.and.returnValue(of({ node: UPLOAD, messages: [], files: [{ id: 'f1', accepted: false, reason: 'Não é norma.' }] }));
        service.sendFiles([file]);
        expect(mine().files![0].reason).toBeUndefined();
      });

      it('"Parar" stops the polling, asks the BFF to cancel the send and leaves no file "verificando"', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        service.sendFiles([file]);
        const requestId = api.sendFiles.calls.mostRecent().args[3];
        pending.next({ checking: [true] });

        service.stop();
        expect(pending.observed).toBeFalse();
        expect(api.cancelRequest).toHaveBeenCalledOnceWith({ sessionId: 's1', requestId });
        expect(mine().files).toEqual([{ name: 'norma.pdf', sizeBytes: 2048 }]);
        expect(note()).toBeUndefined();
        expect(current.busy).toBeFalse();
      });

      it('stops the polling when the conversation restarts or ends', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        service.sendFiles([file]);
        pending.next({ checking: [true] });
        service.end();
        expect(pending.observed).toBeFalse();
        expect(note()).toBeUndefined();
      });

      it('shows the time-out as a retryable error, without the note', () => {
        const pending = new Subject<ChatFileEvent>();
        api.sendFiles.and.returnValue(pending);
        service.sendFiles([file]);
        pending.next({ checking: [true] });
        pending.error(new ChatRequestError('FILE_CHECK_TIMEOUT', 0));
        expect(last().text).toBe(CHAT_ERROR_TEXTS.FILE_CHECK_TIMEOUT);
        expect(last().status).toBe('error');
        expect(current.canRetry).toBeTrue();
        expect(note()).toBeUndefined();
        expect(mine().files![0].checking).toBeUndefined();
      });
    });
  });

  describe('support code', () => {
    beforeEach(started);

    it('puts the trace id of a failed request on the error message, never the server text', () => {
      api.sendMessage.and.returnValue(throwError(() => new ChatRequestError('SEND_TOO_LARGE', 413, '4bf92f35')));
      service.pickOption(MENU.options![0]);
      expect(last().text).toBe(CHAT_ERROR_TEXTS.SEND_TOO_LARGE);
      expect(last().supportCode).toBe('4bf92f35');
    });

    it('has no support code when the failure carried no trace id', () => {
      api.sendMessage.and.returnValue(throwError(() => new ChatRequestError('SERVICE_UNAVAILABLE', 503)));
      service.pickOption(MENU.options![0]);
      expect(last().status).toBe('error');
      expect('supportCode' in last()).toBeFalse();
    });
  });

  describe('stop', () => {
    beforeEach(started);

    it('drops the pending request and ignores a late answer', () => {
      const pending = new Subject<ChatReply>();
      api.sendMessage.and.returnValue(pending);
      service.pickOption(MENU.options![0]);
      expect(pending.observed).toBeTrue();

      service.stop();
      expect(pending.observed).toBeFalse();
      expect(current.busy).toBeFalse();
      expect(current.typing).toBeFalse();
      expect(current.node).toEqual(MENU);
      expect(current.canRetry).toBeFalse();
    });

    it('asks the BFF to undo the stopped request and takes the step it reports', () => {
      const pending = new Subject<ChatReply>();
      api.sendMessage.and.returnValue(pending);
      api.cancelRequest.and.returnValue(of({ node: TEXT }));
      service.pickOption(MENU.options![0]);
      const requestId = api.sendMessage.calls.mostRecent().args[0].requestId;

      service.stop();
      expect(api.cancelRequest).toHaveBeenCalledOnceWith({ sessionId: 's1', requestId });
      expect(current.node).toEqual(TEXT);
    });

    it('ignores a late cancel reply once the user has moved on', () => {
      const cancel = new Subject<{ node: ChatNode }>();
      api.cancelRequest.and.returnValue(cancel);
      api.sendMessage.and.returnValue(new Subject<ChatReply>());
      service.pickOption(MENU.options![0]);
      service.stop();
      api.sendMessage.and.returnValue(of(reply(UPLOAD, [])));
      service.pickOption(MENU.options![0]);
      cancel.next({ node: TEXT });
      expect(current.node).toEqual(UPLOAD);
    });

    it('keeps the step when the cancel fails', () => {
      api.sendMessage.and.returnValue(new Subject<ChatReply>());
      api.cancelRequest.and.returnValue(throwError(() => new ChatRequestError('SERVICE_UNAVAILABLE', 503)));
      service.pickOption(MENU.options![0]);
      service.stop();
      expect(current.node).toEqual(MENU);
      expect(current.busy).toBeFalse();
    });

    it('does not cancel anything on the server while only the typing effect runs', fakeAsync(() => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: LONG }])));
      service.pickOption(MENU.options![0]);
      service.stop();
      expect(api.cancelRequest).not.toHaveBeenCalled();
      expect(last().text).toBe(LONG);
    }));
  });

  describe('typed goodbye', () => {
    beforeEach(() => {
      started();
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      api.sendMessage.calls.reset();
    });

    it('closes the conversation like "Encerrar" without sending the goodbye to the agent', fakeAsync(() => {
      service.sendText('Obrigado, era só isso. Tchau!');
      tick(5000);
      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(api.endSession).toHaveBeenCalledOnceWith('s1');
      expect(texts().slice(-2)).toEqual(['Obrigado, era só isso. Tchau!', CHAT_TEXTS.farewell]);
      expect(current.node?.type).toBe('end');
    }));

    it('sends a question that only starts with thanks', () => {
      service.sendText('obrigado, e qual o prazo?');
      expect(api.sendMessage).toHaveBeenCalledTimes(1);
      expect(api.endSession).not.toHaveBeenCalled();
    });
  });

  describe('questions from other screens (ask)', () => {
    it('waits for the session, then sends the question with action "ask"', () => {
      const pending = new Subject<ChatSessionReply>();
      api.startSession.and.returnValue(pending);
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', status: 'answer', text: 'Resposta' }])));
      service.ask('  Qual o prazo da Resolução 1?  ');
      expect(api.sendMessage).not.toHaveBeenCalled();

      pending.next(session());
      expect(api.sendMessage).toHaveBeenCalledOnceWith({
        sessionId: 's1', nodeId: 'inicio', action: 'ask', text: 'Qual o prazo da Resolução 1?', requestId: jasmine.any(String)
      });
      expect(texts()).toEqual(['Boa tarde! Olá', 'Qual o prazo da Resolução 1?', 'Resposta']);
      expect(current.hasInteraction).toBeTrue();
      expect(current.node).toEqual(TEXT);
    });

    it('waits for the answer in progress before asking', () => {
      started();
      const pending = new Subject<ChatReply>();
      api.sendMessage.and.returnValue(pending);
      service.pickOption(MENU.options![0]);
      service.ask('pergunta');
      expect(api.sendMessage).toHaveBeenCalledTimes(1);

      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      pending.next(reply(TEXT, []));
      expect(api.sendMessage).toHaveBeenCalledTimes(2);
      expect(api.sendMessage.calls.mostRecent().args[0].action).toBe('ask');
    });

    it('starts over after "Encerrar"', () => {
      started();
      service.end();
      api.startSession.and.returnValue(of({ ...session(), sessionId: 's2' }));
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.ask('pergunta');
      expect(api.sendMessage.calls.mostRecent().args[0].sessionId).toBe('s2');
      expect(texts()).toEqual(['Boa tarde! Olá', 'pergunta']);
    });

    it('ignores a blank question', () => {
      started();
      service.ask('   ');
      expect(api.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('greeting', () => {
    it('greets by the time of day and the first name the BFF knows, at the start of the welcome', fakeAsync(() => {
      api.startSession.and.returnValue(of({ ...session([{ role: 'ai', text: 'Sou o agente.' }]), user: { firstName: 'VINICIUS FREIRE' } }));
      service.now = () => new Date(2026, 9, 28, 9, 30);
      service.start();
      tick(5000); // typing effect
      expect(texts()).toEqual(['Bom dia, Vinicius! Sou o agente.']);
    }));

    it('greets without a name when the BFF does not know the user, and again on "Recomeçar" by the new time', () => {
      started();
      service.now = () => new Date(2026, 9, 28, 20, 0);
      api.startSession.and.returnValue(of({ ...session(), sessionId: 's2' }));
      service.restart();
      expect(texts()).toEqual(['Boa noite! Olá']);
    });
  });

  describe('progress notes (transient)', () => {
    it('drops them at the user\'s next action', () => {
      api.startSession.and.returnValue(of(session([{ role: 'ai', text: 'Consultando a base…', transient: true }, { role: 'ai', text: 'Olá' }])));
      service.start();
      expect(texts()).toEqual(['Consultando a base…', 'Boa tarde! Olá']);
      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      expect(texts()).toEqual(['Boa tarde! Olá', 'Consultar uma norma']);
    });
  });

  describe('events without content (messages$, errors$)', () => {
    it('reports each message once it is on screen, without its text', () => {
      const events: unknown[] = [];
      service.messages$.subscribe(event => events.push(event));
      started();
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', status: 'answer', text: 'R', citations: [{ sourceId: 'a', excerpt: 'b' }] }])));
      service.pickOption(MENU.options![0]);
      expect(events).toEqual([
        { id: jasmine.any(String), role: 'ai', status: undefined, nodeId: 'inicio', hasFile: false, sourceCount: 0 },
        { id: jasmine.any(String), role: 'user', status: undefined, nodeId: 'inicio', hasFile: false, sourceCount: 0 },
        { id: jasmine.any(String), role: 'ai', status: 'answer', nodeId: 'consultar_tema', hasFile: false, sourceCount: 1 }
      ]);
      expect(JSON.stringify(events)).not.toContain('Consultar uma norma');
    });

    it('reports failures with their code', () => {
      const errors: unknown[] = [];
      service.errors$.subscribe(event => errors.push(event));
      started();
      api.sendMessage.and.returnValue(throwError(() => new ChatRequestError('RATE_LIMITED', 429)));
      service.pickOption(MENU.options![0]);
      expect(errors).toEqual([{ code: 'RATE_LIMITED', retryable: true }]);
    });
  });

  describe('typing effect', () => {
    beforeEach(started);

    it('shows agent text word by word, then the sources, and offers the next step only at the end', fakeAsync(() => {
      const answer: ChatApiMessage = { role: 'ai', status: 'answer', text: LONG, citations: [{ sourceId: 'a', excerpt: 'b' }] };
      api.sendMessage.and.returnValue(of(reply(TEXT, [answer])));
      service.pickOption(MENU.options![0]);

      expect(last().text).toBe('');
      expect(last().citations).toBeUndefined();
      expect(current.busy).toBeTrue();
      expect(current.node).toEqual(MENU);

      tick(25 * 3);
      expect(last().text!.length).toBeGreaterThan(0);
      expect(last().text!.length).toBeLessThan(LONG.length);

      tick(25 * 100);
      expect(last().text).toBe(LONG);
      expect(last().citations!.length).toBe(1);
      expect(current.busy).toBeFalse();
      expect(current.node).toEqual(TEXT);
    }));

    it('"Parar" shows the whole answer and the next step at once', fakeAsync(() => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: LONG }])));
      service.pickOption(MENU.options![0]);
      tick(25);
      service.stop();
      expect(last().text).toBe(LONG);
      expect(current.busy).toBeFalse();
      expect(current.node).toEqual(TEXT);
      tick(25 * 100); // the effect must not keep running
      expect(last().text).toBe(LONG);
    }));

    it('shows user text and short messages immediately', () => {
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: 'curta' }])));
      service.pickOption(MENU.options![0]);
      expect(last().text).toBe('curta');
      expect(current.busy).toBeFalse();
    });

    it('skips the effect when the user prefers reduced motion', () => {
      spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: LONG }])));
      service.pickOption(MENU.options![0]);
      expect(last().text).toBe(LONG);
      expect(current.busy).toBeFalse();
    });
  });

  describe('feedback', () => {
    const answer: ChatApiMessage = { role: 'ai', status: 'answer', text: 'Resposta', citations: [{ sourceId: 'mock-1', excerpt: 'a' }, { sourceId: 'mock-2', excerpt: 'b' }] };
    const answered = () => {
      started();
      api.sendMessage.and.returnValue(of(reply(TEXT, [answer])));
      service.pickOption(MENU.options![0]);
      return current.messages.find(m => m.status === 'answer')!;
    };

    beforeEach(() => api.sendFeedback.and.returnValue(of(undefined)));

    it('sends the rating with the session and the shown sources, and thanks at once, without adding a message', () => {
      const message = answered();
      const count = current.messages.length;
      service.rateMessage(message.id, 'useful');
      expect(api.sendFeedback).toHaveBeenCalledWith({ sessionId: 's1', rating: 'useful', sourceIds: ['mock-1', 'mock-2'] });
      expect(current.messages.find(m => m.id === message.id)!.feedback).toBe('useful');
      expect(current.messages.length).toBe(count);
    });

    it('accepts one rating per answer', () => {
      const message = answered();
      service.rateMessage(message.id, 'useful');
      service.rateMessage(message.id, 'not_useful');
      expect(api.sendFeedback).toHaveBeenCalledTimes(1);
    });

    it('takes the rating back and flags the error when sending fails, so the user can try again', () => {
      const message = answered();
      api.sendFeedback.and.returnValue(throwError(() => new ChatRequestError('SERVICE_UNAVAILABLE', 503)));
      service.rateMessage(message.id, 'not_useful');
      const after = current.messages.find(m => m.id === message.id)!;
      expect(after.feedback).toBeUndefined();
      expect(after.feedbackError).toBeTrue();

      api.sendFeedback.and.returnValue(of(undefined));
      service.rateMessage(message.id, 'not_useful');
      const retried = current.messages.find(m => m.id === message.id)!;
      expect(retried.feedback).toBe('not_useful');
      expect(retried.feedbackError).toBeFalse();
    });

    it('works while the agent is busy', () => {
      const message = answered();
      api.sendMessage.and.returnValue(new Subject<ChatReply>());
      service.pickOption(MENU.options![0]);
      expect(current.busy).toBeTrue();
      service.rateMessage(message.id, 'useful');
      expect(api.sendFeedback).toHaveBeenCalledTimes(1);
    });

    it('ignores messages that cannot be rated and unknown ids', () => {
      started();
      const welcome = current.messages[0];
      service.rateMessage(welcome.id, 'useful');
      service.rateMessage('nao-existe', 'useful');
      expect(api.sendFeedback).not.toHaveBeenCalled();
    });

    it('does not offer the rating while the answer is still being typed', fakeAsync(() => {
      started();
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ ...answer, text: LONG }])));
      service.pickOption(MENU.options![0]);
      expect(last().status).toBeUndefined();
      tick(25 * 100);
      expect(last().status).toBe('answer');
    }));
  });

  describe('restart', () => {
    it('ends the old session, clears the conversation and opens a new one', () => {
      started();
      api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: 'x' }])));
      service.pickOption(MENU.options![0]);

      api.startSession.and.returnValue(of({ ...session([{ role: 'ai', text: 'Novo começo' }]), sessionId: 's2' }));
      service.restart();
      expect(api.endSession).toHaveBeenCalledWith('s1');
      expect(texts()).toEqual(['Boa tarde! Novo começo']);
      expect(current.node).toEqual(MENU);
      expect(current.usedBytes).toBe(0);

      api.sendMessage.and.returnValue(of(reply(TEXT, [])));
      service.pickOption(MENU.options![0]);
      expect(api.sendMessage.calls.mostRecent().args[0].sessionId).toBe('s2');
    });

    it('cancels a request in flight', () => {
      started();
      const pending = new Subject<ChatReply>();
      api.sendMessage.and.returnValue(pending);
      service.pickOption(MENU.options![0]);
      service.restart();
      expect(pending.observed).toBeFalse();
    });

    describe('"end" (Encerrar)', () => {
      const talked = () => {
        started();
        api.sendMessage.and.returnValue(of(reply(TEXT, [{ role: 'ai', text: 'x' }])));
        service.pickOption(MENU.options![0]);
        api.startSession.calls.reset();
      };

      it('drops the session on the server but keeps the conversation, and adds the goodbye', fakeAsync(() => {
        talked();
        const before = texts();
        service.end();
        tick(25 * 100); // the goodbye is typed word by word
        expect(api.endSession).toHaveBeenCalledWith('s1');
        expect(texts().slice(0, before.length)).toEqual(before); // nothing was cleared
        expect(last().role).toBe('ai');
        expect(last().text).toBe(CHAT_TEXTS.farewell);
        expect(last().status).toBeUndefined(); // a goodbye is not an answer: no feedback
        expect(current.hasInteraction).toBeTrue(); // "Recomeçar" stays enabled
        expect(current.busy).toBeFalse();
      }));

      it('moves to a step where only "Recomeçar" is left', fakeAsync(() => {
        talked();
        service.end();
        tick(25 * 100);
        expect(current.node!.type).toBe('end');
        expect(buildChatSuggestions(current.node, current.busy, current.hasInteraction).map(s => s.kind)).toEqual(['restart']);
      }));

      it('does not open a new session by itself, even when the panel is reopened', fakeAsync(() => {
        talked();
        service.end();
        tick(25 * 100);
        service.start(); // what opening the assistant does
        expect(api.startSession).not.toHaveBeenCalled();
      }));

      it('does nothing when it was already ended or nothing was said', fakeAsync(() => {
        service.end();
        expect(api.endSession).not.toHaveBeenCalled();
        talked();
        service.end();
        tick(25 * 100);
        api.endSession.calls.reset();
        service.end();
        expect(api.endSession).not.toHaveBeenCalled();
      }));

      it('"restart" after it clears the conversation and opens a new session', fakeAsync(() => {
        talked();
        service.end();
        tick(25 * 100);
        api.startSession.and.returnValue(of({ ...session([{ role: 'ai', text: 'Novo começo' }]), sessionId: 's2' }));
        service.restart();
        expect(texts()).toEqual(['Boa tarde! Novo começo']);
        expect(current.node).toEqual(MENU);
        expect(current.hasInteraction).toBeFalse();
        expect(api.endSession).toHaveBeenCalledTimes(1); // only the one from "Encerrar": there was no session left to drop
      }));

      it('cancels a request in flight', () => {
        started();
        const pending = new Subject<ChatReply>();
        api.sendMessage.and.returnValue(pending);
        service.pickOption(MENU.options![0]);
        service.end();
        expect(pending.observed).toBeFalse();
      });
    });

    it('survives a failure of the end-session call', () => {
      started();
      api.endSession.and.returnValue(throwError(() => new Error('offline')) as Observable<void>);
      expect(() => service.restart()).not.toThrow();
      expect(api.startSession).toHaveBeenCalledTimes(2);
    });
  });
});
