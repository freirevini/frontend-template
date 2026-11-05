import { safeMarkdown } from './safe-markdown';

describe('safeMarkdown', () => {
  it('returns an empty string for empty input', () => {
    expect(safeMarkdown('')).toBe('');
    expect(safeMarkdown(null)).toBe('');
    expect(safeMarkdown(undefined)).toBe('');
  });

  it('wraps text in paragraphs and keeps single line breaks', () => {
    expect(safeMarkdown('linha 1\nlinha 2\n\nsegundo')).toBe('<p>linha 1<br>linha 2</p><p>segundo</p>');
  });

  it('formats bold, italic and inline code', () => {
    expect(safeMarkdown('**forte** e *ênfase* e `x`')).toBe('<p><strong>forte</strong> e <em>ênfase</em> e <code>x</code></p>');
  });

  it('does not format markdown inside code spans', () => {
    expect(safeMarkdown('`**não** [a](https://x.com)`')).toBe('<p><code>**não** [a](https://x.com)</code></p>');
  });

  it('builds bullet and numbered lists', () => {
    expect(safeMarkdown('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(safeMarkdown('1. a\n2) b')).toBe('<ol><li>a</li><li>b</li></ol>');
    expect(safeMarkdown('texto\n- a')).toBe('<p>texto</p><ul><li>a</li></ul>');
  });

  it('does not treat a lone asterisk or spaced asterisks as emphasis', () => {
    expect(safeMarkdown('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>');
  });

  it('links only http and https URLs, with rel and target', () => {
    expect(safeMarkdown('[norma](https://exemplo.com.br/a?b=1&c=2)')).toBe(
      '<p><a href="https://exemplo.com.br/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">norma</a></p>'
    );
    expect(safeMarkdown('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
    expect(safeMarkdown('[x](data:text/html;base64,AAAA)')).not.toContain('<a');
    expect(safeMarkdown('[x](//evil.com)')).not.toContain('<a');
  });

  describe('injection', () => {
    it('escapes raw HTML tags', () => {
      const html = safeMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
    });

    it('cannot break out of the href attribute', () => {
      const html = safeMarkdown('[x](https://a.com/"onmouseover="alert(1))');
      expect(html).not.toMatch(/<a[^>]* onmouseover=/);
      expect(html).not.toContain('"onmouseover');
    });

    it('escapes quotes and ampersands', () => {
      expect(safeMarkdown(`a & "b" 'c'`)).toBe('<p>a &amp; &quot;b&quot; &#39;c&#39;</p>');
    });

    it('escapes tags inside bold, list items and links', () => {
      expect(safeMarkdown('**<b>x</b>**')).toBe('<p><strong>&lt;b&gt;x&lt;/b&gt;</strong></p>');
      expect(safeMarkdown('- <i>x</i>')).toBe('<ul><li>&lt;i&gt;x&lt;/i&gt;</li></ul>');
      expect(safeMarkdown('[<b>x</b>](https://a.com)')).toContain('&lt;b&gt;x&lt;/b&gt;</a>');
    });

    it('ignores NUL characters so users cannot forge code-span placeholders', () => {
      const html = safeMarkdown('`<b>x</b>` \u00000\u0000 \u00005\u0000');
      expect(html).toBe('<p><code>&lt;b&gt;x&lt;/b&gt;</code> 0 5</p>');
    });

    it('stays fast on long hostile input', () => {
      const started = performance.now();
      safeMarkdown('*a'.repeat(4000));
      safeMarkdown('['.repeat(4000));
      safeMarkdown('**'.repeat(4000));
      expect(performance.now() - started).toBeLessThan(1000);
    });
  });
});
