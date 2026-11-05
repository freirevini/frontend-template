import { CHAT_ERROR_TEXTS } from './chat-texts';
import {
  ArquivoAgenteV1,
  ChatContractError,
  acceptedFilesFromV1,
  cancelReplyFromV1,
  cancelToV1,
  feedbackToV1,
  fileFromV1,
  fileReplyFromV1,
  fileResultFromV1,
  messageFromV1,
  messageRequestToV1,
  nodeFromV1,
  replyFromV1,
  sessionFromV1
} from './chat-v1-adapters';

// Payloads use the field names of the OpenAPI (docs/contratos/openapi-agenda-normativa-v1.yaml, tag "Agente").
const ENVIO = {
  id: 'enviar_arquivo',
  tipo: 'ENVIO_ARQUIVO',
  enunciado: 'Envie os documentos.',
  envio: { extensoes: ['.PDF', '.docx'], maxBytesPorArquivo: 9437184, maxBytesPorEnvio: 9437184, maxArquivos: 5 },
  podeVoltar: true
};
const TEXTO = { id: 'consultar_tema', tipo: 'TEXTO_LIVRE', enunciado: 'Descreva.', entrada: { habilitada: true, dica: 'Pergunte aqui', maxCaracteres: 1000 }, podeVoltar: true };
const MENU = { id: 'inicio', tipo: 'MENU', enunciado: 'O que você precisa?', opcoes: [{ id: 'consultar', rotulo: 'Consultar uma norma' }], podeVoltar: false };

