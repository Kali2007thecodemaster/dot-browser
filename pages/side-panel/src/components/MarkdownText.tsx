import { memo, type ReactNode } from 'react';

interface MarkdownTextProps {
  text: string;
}

/**
 * Minimal, safe markdown renderer for chat output.
 * No dangerouslySetInnerHTML — every token becomes a real React node.
 * Supports the patterns the LLM actually emits in chat:
 *   paragraphs, bullet lists (- / *), numbered lists (1.),
 *   h1/h2/h3 (#, ##, ###), bold (**), italic (* / _), inline code (`),
 *   links [text](url), fenced code blocks (```).
 * Link targets are restricted to http(s) and mailto so an LLM can't slip
 * in a javascript: URL.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = '';
  let key = 0;
  let i = 0;

  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Inline code `...`
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        nodes.push(
          <code key={`${keyPrefix}-${key++}`} className="md-code-inline">
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    // Bold **...**
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        nodes.push(
          <strong key={`${keyPrefix}-${key++}`}>{renderInline(text.slice(i + 2, end), `${keyPrefix}-b${key}`)}</strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Italic *...* or _..._  (single char, not the bold pattern)
    if ((ch === '*' || ch === '_') && text[i + 1] !== ch) {
      const end = text.indexOf(ch, i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        nodes.push(
          <em key={`${keyPrefix}-${key++}`}>{renderInline(text.slice(i + 1, end), `${keyPrefix}-i${key}`)}</em>,
        );
        i = end + 1;
        continue;
      }
    }

    // Link [text](url)
    if (ch === '[') {
      const endText = text.indexOf(']', i + 1);
      if (endText !== -1 && text[endText + 1] === '(') {
        const endUrl = text.indexOf(')', endText + 2);
        if (endUrl !== -1) {
          flush();
          const url = text.slice(endText + 2, endUrl);
          const linkText = text.slice(i + 1, endText);
          const safeUrl = /^(https?:\/\/|mailto:)/i.test(url) ? url : '#';
          nodes.push(
            <a
              key={`${keyPrefix}-${key++}`}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="md-link">
              {linkText}
            </a>,
          );
          i = endUrl + 1;
          continue;
        }
      }
    }

    buf += ch;
    i++;
  }

  flush();
  return nodes;
}

const MarkdownText = memo(({ text }: MarkdownTextProps) => {
  // Pass 1: pull out fenced code blocks (highest precedence — their content
  // is rendered verbatim, no further inline parsing).
  type Block = { type: 'code'; content: string } | { type: 'text'; content: string };
  const blocks: Block[] = [];
  const codeRegex = /```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > lastIdx) blocks.push({ type: 'text', content: text.slice(lastIdx, m.index) });
    blocks.push({ type: 'code', content: m[1] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) blocks.push({ type: 'text', content: text.slice(lastIdx) });

  // Pass 2: split each text block into paragraphs / lists / headings.
  const out: ReactNode[] = [];
  blocks.forEach((blk, blkIdx) => {
    if (blk.type === 'code') {
      out.push(
        <pre key={`b-${blkIdx}`} className="md-code-block">
          <code>{blk.content.replace(/\n$/, '')}</code>
        </pre>,
      );
      return;
    }

    const paragraphs = blk.content.split(/\n\s*\n/);
    paragraphs.forEach((para, pIdx) => {
      const trimmed = para.replace(/^\n+|\n+$/g, '');
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      const firstLine = lines[0];
      const baseKey = `b-${blkIdx}-p-${pIdx}`;

      // Heading: single-line `# `, `## `, `### `
      const headerMatch = firstLine.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch && lines.length === 1) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        const Tag = `h${level + 2}` as unknown as 'h3' | 'h4' | 'h5';
        out.push(
          <Tag key={baseKey} className={`md-heading md-h${level}`}>
            {renderInline(content, baseKey)}
          </Tag>,
        );
        return;
      }

      // Unordered list — every line begins with `- ` or `* `.
      if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
        out.push(
          <ul key={baseKey} className="md-list">
            {lines.map((l, lIdx) => (
              <li key={lIdx}>{renderInline(l.replace(/^\s*[-*]\s+/, ''), `${baseKey}-l-${lIdx}`)}</li>
            ))}
          </ul>,
        );
        return;
      }

      // Ordered list — every line begins with `N. `.
      if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
        out.push(
          <ol key={baseKey} className="md-list">
            {lines.map((l, lIdx) => (
              <li key={lIdx}>{renderInline(l.replace(/^\s*\d+\.\s+/, ''), `${baseKey}-l-${lIdx}`)}</li>
            ))}
          </ol>,
        );
        return;
      }

      // Paragraph. Single newlines inside the paragraph become <br/>.
      out.push(
        <p key={baseKey} className="md-paragraph">
          {lines.map((l, lIdx) => (
            <span key={lIdx}>
              {renderInline(l, `${baseKey}-l-${lIdx}`)}
              {lIdx < lines.length - 1 && <br />}
            </span>
          ))}
        </p>,
      );
    });
  });

  return <div className="md-content">{out}</div>;
});

MarkdownText.displayName = 'MarkdownText';
export default MarkdownText;
