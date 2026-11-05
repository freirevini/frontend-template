import { formatFileSize, isEmail } from './chat-format';

describe('chat format', () => {
  it('formats file sizes in pt-BR', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1,5 KB');
    expect(formatFileSize(20 * 1024 * 1024)).toBe('20 MB');
    expect(formatFileSize(-5)).toBe('0 B');
  });

  it('recognizes e-mail channels only', () => {
    expect(isEmail('contato@compliance.com.br')).toBe(true);
    expect(isEmail('ramal 1234')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('"x"@evil.com')).toBe(false);
  });
});
