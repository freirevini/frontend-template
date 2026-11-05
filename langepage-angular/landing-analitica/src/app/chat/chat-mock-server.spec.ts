import { ChatMockServer } from './chat-mock-server';
import { ChatRequestError } from './chat-request-error';
import { CHAT_ERROR_TEXTS } from './chat-texts';
import { loadChatFlow, MB, pdfFile } from './chat-test-helpers';
import { ChatMessageRequest } from './chat.model';

describe('ChatMockServer (against the shipped mock file)', () => {
  let server: ChatMockServer;
  let sessionId: string;
  let nodeId: string;
  let requests = 0;
  const rid = () => `req-${++requests}`;

  const message = (request: Partial<ChatMessageRequest>) => {
    const reply = server.handleMessage({ sessionId, nodeId, action: 'text', requestId: rid(), ...request });
    nodeId = reply.node.id;
    return reply;
  };
  const failure = (action: () => unknown): ChatRequestError => {
    try {
      action();
    } catch (error) {
      return error as ChatRequestError;
    }
    throw new Error('expected a ChatRequestError');
  };
  const upload = (file: ReturnType<typeof pdfFile>) => {
    const reply = server.handleFiles(sessionId, nodeId, [file], rid());
    nodeId = reply.node.id;
    return reply;
  };
  const toConsult = () => message({ action: 'option', optionId: 'consultar' });
  const toUpload = () => message({ action: 'option', optionId: 'avaliar_arquivo' });

  beforeEach(async () => {
    server = new ChatMockServer(await loadChatFlow());
    const start = server.startSession();
    sessionId = start.sessionId;
    nodeId = start.node.id;
  });

  describe('the shipped file', () => {
    it('has consistent nodes, transitions, back targets and contacts', async () => {
      const flow = await loadChatFlow();
      expect(flow.nodes[flow.start]).toBeDefined();
      Object.entries(flow.nodes).forEach(([key, node]) => {
        expect(node.id).toBe(key);
        if (node.type === 'menu') {
          node.options!.forEach(option => expect(flow.nodes[flow.transitions[key][option.id]]).toBeDefined());
        }
        if (node.type === 'upload') {
          expect(node.upload).toBeDefined();
        }
        if (node.canGoBack) {
          expect(flow.nodes[flow.back[key]]).toBeDefined();
        }
      });
      Object.values(flow.transitions).forEach(map => Object.values(map).forEach(to => expect(flow.nodes[to]).toBeDefined()));
      expect(flow.contacts[flow.fallbacks.roundsExceeded.contactsRef!]).toBeDefined();
      expect(flow.contacts[flow.fallbacks.outOfScopeLimit.contactsRef!]).toBeDefined();
      expect(flow.contacts['geral'].some(contact => contact.channel === 'contato@compliance.com.br')).toBeTrue();
      expect(flow.maxClarificationRounds).toBe(3);
    });
  });

  describe('session', () => {
    it('starts at the first node with the welcome and the prompt', () => {
      const start = server.startSession();
      expect(start.sessionId).not.toBe(sessionId);
      expect(start.node.id).toBe('inicio');
      expect(start.messages.length).toBe(2);
      expect(start.messages[0].text).toContain('Agente da Agenda');
      expect(start.messages[0].text).not.toMatch(/^(Olá|Bom dia|Boa tarde|Boa noite)/); // the widget greets
      expect(start.user).toEqual({ firstName: 'Vinicius' });
      expect(start.messages[1].text).toBe(start.node.prompt);
    });

    it('rejects an unknown or ended session with 404', () => {
      expect(failure(() => server.handleMessage({ sessionId: 'x', nodeId, action: 'text', text: 'a', requestId: rid() })).code).toBe('SESSION_NOT_FOUND');
      server.endSession(sessionId);
      const error = failure(() => message({ action: 'back' }));
      expect(error.code).toBe('SESSION_NOT_FOUND');
      expect(error.status).toBe(404);
    });

    it('rejects a request made for another node', () => {
      expect(failure(() => message({ nodeId: 'consultar_tema', action: 'text', text: 'oi' })).code).toBe('INVALID_ACTION');
    });

    it('never hands out the shared mock objects', () => {
      server.startSession().messages[0].text = 'alterado';
      expect(server.startSession().messages[0].text).not.toBe('alterado');
    });
  });

  describe('menu, back and restart', () => {
    it('follows an option and shows the next prompt', () => {
      const reply = toConsult();
      expect(reply.node.id).toBe('consultar_tema');
      expect(reply.messages).toEqual([{ role: 'ai', text: reply.node.prompt }]);
    });

    it('rejects an option that is not in the current node and text in a menu', () => {
      expect(failure(() => message({ action: 'option', optionId: 'inexistente' })).code).toBe('INVALID_ACTION');
      expect(failure(() => message({ action: 'text', text: 'oi' })).code).toBe('INVALID_ACTION');
    });

    it('goes back only where the node allows it', () => {
      expect(failure(() => message({ action: 'back' })).code).toBe('INVALID_ACTION');
      toConsult();
      expect(message({ action: 'back' }).node.id).toBe('inicio');
    });

    it('restarts: first node again and the byte count back to zero', () => {
      toUpload();
      upload(pdfFile(15 * MB));
      const reply = message({ action: 'restart' });
      expect(reply.node.id).toBe('inicio');
      expect(reply.messages.length).toBe(2);
      toUpload();
      expect(upload(pdfFile(15 * MB)).files[0].accepted).toBeTrue();
    });
  });

  describe('free text', () => {
    beforeEach(() => toConsult());

    it('answers with sources and moves on when the question matches', () => {
      const reply = message({ text: 'Qual o prazo de adequação?' });
      expect(reply.messages[0].status).toBe('answer');
      expect(reply.messages[0].citations!.length).toBeGreaterThan(0);
      expect(reply.node.id).toBe('fim');
      expect(reply.messages[1].text).toBe(reply.node.prompt);
    });

    it('matches keywords ignoring case and accents', () => {
      expect(message({ text: 'VIGENCIA da RESOLUCAO' }).messages[0].status).toBe('answer');
    });

    it('refuses other subjects and stays on the node', () => {
      const reply = message({ text: 'como está o clima hoje' });
      expect(reply.messages[0].status).toBe('out_of_scope');
      expect(reply.node.id).toBe('consultar_tema');
      expect(reply.messages[0].contacts).toBeUndefined();
    });

    it('on the 3rd off-topic try suggests the team and gives the contacts', () => {
      message({ text: 'clima' });
      message({ text: 'futebol' });
      const third = message({ text: 'piada' });
      expect(third.messages[0].status).toBe('out_of_scope');
      expect(third.messages[0].contacts![0].channel).toBe('contato@compliance.com.br');
      expect((third.messages[0] as { contactsRef?: string }).contactsRef).toBeUndefined();
    });

    it('asks for more information, then says it has no data, then hands over the contacts on round 3', () => {
      const first = message({ text: 'oi' });
      expect(first.messages[0].status).toBe('need_more_info');
      expect(first.messages[0].questions!.length).toBeGreaterThan(0);

      const second = message({ text: 'preciso de ajuda com um assunto qualquer' });
      expect(second.messages[0].status).toBe('not_in_data');
      expect(second.messages[0].contacts).toBeUndefined();

      const third = message({ text: 'ainda sem resposta aqui' });
      expect(third.messages[0].contacts![0].channel).toBe('contato@compliance.com.br');
      expect(third.node.id).toBe('consultar_tema');

      // the count restarts after the hand-over
      expect(message({ text: 'oi' }).messages[0].status).toBe('need_more_info');
    });

    it('does not count off-topic tries as clarification rounds', () => {
      message({ text: 'clima' });
      message({ text: 'oi' });
      message({ text: 'oi' });
      expect(message({ text: 'oi' }).messages[0].contacts).toBeDefined();
    });

    it('rejects empty, blank and too long text', () => {
      expect(failure(() => message({ text: '   ' })).code).toBe('INVALID_ACTION');
      expect(failure(() => message({ text: undefined })).code).toBe('INVALID_ACTION');
      expect(failure(() => message({ text: 'x'.repeat(1001) })).code).toBe('INVALID_ACTION');
    });
  });

  describe('feedback', () => {
    it('stores the rating and the source ids, nothing else', () => {
      server.handleFeedback({ sessionId, rating: 'useful', sourceIds: ['mock-0001'] });
      server.handleFeedback({ sessionId, rating: 'not_useful', sourceIds: [] });
      expect(server.feedbackLog).toEqual([
        { sessionId, rating: 'useful', sourceIds: ['mock-0001'] },
        { sessionId, rating: 'not_useful', sourceIds: [] }
      ]);
    });

    it('works after the conversation moved on', () => {
      toConsult();
      message({ text: 'prazo da resolução' }); // goes to the final step
      expect(() => server.handleFeedback({ sessionId, rating: 'useful', sourceIds: [] })).not.toThrow();
    });

    it('rejects an unknown rating or malformed body with 400, and an unknown or ended session with 404', () => {
      expect(failure(() => server.handleFeedback({ sessionId, rating: 'otimo' as never, sourceIds: [] })).code).toBe('INVALID_ACTION');
      expect(failure(() => server.handleFeedback({ sessionId, rating: 'useful', sourceIds: undefined as never })).code).toBe('INVALID_ACTION');
      expect(failure(() => server.handleFeedback({ sessionId: 'x', rating: 'useful', sourceIds: [] })).status).toBe(404);
      server.endSession(sessionId);
      expect(failure(() => server.handleFeedback({ sessionId, rating: 'useful', sourceIds: [] })).code).toBe('SESSION_NOT_FOUND');
      expect(server.feedbackLog.length).toBe(0);
    });
  });

  describe('final step', () => {
    it('asks whether there is anything else and offers "Nova consulta", which goes back to the start', () => {
      toConsult();
      const final = message({ text: 'qual o prazo da resolução' });
      expect(final.node.id).toBe('fim');
      expect(final.node.type).toBe('menu');
      expect(final.node.options!.map(option => option.label)).toEqual(['Nova consulta']);
      const again = message({ action: 'option', optionId: 'nova' });
      expect(again.node.id).toBe('inicio');
      expect(again.messages[0].text).toBe(again.node.prompt);
    });
  });

  describe('menu lists', () => {
    it('offers the five starting options in order', () => {
      expect(server.startSession().node.options!.map(option => option.label)).toEqual([
        'Consultar uma norma',
        'Avaliar um documento',
        'Normas a Classificar',
        'Listar normas não aderentes',
        'Listar próximas normas que irão entrar em vigor'
      ]);
    });

    it('shows each list as a norm block with segments and dates, then "Nova consulta" and "Voltar"', () => {
      ['normas_classificar', 'normas_nao_aderentes', 'normas_proximas_vigencia'].forEach(optionId => {
        const reply = message({ action: 'option', optionId });
        const list = reply.messages[0].normList!;
        expect(reply.node.id).toBe(optionId);
        expect(list.dateLabel).toBeTruthy();
        expect(list.items.length).toBeGreaterThan(1);
        list.items.forEach(item => {
          expect(item.title).toBeTruthy();
          expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(['Atacado', 'Corporativo', 'Plataforma', 'Varejo']).toContain(item.segment!);
        });
        expect(reply.node.canGoBack).toBeTrue();
        expect(reply.node.options!.map(option => option.id)).toEqual(['nova']);
        message({ action: 'back' });
      });
    });
  });

  describe('clarification', () => {
    it('offers ready answers that lead to an answer', () => {
      toConsult();
      const clarify = message({ text: 'norma nova' });
      expect(clarify.messages[0].status).toBe('need_more_info');
      const [first] = clarify.messages[0].quickReplies!;
      expect(message({ text: first }).messages[0].status).toBe('answer');
    });
  });

  describe('questions from other screens (ask)', () => {
    it('answers from any step, moving to the question step without repeating its prompt', () => {
      const reply = message({ action: 'ask', text: 'Qual o prazo da Resolução de exemplo nº 0001?' });
      expect(reply.messages[0].status).toBe('answer');
      expect(reply.node.id).toBe('fim');
    });

    it('stays on the question step when it needs more detail', () => {
      const reply = message({ action: 'ask', text: 'norma nova' });
      expect(reply.node.id).toBe('consultar_tema');
      expect(reply.messages.map(m => m.text)).not.toContain(reply.node.prompt);
    });

    it('rejects an empty question and leaves the session where it was', () => {
      expect(failure(() => message({ action: 'ask', text: '  ' })).code).toBe('INVALID_ACTION');
      expect(toConsult().node.id).toBe('consultar_tema');
    });
  });

  describe('repeated and cancelled requests', () => {
    it('answers a repeated request id with the stored reply instead of acting twice', () => {
      const first = server.handleMessage({ sessionId, nodeId, action: 'option', optionId: 'consultar', requestId: 'same' });
      const again = server.handleMessage({ sessionId, nodeId: 'inicio', action: 'option', optionId: 'consultar', requestId: 'same' });
      expect(again).toEqual(first);
      nodeId = first.node.id;
      expect(message({ action: 'back' }).node.id).toBe('inicio'); // only one step forward was taken
    });

    it('undoes the last request on cancel and reports the step', () => {
      server.handleMessage({ sessionId, nodeId, action: 'option', optionId: 'consultar', requestId: 'r-x' });
      expect(server.cancel({ sessionId, requestId: 'r-x' }).node.id).toBe('inicio');
      // The undone request can be sent again and acts again.
      expect(server.handleMessage({ sessionId, nodeId: 'inicio', action: 'option', optionId: 'consultar', requestId: 'r-x' }).node.id).toBe('consultar_tema');
    });

    it('gives back the bytes of a cancelled upload', () => {
      toUpload();
      server.handleFiles(sessionId, nodeId, [pdfFile(15 * MB)], 'big');
      server.cancel({ sessionId, requestId: 'big' });
      expect(server.handleFiles(sessionId, 'enviar_arquivo', [pdfFile(15 * MB)], rid()).files[0].accepted).toBeTrue();
    });

    it('changes nothing for an unknown or older request, and 404 for an unknown session', () => {
      toConsult();
      expect(server.cancel({ sessionId, requestId: 'nunca' }).node.id).toBe('consultar_tema');
      expect(failure(() => server.cancel({ sessionId: 'x', requestId: 'a' })).code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('documents', () => {
    beforeEach(() => toUpload());

    it('accepts a norm and moves to the question about it', () => {
      const reply = server.handleFiles(sessionId, nodeId, [pdfFile()], rid());
      expect(reply.files[0].accepted).toBeTrue();
      expect(reply.files[0].id).toMatch(/^mock-arquivo-/);
      expect(reply.node.id).toBe('pergunta_sobre_arquivo');
      expect(reply.messages[reply.messages.length - 1].text).toBe(reply.node.prompt);
    });

    it('refuses a document that is not a norm, stays on upload and does not use quota', () => {
      const reply = server.handleFiles(sessionId, nodeId, [pdfFile(10 * MB, 'contrato-recusa.pdf')], rid());
      expect(reply.files[0].accepted).toBeFalse();
      expect(reply.files[0].reason).toBeTruthy();
      expect(reply.node.id).toBe('enviar_arquivo');
      expect(reply.messages[0].status).toBe('out_of_scope');
      expect(server.handleFiles(sessionId, nodeId, [pdfFile(20 * MB)], rid()).files[0].accepted).toBeTrue();
    });

    it('rejects types, empty files and sizes with the BFF status codes', () => {
      const wrongType = failure(() => server.handleFiles(sessionId, nodeId, [{ name: 'a.exe', size: 5, type: '' }], rid()));
      expect([wrongType.code, wrongType.status]).toEqual(['FILE_TYPE_NOT_ALLOWED', 415]);
      const tooLarge = failure(() => server.handleFiles(sessionId, nodeId, [pdfFile(20 * MB + 1)], rid()));
      expect([tooLarge.code, tooLarge.status]).toEqual(['FILE_TOO_LARGE', 413]);
      expect(failure(() => server.handleFiles(sessionId, nodeId, [pdfFile(0)], rid())).code).toBe('INVALID_ACTION');
    });

    it('stops at 20 MB for the whole conversation', () => {
      upload(pdfFile(15 * MB));
      message({ action: 'back' }); // pergunta_sobre_arquivo -> enviar_arquivo
      const error = failure(() => server.handleFiles(sessionId, nodeId, [pdfFile(6 * MB)], rid()));
      expect([error.code, error.status]).toEqual(['SESSION_QUOTA_EXCEEDED', 413]);
      expect(server.handleFiles(sessionId, nodeId, [pdfFile(5 * MB)], rid()).files[0].accepted).toBeTrue();
    });

    it('evaluates several documents (PDF and Word) in one request, one result each, with the summary', () => {
      const docx = { name: 'circular.docx', size: 1000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      const reply = server.handleFiles(sessionId, nodeId, [pdfFile(), docx, pdfFile(10, 'contrato-recusa.pdf')], rid());
      expect(reply.files.map(file => file.accepted)).toEqual([true, true, false]);
      expect(reply.files[0].metadata!.normIdentifier).not.toBe(reply.files[1].metadata!.normIdentifier);
      expect(reply.messages[0].text).toContain('3 documentos');
      expect(reply.messages[0].text).toContain('2 parecem normas');
      expect(reply.node.id).toBe('pergunta_sobre_arquivo');
    });

    it('stays on upload when none is accepted, and refuses the whole request on a technical problem', () => {
      const none = server.handleFiles(sessionId, nodeId, [pdfFile(10, 'a-recusa.pdf'), pdfFile(10, 'b-recusa.pdf')], rid());
      expect(none.node.id).toBe('enviar_arquivo');
      expect(none.files.every(file => !file.accepted)).toBeTrue();
      expect(failure(() => server.handleFiles(sessionId, nodeId, [pdfFile(), { name: 'x.exe', size: 5, type: '' }], rid())).code).toBe('FILE_TYPE_NOT_ALLOWED');
      expect(failure(() => server.handleFiles(sessionId, nodeId, [pdfFile(15 * MB), pdfFile(6 * MB)], rid())).code).toBe('SESSION_QUOTA_EXCEEDED');
      expect(server.handleFiles(sessionId, nodeId, [pdfFile(20 * MB)], rid()).files[0].accepted).toBeTrue(); // nothing was kept
    });

    describe('quarantine (fake antivirus by file name)', () => {
      it('bars a document by keyword with each reason, stays on upload, explains and does not use quota', () => {
        const cases: [string, string][] = [
          ['norma-virus.pdf', 'FILE_REJECTED_UNSAFE'],
          ['norma-protegido-por-senha.pdf', 'FILE_CHECK_FAILED'],
          ['norma-com-macro.docx', 'FILE_CONTENT_NOT_SUPPORTED']
        ];
        for (const [name, code] of cases) {
          const reply = server.handleFiles(sessionId, nodeId, [pdfFile(5 * MB, name)], rid());
          expect([reply.files[0].accepted, reply.files[0].quarantine]).withContext(name).toEqual([false, code as 'FILE_CHECK_FAILED']);
          expect(reply.files[0].reason).toBe(CHAT_ERROR_TEXTS[code as 'FILE_CHECK_FAILED']);
          expect(reply.node.id).toBe('enviar_arquivo');
          expect(reply.messages[0].text).toContain('Não consegui avaliar o documento');
        }
        expect(server.handleFiles(sessionId, nodeId, [pdfFile(20 * MB)], rid()).files[0].accepted).toBeTrue(); // quota untouched
      });

      it('evaluates the clean documents of the same send and counts the barred one as refused in the summary', () => {
        const reply = server.handleFiles(sessionId, nodeId, [pdfFile(), pdfFile(10, 'anexo-virus.pdf')], rid());
        expect(reply.files.map(file => [file.accepted, file.quarantine])).toEqual([[true, undefined], [false, 'FILE_REJECTED_UNSAFE']]);
        expect(reply.messages[0].text).toContain('1 não foram aceitos');
        expect(reply.node.id).toBe('pergunta_sobre_arquivo');
      });
    });

    it('accepts up to 5 documents per request', () => {
      const six = Array.from({ length: 6 }, (_, i) => pdfFile(10, `n${i}.pdf`));
      expect(failure(() => server.handleFiles(sessionId, nodeId, six, rid())).code).toBe('INVALID_ACTION');
      expect(failure(() => server.handleFiles(sessionId, nodeId, [], rid())).code).toBe('INVALID_ACTION');
    });

    it('rejects a document outside an upload node', () => {
      message({ action: 'back' });
      expect(failure(() => server.handleFiles(sessionId, nodeId, [pdfFile()], rid())).code).toBe('INVALID_ACTION');
    });
  });
});