describe('chat v1 adapters', () => {
  describe('PassoAgente → ChatNode', () => {
    it('maps every step type and field', () => {
      expect(nodeFromV1(MENU)).toEqual({
        id: 'inicio',
        type: 'menu',
        prompt: 'O que você precisa?',
        options: [{ id: 'consultar', label: 'Consultar uma norma' }],
        canGoBack: false
      });
      expect(nodeFromV1(TEXTO)).toEqual({
        id: 'consultar_tema',
        type: 'free_text',
        prompt: 'Descreva.',
        input: { enabled: true, placeholder: 'Pergunte aqui', maxChars: 1000 },
        canGoBack: true
      });
      expect(nodeFromV1(ENVIO).upload).toEqual({ accept: ['.pdf', '.docx'], maxBytes: 9437184, maxFiles: 5, maxSendBytes: 9437184 });
      expect(nodeFromV1({ id: 'fim', tipo: 'FIM', enunciado: 'Até logo.', podeVoltar: false }).type).toBe('end');
    });

    it('throws on a step type outside the domain or a missing id, without echoing the value', () => {
      expect(() => nodeFromV1({ ...MENU, tipo: 'CARROSSEL' })).toThrowMatching(e => e instanceof ChatContractError && !e.message.includes('CARROSSEL'));
      expect(() => nodeFromV1({ ...MENU, id: '' })).toThrowError(ChatContractError);
      expect(() => nodeFromV1(null)).toThrowError(ChatContractError);
    });
  });

  describe('MensagemAgente → ChatApiMessage', () => {
    it('maps role, status and every block', () => {
      expect(
        messageFromV1({
          papel: 'AGENTE',
          texto: 'O prazo é **90 dias**.',
          situacao: 'RESPOSTA',
          citacoes: [{ fonteId: 'res-1', trecho: 'prazo de 90 dias' }],
          perguntas: ['Qual segmento?'],
          contatos: [{ nome: 'Equipe', area: 'Compliance', canal: 'contato@compliance.com.br' }],
          respostasRapidas: ['Varejo'],
          listaNormas: { rotuloData: 'Vigência', itens: [{ id: 'n1', titulo: 'Resolução 1', detalhe: 'nota', segmento: 'Varejo', data: '2026-01-31' }] },
          transitoria: true
        })
      ).toEqual({
        role: 'ai',
        text: 'O prazo é **90 dias**.',
        status: 'answer',
        citations: [{ sourceId: 'res-1', excerpt: 'prazo de 90 dias' }],
        questions: ['Qual segmento?'],
        contacts: [{ name: 'Equipe', area: 'Compliance', channel: 'contato@compliance.com.br' }],
        quickReplies: ['Varejo'],
        normList: { dateLabel: 'Vigência', items: [{ id: 'n1', title: 'Resolução 1', detail: 'nota', segment: 'Varejo', date: '2026-01-31' }] },
        transient: true
      });
    });

    it('maps the other roles and statuses and leaves absent fields absent', () => {
      expect(messageFromV1({ papel: 'USUARIO', texto: 'oi' })).toEqual({ role: 'user', text: 'oi' });
      expect(messageFromV1({ papel: 'SISTEMA' })).toEqual({ role: 'system' });
      const status = (situacao: string) => messageFromV1({ papel: 'AGENTE', situacao }).status;
      expect(['PRECISA_MAIS_INFORMACAO', 'FORA_DOS_DADOS', 'FORA_DO_ESCOPO'].map(status)).toEqual(['need_more_info', 'not_in_data', 'out_of_scope']);
    });

    it('throws on a role or status outside the domain (never "error", which only the front produces)', () => {
      expect(() => messageFromV1({ papel: 'ROBO' })).toThrowError(ChatContractError);
      expect(() => messageFromV1({ papel: 'AGENTE', situacao: 'ERRO' })).toThrowError(ChatContractError);
      expect(() => messageFromV1({ papel: 'AGENTE', situacao: 'error' })).toThrowError(ChatContractError);
    });
  });

  describe('replies', () => {
    it('reads SessaoAgente and RespostaAgente', () => {
      const mensagens = [{ papel: 'AGENTE', texto: 'Bem-vindo.' }];
      expect(sessionFromV1({ sessaoId: 'uuid-1', passo: MENU, mensagens })).toEqual({
        sessionId: 'uuid-1',
        node: nodeFromV1(MENU),
        messages: [{ role: 'ai', text: 'Bem-vindo.' }]
      });
      expect(replyFromV1({ passo: TEXTO, mensagens: [] })).toEqual({ node: nodeFromV1(TEXTO), messages: [] });
      expect(cancelReplyFromV1({ passo: MENU })).toEqual({ node: nodeFromV1(MENU) });
    });

    it('throws without a session id or a message list', () => {
      expect(() => sessionFromV1({ passo: MENU, mensagens: [] })).toThrowError(ChatContractError);
      expect(() => replyFromV1({ passo: MENU })).toThrowError(ChatContractError);
    });
  });

  describe('requests', () => {
    it('writes PedidoMensagem with every action, without the session id (it goes in the path)', () => {
      const base = { sessionId: 's1', nodeId: 'inicio', requestId: 'r1' };
      expect(messageRequestToV1({ ...base, action: 'option', optionId: 'consultar' })).toEqual({ passoId: 'inicio', acao: 'OPCAO', opcaoId: 'consultar', requisicaoId: 'r1' });
      expect(messageRequestToV1({ ...base, action: 'text', text: 'prazo' })).toEqual({ passoId: 'inicio', acao: 'TEXTO', texto: 'prazo', requisicaoId: 'r1' });
      expect((['back', 'restart', 'ask'] as const).map(action => messageRequestToV1({ ...base, action }).acao)).toEqual(['VOLTAR', 'RECOMECAR', 'PERGUNTAR']);
    });

    it('writes PedidoAvaliacao and PedidoCancelamento', () => {
      expect(feedbackToV1({ sessionId: 's1', rating: 'useful', sourceIds: ['a'] })).toEqual({ nota: 'UTIL', fonteIds: ['a'] });
      expect(feedbackToV1({ sessionId: 's1', rating: 'not_useful', sourceIds: [] })).toEqual({ nota: 'NAO_UTIL', fonteIds: [] });
      expect(cancelToV1({ sessionId: 's1', requestId: 'r1' })).toEqual({ requisicaoId: 'r1' });
    });
  });

  describe('documents', () => {
    const arquivo = (status: string, extra: object = {}) =>
      ({ arquivoId: 'f1', nome: 'a.pdf', tamanhoBytes: 10, status, ...extra }) as unknown as ArquivoAgenteV1;

    it('reads the 202 (one file per document, in order) and checks id and status', () => {
      const files = acceptedFilesFromV1({ requisicaoId: 'r1', arquivos: [arquivo('EM_VERIFICACAO'), { ...arquivo('EM_VERIFICACAO'), arquivoId: 'f2' }] }, 2);
      expect(files.map(file => file.arquivoId)).toEqual(['f1', 'f2']);
      expect(() => acceptedFilesFromV1({ arquivos: [arquivo('EM_VERIFICACAO')] }, 2)).toThrowError(ChatContractError);
      expect(() => fileFromV1(arquivo('PERDIDO'))).toThrowError(ChatContractError);
      expect(() => fileFromV1({ status: 'APROVADO' })).toThrowError(ChatContractError);
    });

    it('turns an approved document into the evaluation verdict', () => {
      const accepted = arquivo('APROVADO', { avaliacao: { aceito: true, metadados: { tipoDocumento: 'norma_integral', emissor: 'CMN', identificacaoNorma: 'Resolução CMN 4.855' } } });
      expect(fileResultFromV1(accepted)).toEqual({
        id: 'f1',
        accepted: true,
        metadata: { documentKind: 'norma_integral', issuer: 'CMN', normIdentifier: 'Resolução CMN 4.855' }
      });
      expect(fileResultFromV1(arquivo('APROVADO', { avaliacao: { aceito: false, motivo: 'Não é norma.' } }))).toEqual({ id: 'f1', accepted: false, reason: 'Não é norma.' });
    });

    it('turns each quarantine refusal into a refused result with the front\'s pt-BR text', () => {
      const cases: [string | undefined, string][] = [
        ['AMEACA_DETECTADA', 'FILE_REJECTED_UNSAFE'],
        ['VERIFICACAO_FALHOU', 'FILE_CHECK_FAILED'],
        ['CONTEUDO_NAO_SUPORTADO', 'FILE_CONTENT_NOT_SUPPORTED'],
        [undefined, 'FILE_CHECK_FAILED']
      ];
      for (const [motivoRejeicao, code] of cases) {
        expect(fileResultFromV1(arquivo('REJEITADO', { motivoRejeicao })))
          .withContext(String(motivoRejeicao))
          .toEqual({ id: 'f1', accepted: false, quarantine: code as 'FILE_CHECK_FAILED', reason: CHAT_ERROR_TEXTS[code as 'FILE_CHECK_FAILED'] });
      }
      expect(() => fileResultFromV1(arquivo('REJEITADO', { motivoRejeicao: 'OUTRO' }))).toThrowError(ChatContractError);
    });

    it('builds the reply of the send from the files and the resposta', () => {
      const files = [fileFromV1(arquivo('APROVADO', { avaliacao: { aceito: true } }))];
      expect(fileReplyFromV1(files, { passo: TEXTO, mensagens: [{ papel: 'AGENTE', texto: 'Recebi.' }] })).toEqual({
        node: nodeFromV1(TEXTO),
        messages: [{ role: 'ai', text: 'Recebi.' }],
        files: [{ id: 'f1', accepted: true }]
      });
    });
  });
});
