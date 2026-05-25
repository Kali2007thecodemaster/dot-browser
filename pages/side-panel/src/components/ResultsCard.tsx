import { useState, useEffect, useCallback } from 'react';
import { resultsStore, type SavedResult } from '@extension/storage';

const LABEL: Record<string, string> = {
  job: 'JOBS',
  research: 'RESEARCH',
  extraction: 'EXTRACTION',
};

function tryParseArray(data: string): Record<string, string>[] | null {
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as Record<string, string>[]) : null;
  } catch {
    return null;
  }
}

interface ResultsCardProps {
  resultId?: string;
  result?: SavedResult;
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.map(escape).join(','), ...rows.map(r => keys.map(k => escape(r[k] ?? '')).join(','))].join('\r\n');
}

export default function ResultsCard({ resultId, result: propResult }: ResultsCardProps) {
  const [result, setResult] = useState<SavedResult | null>(propResult ?? null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    if (propResult) {
      setResult(propResult);
      return;
    }
    if (!resultId) return;
    resultsStore.getResults().then(all => {
      const found = all.find(r => r.id === resultId);
      if (found) setResult(found);
    });
  }, [resultId, propResult]);

  if (!result) {
    return (
      <div className="glass-card p-3" style={{ borderRadius: 4 }}>
        <span className="label-mono" style={{ color: 'var(--muted)' }}>
          Loading result…
        </span>
      </div>
    );
  }

  const rows = tryParseArray(result.data);
  const count = rows ? rows.length : 1;
  const typeLabel = LABEL[result.type] ?? result.type.toUpperCase();
  const slug = `dot-${result.type}-${new Date(result.timestamp).toISOString().slice(0, 10)}`;

  const downloadJSON = useCallback(() => {
    triggerDownload(result.data, `${slug}.json`, 'application/json');
  }, [result.data, slug]);

  const downloadCSV = useCallback(() => {
    if (!rows) return;
    triggerDownload(toCSV(rows), `${slug}.csv`, 'text/csv');
  }, [rows, slug]);

  return (
    <div className="glass-card" style={{ borderRadius: 4, overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3"
        style={{ paddingTop: 9, paddingBottom: 9, borderBottom: '1px solid var(--line)' }}>
        <span className="label-mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
          {typeLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {rows && (
            <button
              type="button"
              onClick={downloadCSV}
              title="Download CSV"
              className="label-mono"
              style={{
                fontSize: 8,
                color: 'var(--muted)',
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 3,
                padding: '2px 5px',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}>
              CSV
            </button>
          )}
          <button
            type="button"
            onClick={downloadJSON}
            title="Download JSON"
            className="label-mono"
            style={{
              fontSize: 8,
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 3,
              padding: '2px 5px',
              cursor: 'pointer',
              lineHeight: 1.4,
            }}>
            JSON
          </button>
          <span
            className="label-mono"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 8,
            }}>
            {count}
          </span>
        </div>
      </div>

      {/* Rows (array data) */}
      {rows && rows.length > 0 && (
        <div>
          {rows.map((row, idx) => {
            const isHovered = hoveredIdx === idx;
            const isLast = idx === rows.length - 1;
            const href = row.url || row.link || row.href;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  padding: '9px 12px',
                  borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  background: isHovered ? 'rgba(0,0,0,0.02)' : 'transparent',
                  cursor: href ? 'pointer' : 'default',
                  transition: 'background 0.15s linear',
                }}
                onClick={() => {
                  if (href) chrome.tabs.create({ url: href });
                }}>
                {/* Primary label: title or first string value */}
                <div
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: 2,
                  }}>
                  {row.title ?? row.name ?? row.heading ?? Object.values(row)[0] ?? '—'}
                </div>

                {/* Secondary: company, location, or remaining fields */}
                {(row.company || row.location || row.source) && (
                  <div className="label-mono" style={{ color: 'var(--muted)', fontSize: 10, lineHeight: 1.4 }}>
                    {[row.company, row.location || row.source].filter(Boolean).join(' · ')}
                  </div>
                )}

                {/* Tag badge for type */}
                {idx === 0 && (
                  <span
                    className="label-mono"
                    style={{
                      marginTop: 4,
                      display: 'inline-block',
                      fontSize: 8,
                      color: 'var(--accent)',
                      background: 'rgba(196,90,45,0.08)',
                      borderRadius: 4,
                      padding: '1px 5px',
                    }}>
                    {result.type}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Text block (non-array data) */}
      {!rows && (
        <div style={{ padding: '9px 12px' }}>
          <pre
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 12,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              maxHeight: 200,
              overflowY: 'auto',
            }}>
            {result.data}
          </pre>
          <span
            className="label-mono"
            style={{
              marginTop: 6,
              display: 'inline-block',
              fontSize: 8,
              color: 'var(--accent)',
              background: 'rgba(196,90,45,0.08)',
              borderRadius: 4,
              padding: '1px 5px',
            }}>
            {result.type}
          </span>
        </div>
      )}

      {/* Footer: source + timestamp */}
      {result.source && (
        <div
          className="label-mono px-3"
          style={{
            paddingTop: 6,
            paddingBottom: 6,
            borderTop: '1px solid var(--line)',
            color: 'var(--muted)',
            fontSize: 9,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
          {result.source}
        </div>
      )}
    </div>
  );
}
