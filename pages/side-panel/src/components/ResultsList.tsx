import { useState, useEffect, useCallback } from 'react';
import { resultsStore, type SavedResult } from '@extension/storage';
import ResultsCard from './ResultsCard';

interface ResultsListProps {
  onClose: () => void;
}

// ── Diff helpers ─────────────────────────────────────────────────────────────

type DiffLine = { kind: 'added' | 'removed' | 'same'; text: string };

function lineDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const aSet = new Set(aLines);
  const bSet = new Set(bLines);
  const result: DiffLine[] = [];
  const seen = new Set<string>();

  for (const line of aLines) {
    if (!bSet.has(line)) {
      result.push({ kind: 'removed', text: line });
    } else if (!seen.has(line)) {
      seen.add(line);
      result.push({ kind: 'same', text: line });
    }
  }
  for (const line of bLines) {
    if (!aSet.has(line)) {
      result.push({ kind: 'added', text: line });
    }
  }
  return result;
}

interface ArrayDiffResult {
  added: unknown[];
  removed: unknown[];
  changed: unknown[];
  same: number;
}

function getItemKey(item: unknown): string {
  if (typeof item !== 'object' || !item) return JSON.stringify(item);
  const obj = item as Record<string, unknown>;
  for (const f of ['id', 'url', 'title', 'name', 'link']) {
    if (obj[f]) return String(obj[f]);
  }
  return JSON.stringify(item);
}

function arrayDiff(a: unknown[], b: unknown[]): ArrayDiffResult {
  const aMap = new Map(a.map(x => [getItemKey(x), x]));
  const bMap = new Map(b.map(x => [getItemKey(x), x]));
  const added = b.filter(x => !aMap.has(getItemKey(x)));
  const removed = a.filter(x => !bMap.has(getItemKey(x)));
  const changed = b.filter(x => {
    const k = getItemKey(x);
    return aMap.has(k) && JSON.stringify(aMap.get(k)) !== JSON.stringify(x);
  });
  const same = b.filter(x => {
    const k = getItemKey(x);
    return aMap.has(k) && JSON.stringify(aMap.get(k)) === JSON.stringify(x);
  }).length;
  return { added, removed, changed, same };
}

