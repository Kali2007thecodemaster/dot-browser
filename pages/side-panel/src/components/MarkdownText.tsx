import { memo, type ReactNode } from 'react';

interface MarkdownTextProps {
  text: string;
}

/**
 * Minimal, safe markdown renderer for chat output.
 * No dangerouslySetInnerHTML — every token becomes a real React node.
 * Supported features:
 *   - paragraphs separated by blank lines
 *   - h1/h2/h3 (#, ##, ###)
 *   - bullet lists (- / *) and ordered lists (1.), with nesting (2-space indent)
 *   - tables (GFM-style pipe tables with --- separator)
 *   - blockquotes (>)
 *   - fenced code blocks (```), inline code (`)
 *   - bold (**), italic (* / _)
 *   - links [text](url) — http(s) / mailto only
 *   - line breaks inside paragraphs (single \n -> <br/>)
 */

// ---------- Inline ----------

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

// ---------- Tables ----------

type Align = 'left' | 'center' | 'right' | undefined;

function parseAlignSpec(cell: string): Align {
  const c = cell.trim();
  const startsColon = c.startsWith(':');
  const endsColon = c.endsWith(':');
  if (startsColon && endsColon) return 'center';
  if (endsColon) return 'right';
  if (startsColon) return 'left';
  return undefined;
}

function splitRow(line: string): string[] {
  // strip leading/trailing pipe then split. Keep empty cells.
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map(c => c.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableHeader(line: string): boolean {
  return /^\s*\|.+\|\s*$/.test(line.trim()) || /\|/.test(line);
}

function renderTable(lines: string[], baseKey: string): ReactNode | null {
  if (lines.length < 2) return null;
  if (!isTableHeader(lines[0]) || !isTableSeparator(lines[1])) return null;
  const headerCells = splitRow(lines[0]);
  const alignSpec = splitRow(lines[1]).map(parseAlignSpec);
  const bodyRows = lines.slice(2).map(splitRow);
  return (
    <div className="md-table-wrap" key={baseKey}>
      <table className="md-table">
        <thead>
          <tr>
            {headerCells.map((cell, i) => (
              <th key={i} style={alignSpec[i] ? { textAlign: alignSpec[i] } : undefined}>
                {renderInline(cell, `${baseKey}-h-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={alignSpec[cIdx] ? { textAlign: alignSpec[cIdx] } : undefined}>
                  {renderInline(cell, `${baseKey}-r${rIdx}-c${cIdx}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Lists (with nesting) ----------

interface ListItem {
  content: string;
  indent: number;
  ordered: boolean;
  children: ListItem[];
}

const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

function isListLine(line: string): boolean {
  return LIST_RE.test(line);
}

function parseListLines(lines: string[]): ListItem[] {
  // Build a tree from a flat list of list lines based on indent depth.
  const items: ListItem[] = [];
  const stack: { indent: number; items: ListItem[] }[] = [{ indent: -1, items }];

  for (const raw of lines) {
    const m = raw.match(LIST_RE);
    if (!m) continue;
    const indent = m[1].length;
    const marker = m[2];
    const content = m[3];
    const ordered = /^\d+\.$/.test(marker);
    const item: ListItem = { content, indent, ordered, children: [] };

    // Pop levels deeper than current.
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    // Push at current level. If current level doesn't exist yet, create it nested under last item.
    const top = stack[stack.length - 1];
    if (top.indent < indent && top !== stack[0]) {
      // Children of the most recent item at the parent level.
      const parentItems = top.items;
      const parent = parentItems[parentItems.length - 1];
      parent.children.push(item);
      stack.push({ indent, items: parent.children });
    } else if (top === stack[0] || top.indent === indent) {
      top.items.push(item);
      // If we just pushed into root and indent > -1, set stack indent.
      if (top.indent !== indent) {
        stack[stack.length - 1] = { indent, items: top.items };
      }
    } else {
      // top.indent > indent (shouldn't happen after pop loop, but defensive)
      top.items.push(item);
    }
  }
  return items;
}

function renderListItems(items: ListItem[], keyPrefix: string): ReactNode[] {
  return items.map((it, idx) => {
    const inline = renderInline(it.content, `${keyPrefix}-${idx}`);
    const children = it.children.length > 0 ? renderListGroup(it.children, `${keyPrefix}-${idx}-c`) : null;
    return (
      <li key={idx}>
        {inline}
        {children}
      </li>
    );
  });
}

function renderListGroup(items: ListItem[], keyPrefix: string): ReactNode {
  if (items.length === 0) return null;
  // A group's tag is determined by its first item (mixed lists fall back to ul).
  const ordered = items[0].ordered;
  // Split runs of differing-tag siblings so each becomes its own list.
  const runs: ListItem[][] = [];
  let current: ListItem[] = [];
  let currentOrdered = ordered;
  for (const it of items) {
    if (it.ordered !== currentOrdered && current.length > 0) {
      runs.push(current);
      current = [];
      currentOrdered = it.ordered;
    }
    current.push(it);
  }
  if (current.length > 0) runs.push(current);

  return runs.map((run, rIdx) => {
    const Tag = (run[0].ordered ? 'ol' : 'ul') as 'ol' | 'ul';
    return (
      <Tag key={`${keyPrefix}-r${rIdx}`} className="md-list">
        {renderListItems(run, `${keyPrefix}-r${rIdx}`)}
      </Tag>
    );
  });
}

// ---------- Top-level ----------

const MarkdownText = memo(({ text }: MarkdownTextProps) => {
  // Pass 1: pull out fenced code blocks (verbatim content).
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

  // Pass 2: split each text block by blank lines, classify each chunk.
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

      // Heading: single-line `#`/`##`/`###`
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

      // Table: header row + separator row + 1+ body rows
      if (lines.length >= 2 && isTableHeader(lines[0]) && isTableSeparator(lines[1])) {
        const table = renderTable(lines, baseKey);
        if (table) {
          out.push(table);
          return;
        }
      }

      // Blockquote: every non-empty line starts with `>`
      if (lines.every(l => /^\s*>\s?/.test(l))) {
        const inner = lines.map(l => l.replace(/^\s*>\s?/, '')).join('\n');
        out.push(
          <blockquote key={baseKey} className="md-blockquote">
            {renderInline(inner, baseKey)}
          </blockquote>,
        );
        return;
      }

      // List (bullet or ordered, possibly nested)
      if (lines.every(isListLine)) {
        const items = parseListLines(lines);
        out.push(<div key={baseKey}>{renderListGroup(items, baseKey)}</div>);
        return;
      }

      // Plain paragraph (single \n becomes <br/>)
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
