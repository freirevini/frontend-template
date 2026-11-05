import { fileKindLabel, fileResultCells, fileResultsXlsxTable, withFileResults } from './chat-file-results';
import { CHAT_TEXTS } from './chat-texts';
import { ChatFileReply, ChatFileResultRow } from './chat.model';

const reply: ChatFileReply = {
  node: { id: 'u', type: 'upload', prompt: 'Envie.', canGoBack: true },
  messages: [{ role: 'ai', text: 'Analisando…', transient: true }, { role: 'ai', text: 'Avaliei.' }],
  files: [
    { id: 'a', accepted: true, metadata: { normIdentifier: 'Resolução 1', issuer: 'desconhecido', documentKind: 'trecho_norma' } },
    { id: 'b', accepted: false, reason: 'Não é norma.' }
  ]
};
const files = [{ name: 'a.pdf', size: 2048 }, { name: 'b.docx', size: 10 }];

describe('chat file results', () => {
  it('adds the table to the first lasting agent message only when there is more than one document', () => {
    const several = withFileResults(reply, files);
    expect(several.messages[0].fileResults).toBeUndefined();
    expect(several.messages[1].fileResults!.map(row => [row.name, row.result.id])).toEqual([['a.pdf', 'a'], ['b.docx', 'b']]);
    expect(withFileResults(reply, [files[0]])).toBe(reply);
  });

  it('creates a message for the table when the reply has none', () => {
    const bare = withFileResults({ ...reply, messages: [] }, files);
    expect(bare.messages[0].text).toBe(CHAT_TEXTS.fileResultsTitle);
    expect(bare.messages[0].fileResults!.length).toBe(2);
  });

  it('describes each document in pt-BR, hiding an unknown issuer', () => {
    const rows = withFileResults(reply, files).messages[1].fileResults as ChatFileResultRow[];
    expect(fileResultCells(rows[0])).toEqual({
      name: 'a.pdf', size: '2 KB', result: CHAT_TEXTS.fileAccepted, norm: 'Resolução 1', issuer: '', kind: 'Trecho de norma', note: ''
    });
    expect(fileResultCells(rows[1]).note).toBe('Não é norma.');
    expect(fileKindLabel('outro')).toBe('outro');
  });

  it('builds the spreadsheet with every document', () => {
    const rows = withFileResults(reply, files).messages[1].fileResults as ChatFileResultRow[];
    const table = fileResultsXlsxTable(rows, new Date(2026, 9, 28));
    expect(table.columns.map(column => column.header)).toEqual(['Arquivo', 'Tamanho', 'Resultado', 'Norma identificada', 'Emissor', 'Tipo de documento', 'Observação']);
    expect(table.rows.length).toBe(2);
    expect(table.subtitle).toBe('2 documentos · 1 aceito · gerado pelo Agente da Agenda em 28/10/2026');
    expect(table.fileName).toBe('agente-da-agenda-avaliacao-documentos-2026-10-28.xlsx');
  });

  it('labels a document barred in quarantine "Recusado na verificação de segurança", with the reason as the note', () => {
    const cells = fileResultCells({ name: 'v.pdf', sizeBytes: 10, result: { id: 'v', accepted: false, quarantine: 'FILE_CHECK_FAILED', reason: 'Motivo.' } });
    expect([cells.result, cells.note]).toEqual([CHAT_TEXTS.fileQuarantined, 'Motivo.']);
    expect(fileResultCells({ name: 'r.pdf', sizeBytes: 10, result: { id: 'r', accepted: false } }).result).toBe(CHAT_TEXTS.fileRejected);
  });
});