function buildDiff(a: SavedResult, b: SavedResult): React.ReactNode {
  let aData: unknown, bData: unknown;
  try {
    aData = JSON.parse(a.data);
  } catch {
    aData = null;
  }
  try {
    bData = JSON.parse(b.data);
  } catch {
    bData = null;
  }

  if (Array.isArray(aData) && Array.isArray(bData)) {
    const { added, removed, changed, same } = arrayDiff(aData, bData);
    const summarize = (items: unknown[]) =>
      items.slice(0, 5).map((item, i) => {
        const key = getItemKey(item);
        return (
          <div key={i} style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {key}
          </div>
        );
      });

    return (
      <div style={{ fontSize: 11 }}>
        <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 6 }}>
          {same} unchanged · {added.length} added · {removed.length} removed · {changed.length} changed
        </div>
        {added.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div className="label-mono" style={{ color: '#4caf50', marginBottom: 3 }}>
              + Added ({added.length})
            </div>
            <div
              style={{
                padding: '4px 8px',
                background: 'rgba(76,175,80,0.08)',
                borderRadius: 4,
                borderLeft: '3px solid #4caf50',
              }}>
              {summarize(added)}
              {added.length > 5 && (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>…and {added.length - 5} more</div>
              )}
            </div>
          </div>
        )}
        {removed.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div className="label-mono" style={{ color: '#f44336', marginBottom: 3 }}>
              − Removed ({removed.length})
            </div>
            <div
              style={{
                padding: '4px 8px',
                background: 'rgba(244,67,54,0.08)',
                borderRadius: 4,
                borderLeft: '3px solid #f44336',
              }}>
              {summarize(removed)}
              {removed.length > 5 && (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>…and {removed.length - 5} more</div>
              )}
            </div>
          </div>
        )}
        {changed.length > 0 && (
          <div>
            <div className="label-mono" style={{ color: '#ff9800', marginBottom: 3 }}>
              ~ Changed ({changed.length})
            </div>
            <div
              style={{
                padding: '4px 8px',
                background: 'rgba(255,152,0,0.08)',
                borderRadius: 4,
                borderLeft: '3px solid #ff9800',
              }}>
              {summarize(changed)}
              {changed.length > 5 && (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>…and {changed.length - 5} more</div>
              )}
            </div>
          </div>
        )}
        {added.length === 0 && removed.length === 0 && changed.length === 0 && (
          <div className="label-mono" style={{ color: 'var(--muted)' }}>
            No differences found
          </div>
        )}
      </div>
    );
  }

  // Fall back to line diff
  const lines = lineDiff(a.data, b.data);
  const filtered = lines.filter(l => l.kind !== 'same').slice(0, 30);
  const totalChanges = lines.filter(l => l.kind !== 'same').length;

  if (totalChanges === 0) {
    return (
      <div className="label-mono" style={{ color: 'var(--muted)' }}>
        No differences found
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
      <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 6 }}>
        {totalChanges} changed lines
      </div>
      {filtered.map((line, i) => (
        <div
          key={i}
          style={{
            color: line.kind === 'added' ? '#4caf50' : '#f44336',
            padding: '1px 4px',
            background: line.kind === 'added' ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)',
          }}>
          {line.kind === 'added' ? '+' : '-'} {line.text}
        </div>
      ))}
      {totalChanges > 30 && (
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>…and {totalChanges - 30} more changes</div>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ResultsList({ onClose }: ResultsListProps) {
  const [results, setResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await resultsStore.getResults();
    setResults(all.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClearAll = async () => {
    await resultsStore.clearResults();
    setResults([]);
    setSelected([]);
    setCompareMode(false);
    setShowDiff(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id],
    );
  };

  const handleEnterCompare = () => {
    setCompareMode(true);
    setSelected([]);
    setShowDiff(false);
  };

  const handleExitCompare = () => {
    setCompareMode(false);
    setSelected([]);
    setShowDiff(false);
  };

  const resultA = results.find(r => r.id === selected[0]);
  const resultB = results.find(r => r.id === selected[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={compareMode ? handleExitCompare : onClose}
            className="label-mono"
            style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          <span className="label-mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
            {compareMode ? (showDiff ? 'Diff' : 'Select 2 to compare') : 'Saved Results'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!compareMode && results.length >= 2 && (
            <button
              type="button"
              onClick={handleEnterCompare}
              className="label-mono"
              style={{
                color: 'var(--muted)',
                background: 'none',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 9,
              }}>
              Compare
            </button>
          )}
          {compareMode && selected.length === 2 && !showDiff && (
            <button
              type="button"
              onClick={() => setShowDiff(true)}
              className="label-mono"
              style={{
                color: 'var(--bg)',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 9,
              }}>
              View Diff
            </button>
          )}
          {!compareMode && results.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="label-mono"
              style={{
                color: 'var(--muted)',
                background: 'none',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 9,
              }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Diff view */}
      {showDiff && resultA && resultB && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ marginBottom: 10 }}>
            <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 2 }}>
              A — {resultA.type} · {new Date(resultA.timestamp).toLocaleDateString()}
            </div>
            <div className="label-mono" style={{ color: 'var(--muted)' }}>
              B — {resultB.type} · {new Date(resultB.timestamp).toLocaleDateString()}
            </div>
          </div>
          <div
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '10px 12px',
            }}>
            {buildDiff(resultA, resultB)}
          </div>
        </div>
      )}

      {/* List */}
      {!showDiff && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading && (
            <div className="label-mono py-4 text-center" style={{ color: 'var(--muted)' }}>
              Loading…
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ paddingTop: 40, textAlign: 'center' }}>
              <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 6 }}>
                No saved results yet
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.7 }}>
                Results from agent extractions will appear here
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(result => (
                <div key={result.id} style={{ position: 'relative' }}>
                  {compareMode && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        border: `2px solid ${selected.includes(result.id) ? 'var(--accent)' : 'var(--line)'}`,
                        background: selected.includes(result.id) ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--bg)',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                      onClick={() => toggleSelect(result.id)}>
                      {selected.includes(result.id) ? (selected.indexOf(result.id) === 0 ? 'A' : 'B') : ''}
                    </div>
                  )}
                  <div
                    onClick={compareMode ? () => toggleSelect(result.id) : undefined}
                    style={{
                      cursor: compareMode ? 'pointer' : 'default',
                      opacity: compareMode && selected.length === 2 && !selected.includes(result.id) ? 0.4 : 1,
                    }}>
                    <ResultsCard result={result} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
