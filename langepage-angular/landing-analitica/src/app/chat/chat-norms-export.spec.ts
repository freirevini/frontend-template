import { formatNormDate, normListTitle, normListXlsxTable } from './chat-norms-export';
import { ChatMessage } from './chat.model';

const message: ChatMessage = {
  id: 'm1',
  role: 'ai',
  createdAt: new Date(2026, 9, 28),
  text: '**Próximas normas** a entrar em vigor:',
  normList: {
    dateLabel: 'Vigência',
    items: [
      { id: 'a', title: 'Resolução A', detail: 'Altera prazos', segment: 'Varejo', date: '2027-03-01' },
      { id: 'b', title: 'Circular B', segment: 'Atacado' }
    ]
  }
};

describe('chat norm list export', () => {
  it('formats ISO dates as dd/mm/aaaa without shifting the day', () => {
    expect(formatNormDate('2027-03-01')).toBe('01/03/2027');
    expect(formatNormDate(undefined)).toBe('');
    expect(formatNormDate('não é data')).toBe('');
  });

  it('takes the title from the first line, without markdown or the trailing colon', () => {
    expect(normListTitle(message)).toBe('Próximas normas a entrar em vigor');
    expect(normListTitle({ text: '' })).toBe('Normas');
  });

  it('builds the sheet with the table columns, the rows on screen and the filter in the subtitle and file name', () => {
    const table = normListXlsxTable(message, [message.normList!.items[0]], 'Varejo', new Date(2026, 9, 28, 23, 30));
    expect(table.sheetName).toBe('Normas');
    expect(table.title).toBe('Próximas normas a entrar em vigor');
    expect(table.columns.map(column => column.header)).toEqual(['Norma', 'Observação', 'Segmento', 'Vigência']);
    expect(table.rows).toEqual([{ title: 'Resolução A', detail: 'Altera prazos', segment: 'Varejo', date: '01/03/2027' }]);
    expect(table.subtitle).toBe('Segmento: Varejo · 1 norma · gerado pelo Agente da Agenda em 28/10/2026');
    expect(table.fileName).toBe('agente-da-agenda-proximas-normas-a-entrar-em-vigor-varejo-2026-10-28.xlsx');
  });

  it('names every segment and fills missing values with blanks', () => {
    const table = normListXlsxTable({ ...message, normList: { items: message.normList!.items } }, message.normList!.items, undefined, new Date(2026, 0, 5));
    expect(table.columns[3].header).toBe('Data');
    expect(table.rows[1]).toEqual({ title: 'Circular B', detail: '', segment: 'Atacado', date: '' });
    expect(table.subtitle).toContain('Todos os segmentos · 2 normas');
    expect(table.fileName).toBe('agente-da-agenda-proximas-normas-a-entrar-em-vigor-2026-01-05.xlsx');
  });
});
