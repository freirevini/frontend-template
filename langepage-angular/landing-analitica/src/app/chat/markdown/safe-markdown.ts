/**
 * Minimal markdown for chat messages. All input is escaped first, so the result only contains the tags this
 * file writes itself: p, br, strong, em, code, ul, ol, li and a (http/https only). Never trust BFF text as HTML.
 *
 * Supported: paragraphs (blank line), line breaks, **bold**, *italic*, `code`, "- " / "* " lists,
 * "1. " lists and [text](https://url) links.
 */

const PLACEHOLDER = '\u0000';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ESCAPES[char]);
}

function formatInline(escaped: string): string {
  const codeSpans: string[] = [];
  let text = escaped.replace(/`([^`\n]+)`/g, (_, code: string) => {
    codeSpans.push(`<code>${code}</code>`);
    return `${PLACEHOLDER}${codeSpans.length - 1}${PLACEHOLDER}`;
  });

  text = text
    .replace(
      /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, '<em>$1</em>');

  return text.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'), (_, index: string) => codeSpans[+index]);
}

const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul' | 'ol'; items: string[] };

function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const last: Block | undefined = blocks[blocks.length - 1];
    if (!line) {
      blocks.push({ kind: 'p', lines: [] }); // blank-line separator, dropped below
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const listKind = bullet ? 'ul' : numbered ? 'ol' : null;
    const itemText = (bullet ?? numbered)?.[1];

    if (listKind && itemText !== undefined) {
      if (last?.kind === listKind) {
        last.items.push(itemText);
      } else {
        blocks.push({ kind: listKind, items: [itemText] });
      }
    } else if (last?.kind === 'p' && last.lines.length > 0) {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'p', lines: [line] });
    }
  }
  return blocks.filter(block => (block.kind === 'p' ? block.lines.length > 0 : true));
}

/** Converts simple markdown to safe HTML. Returns an empty string for empty input. */
export function safeMarkdown(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  const lines = escapeHtml(text.split(PLACEHOLDER).join('')).split(/\r?\n/);

  return toBlocks(lines)
    .map(block =>
      block.kind === 'p'
        ? `<p>${block.lines.map(formatInline).join('<br>')}</p>`
        : `<${block.kind}>${block.items.map(item => `<li>${formatInline(item)}</li>`).join('')}</${block.kind}>`
    )
    .join('');
}
