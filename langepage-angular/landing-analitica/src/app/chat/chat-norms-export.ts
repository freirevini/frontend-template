import { XlsxTable } from '../core/export/xlsx-export';
import { CHAT_TEXTS } from './chat-texts';
import { ChatMessage, ChatNormItem } from './chat.model';

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

/** ISO `yyyy-mm-dd` as `dd/mm/aaaa` (read as UTC so the day never shifts with the time zone). */
export function formatNormDate(iso: string | undefined): string {
  const date = iso ? new Date(`${iso}T00:00:00Z`) : null;
  return date && !Number.isNaN(date.getTime()) ? DATE_FORMAT.format(date) : '';
}

/** Title of a list: the agent's text without markdown marks and the trailing colon ("Normas a classificar (…)"). */
export function normListTitle(message: Pick<ChatMessage, 'text'>): string {
  const text = (message.text ?? '').split('\n')[0].replace(/[*_`#>]/g, '').trim().replace(/:$/, '');
  return text || CHAT_TEXTS.normsSheet;
}

/** "Normas a classificar" → "normas-a-classificar" (file names). */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}

/**
 * Spreadsheet of the norms on screen (segment filter applied), same columns as the table view: Norma, Observação,
 * Segmento and the list's date. File: `agente-da-agenda-<lista>[-<segmento>]-<data>.xlsx`.
 */
export function normListXlsxTable(message: ChatMessage, items: ChatNormItem[], segment: string | undefined, today: Date): XlsxTable {
  const title = normListTitle(message);
  const dateLabel = message.normList?.dateLabel || CHAT_TEXTS.normsDate;
  const count = `${items.length} ${items.length === 1 ? 'norma' : 'normas'}`;
  const day = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(part => String(part).padStart(2, '0')).join('-');
  return {
    sheetName: CHAT_TEXTS.normsSheet,
    title,
    subtitle: `${segment ? `Segmento: ${segment}` : 'Todos os segmentos'} · ${count} · gerado pelo Agente da Agenda em ${formatNormDate(day)}`,
    columns: [
      { key: 'title', header: CHAT_TEXTS.normsColumnTitle, width: 36 },
      { key: 'detail', header: CHAT_TEXTS.normsColumnDetail, width: 36 },
      { key: 'segment', header: CHAT_TEXTS.normsColumnSegment, width: 14 },
      { key: 'date', header: dateLabel, width: 16 }
    ],
    rows: items.map(item => ({
      title: item.title,
      detail: item.detail ?? '',
      segment: item.segment ?? '',
      date: formatNormDate(item.date)
    })),
    fileName: `agente-da-agenda-${slug(title)}${segment ? `-${slug(segment)}` : ''}-${day}.xlsx`
  };
}
