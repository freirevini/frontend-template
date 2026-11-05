import { fileProblemText, namePastedFile, sendLimitOf, validateChatFile, validateChatFiles } from './chat-file';
import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from './chat-texts';
import { CHAT_LIMITS, ChatUploadConfig } from './chat.model';

const MB = 1024 * 1024;
const upload: ChatUploadConfig = { accept: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'], maxBytes: CHAT_LIMITS.maxSessionBytes, maxFiles: 1 };
const file = (name: string, size: number, type = '') => ({ name, size, type });

describe('validateChatFile', () => {
  it('accepts a PDF and the allowed images', () => {
    expect(validateChatFile(file('norma.pdf', MB, 'application/pdf'), upload, 0)).toBeNull();
    expect(validateChatFile(file('print.PNG', MB, 'image/png'), upload, 0)).toBeNull();
    expect(validateChatFile(file('foto.jpeg', MB, 'image/jpeg'), upload, 0)).toBeNull();
    expect(validateChatFile(file('foto.webp', MB, 'image/webp'), upload, 0)).toBeNull();
  });

  it('accepts a file whose browser type is empty when the extension is allowed', () => {
    expect(validateChatFile(file('norma.pdf', MB), upload, 0)).toBeNull();
  });

  it('rejects other extensions, no extension and a double extension', () => {
    expect(validateChatFile(file('programa.exe', MB), upload, 0)).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(validateChatFile(file('norma', MB), upload, 0)).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(validateChatFile(file('norma.pdf.exe', MB), upload, 0)).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(validateChatFile(file('.pdf.', MB), upload, 0)).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('rejects an allowed extension with a different reported type', () => {
    expect(validateChatFile(file('norma.pdf', MB, 'application/x-msdownload'), upload, 0)).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('rejects an empty file', () => {
    expect(validateChatFile(file('norma.pdf', 0), upload, 0)).toBe('FILE_EMPTY');
  });

  it('rejects a file above the node limit', () => {
    const small: ChatUploadConfig = { ...upload, maxBytes: 5 * MB };
    expect(validateChatFile(file('norma.pdf', 5 * MB), small, 0)).toBeNull();
    expect(validateChatFile(file('norma.pdf', 5 * MB + 1), small, 0)).toBe('FILE_TOO_LARGE');
  });

  it('rejects a file that makes the session pass 20 MB', () => {
    expect(validateChatFile(file('norma.pdf', 5 * MB), upload, 15 * MB)).toBeNull();
    expect(validateChatFile(file('norma.pdf', 5 * MB + 1), upload, 15 * MB)).toBe('SESSION_QUOTA_EXCEEDED');
  });

  it('maps every problem to a pt-BR text', () => {
    expect(fileProblemText('FILE_EMPTY')).toBe(CHAT_TEXTS.fileEmpty);
    expect(fileProblemText('FILE_TOO_LARGE')).toBe(CHAT_ERROR_TEXTS.FILE_TOO_LARGE);
    expect(fileProblemText('SESSION_QUOTA_EXCEEDED')).toBe(CHAT_ERROR_TEXTS.SESSION_QUOTA_EXCEEDED);
  });
});

describe('validateChatFiles', () => {
  const upload: ChatUploadConfig = { accept: ['.pdf', '.docx', '.doc', '.png'], maxBytes: 20 * 1024 * 1024, maxFiles: 2 };
  const file = (name: string, size = 10, type = '') => new File([new Uint8Array(size)], name, { type });

  it('accepts PDF and Word, sums the quota over the batch and stops at maxFiles', () => {
    const check = validateChatFiles([file('a.pdf', 10, 'application/pdf'), file('b.docx'), file('c.doc')], upload, 0);
    expect(check.valid.map(f => f.name)).toEqual(['a.pdf', 'b.docx']);
    expect(check.problems).toEqual([{ name: 'c.doc', problem: 'TOO_MANY_FILES' }]);
    expect(fileProblemText('TOO_MANY_FILES')).toBe(CHAT_TEXTS.fileTooMany);

    const quota = validateChatFiles([file('a.pdf', 15), file('b.pdf', 10)], upload, CHAT_LIMITS.maxSessionBytes - 20);
    expect(quota.valid.map(f => f.name)).toEqual(['a.pdf']);
    expect(quota.problems[0].problem).toBe('SESSION_QUOTA_EXCEEDED');
  });

  it('sums at most 9 MB per send: a document that passes the sum stays out, smaller ones after it may still go', () => {
    const five = { ...upload, maxFiles: 5 };
    const check = validateChatFiles([file('a.pdf', 5 * MB), file('b.pdf', 4 * MB), file('c.pdf', 1), file('d.pdf', 1)], five, 0);
    expect(check.valid.map(f => f.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(check.problems).toEqual([{ name: 'c.pdf', problem: 'SEND_TOO_LARGE' }, { name: 'd.pdf', problem: 'SEND_TOO_LARGE' }]);
    expect(fileProblemText('SEND_TOO_LARGE')).toBe(CHAT_ERROR_TEXTS.SEND_TOO_LARGE);

    const later = validateChatFiles([file('a.pdf', 5 * MB), file('grande.pdf', 6 * MB), file('c.pdf', 10)], five, 0);
    expect(later.valid.map(f => f.name)).toEqual(['a.pdf', 'c.pdf']);
    expect(later.problems).toEqual([{ name: 'grande.pdf', problem: 'SEND_TOO_LARGE' }]);
  });

  it('refuses a single document above 9 MB as too large, even when the step allows 20 MB per file', () => {
    expect(validateChatFiles([file('a.pdf', 9 * MB)], upload, 0).valid.length).toBe(1);
    expect(validateChatFiles([file('a.pdf', 9 * MB + 1)], upload, 0).problems).toEqual([{ name: 'a.pdf', problem: 'FILE_TOO_LARGE' }]);
  });

  it('follows a lower per-send limit of the step, never a higher one', () => {
    expect(sendLimitOf({ ...upload, maxSendBytes: 2 * MB })).toBe(2 * MB);
    expect(sendLimitOf({ ...upload, maxSendBytes: 50 * MB })).toBe(CHAT_LIMITS.maxSendBytes);
    expect(sendLimitOf(upload)).toBe(CHAT_LIMITS.maxSendBytes);
    const small = validateChatFiles([file('a.pdf', MB), file('b.pdf', MB + 1)], { ...upload, maxSendBytes: 2 * MB }, 0);
    expect(small.problems).toEqual([{ name: 'b.pdf', problem: 'SEND_TOO_LARGE' }]);
  });

  it('never sends more than CHAT_LIMITS.maxFilesPerSend', () => {
    const many = Array.from({ length: 7 }, (_, i) => file(`n${i}.pdf`));
    expect(validateChatFiles(many, { ...upload, maxFiles: 10 }, 0).valid.length).toBe(CHAT_LIMITS.maxFilesPerSend);
  });
});

describe('namePastedFile', () => {
  const at = new Date(2026, 9, 28, 14, 5, 3);

  it('renames a clipboard image with the time and keeps its type', () => {
    const renamed = namePastedFile(new File(['x'], 'image.png', { type: 'image/png' }), at);
    expect(renamed.name).toBe('imagem-colada-14h05m03s.png');
    expect(renamed.type).toBe('image/png');
    expect(namePastedFile(new File(['x'], 'image.jpeg', { type: 'image/jpeg' }), at).name).toBe('imagem-colada-14h05m03s.jpg');
  });

  it('keeps the name of files copied in the Explorer', () => {
    const own = new File(['x'], 'print da norma.png', { type: 'image/png' });
    expect(namePastedFile(own, at)).toBe(own);
    const doc = new File(['x'], 'resolucao.pdf', { type: 'application/pdf' });
    expect(namePastedFile(doc, at)).toBe(doc);
  });
});
