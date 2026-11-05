import { XlsxTable } from '../core/export/xlsx-export';
import { formatFileSize } from './chat-format';
import { formatNormDate } from './chat-norms-export';
import { CHAT_TEXTS } from './chat-texts';
import { ChatFileReply, ChatFileResultRow } from './chat.model';

/**
 * With more than one document, puts the results table (`fileResults`, one row per document in the order sent) on the
 * first agent message of the reply, or on a message of its own if the reply has none. One document: unchanged.
 */
export function withFileResults(reply: ChatFileReply, files: Pick<File, 'name' | 'size'>[]): ChatFileReply {
  if (files.length < 2) {
    return reply;
  }
  const rows: ChatFileResultRow[] = files.map((file, i) => ({
    name: file.name,
    sizeBytes: file.size,
    result: reply.files[i] ?? { id: '', accepted: false }
  }));
  const index = reply.messages.findIndex(message => message.role === 'ai' && !message.transient);
  const messages =
    index < 0
      ? [{ role: 'ai' as const, text: CHAT_TEXTS.fileResultsTitle, fileResults: rows }, ...reply.messages]
      : reply.messages.map((message, i) => (i === index ? { ...message, fileResults: rows } : message));
  return { ...reply, messages };
}

/** "Norma completa" for the known kinds; other values as they come. */
export function fileKindLabel(kind: string | undefined): string {
  return kind ? CHAT_TEXTS.fileKinds[kind] ?? kind : '';
}

/** Text of each column, the same on screen and in the spreadsheet. */
export function fileResultCells(row: ChatFileResultRow): Record<'name' | 'size' | 'result' | 'norm' | 'issuer' | 'kind' | 'note', string> {
  const { result } = row;
  return {
    name: row.name,
    size: formatFileSize(row.sizeBytes),
    result: result.accepted ? CHAT_TEXTS.fileAccepted : result.quarantine ? CHAT_TEXTS.fileQuarantined : CHAT_TEXTS.fileRejected,
    norm: result.metadata?.normIdentifier ?? '',
    issuer: result.metadata?.issuer && result.metadata.issuer !== 'desconhecido' ? result.metadata.issuer : '',
    kind: fileKindLabel(result.metadata?.documentKind),
    note: result.accepted ? '' : result.reason ?? ''
  };
}

/**
 * Spreadsheet of the evaluation: one row per document (Arquivo, Tamanho, Resultado, Norma identificada, Emissor, Tipo
 * de documento, Observação). File: `agente-da-agenda-avaliacao-documentos-<aaaa-mm-dd>.xlsx`.
 */
export function fileResultsXlsxTable(rows: ChatFileResultRow[], today: Date): XlsxTable {
  const accepted = rows.filter(row => row.result.accepted).length;
  const day = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(part => String(part).padStart(2, '0')).join('-');
  return {
    sheetName: CHAT_TEXTS.fileResultsSheet,
    title: CHAT_TEXTS.fileResultsTitle,
    subtitle: `${rows.length} documentos · ${accepted} ${accepted === 1 ? 'aceito' : 'aceitos'} · gerado pelo Agente da Agenda em ${formatNormDate(day)}`,
    columns: [
      { key: 'name', header: CHAT_TEXTS.fileColumnName, width: 34 },
      { key: 'size', header: 'Tamanho', width: 10 },
      { key: 'result', header: CHAT_TEXTS.fileColumnResult, width: 18 },
      { key: 'norm', header: CHAT_TEXTS.fileColumnNorm, width: 32 },
      { key: 'issuer', header: CHAT_TEXTS.fileColumnIssuer, width: 14 },
      { key: 'kind', header: CHAT_TEXTS.fileColumnKind, width: 18 },
      { key: 'note', header: CHAT_TEXTS.fileColumnNote, width: 44 }
    ],
    rows: rows.map(fileResultCells),
    fileName: `agente-da-agenda-avaliacao-documentos-${day}.xlsx`
  };
}
