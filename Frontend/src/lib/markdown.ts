// Shared lightweight Markdown subset for notes (paragraphs, ## headings,
// dash lists, > blockquotes, inline images / bold / italics). No markdown
// dependency on purpose. Single source of truth: NoteBody.astro renders
// articles with it, the CMS preview pane reuses it.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'strong' | 'em'; text: string };

export function renderInline(text: string): Inline[] {
  const parts: Inline[] = [];
  const regex = /(!\[[^\]]*\]\([^)]*\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) });
    if (match[1]) {
      const src = match[1].match(/\(([^)]+)\)/)?.[1] ?? '';
      const alt = match[1].match(/\[([^\]]*)\]/)?.[1] ?? '';
      if (src) parts.push({ kind: 'image', src, alt });
    } else if (match[2]) {
      parts.push({ kind: 'strong', text: match[2].slice(2, -2) });
    } else if (match[3]) {
      parts.push({ kind: 'em', text: match[3].slice(1, -1) });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export type Block =
  | { kind: 'list'; items: Inline[][] }
  | { kind: 'quote'; inlines: Inline[][] }
  | { kind: 'heading'; inline: Inline[]; rest: Inline[][] }
  | { kind: 'paras'; inlines: Inline[][] };

export function parseBlocks(body: string): Block[] {
  return (body ?? '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0);
      if (lines.every((l) => l.startsWith('- '))) {
        return { kind: 'list', items: lines.map((l) => renderInline(l.slice(2))) } as Block;
      }
      if (lines.every((l) => l.startsWith('> '))) {
        return { kind: 'quote', inlines: lines.map((l) => renderInline(l.slice(2))) } as Block;
      }
      const first = lines[0] ?? '';
      if (first.startsWith('## ')) {
        return {
          kind: 'heading',
          inline: renderInline(first.slice(3)),
          rest: lines.slice(1).map((l) => renderInline(l)),
        } as Block;
      }
      return { kind: 'paras', inlines: lines.map((l) => renderInline(l)) } as Block;
    });
}

/** Plain-text word count over Markdown source (markup stripped). */
export function countWords(body: string): number {
  const text = (body ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').length;
}
