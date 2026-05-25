import { useState, useEffect, useCallback } from 'react';
import { watchStore, type WatchConfig } from '@extension/storage';

interface WatchListProps {
  onClose: () => void;
}

const INTERVALS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '6 hr', value: 360 },
  { label: '24 hr', value: 1440 },
];

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return (
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' ' +
    d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  );
}

export default function WatchList({ onClose }: WatchListProps) {
  const [watches, setWatches] = useState<WatchConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await watchStore.getAll();
    setWatches(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimUrl = url.trim();
    const trimLabel = label.trim();
    if (!trimUrl || !trimLabel) return;
    if (!/^https?:\/\/.+/.test(trimUrl)) return;

    setSaving(true);
    const w = await watchStore.add({ url: trimUrl, label: trimLabel, intervalMinutes, active: true });
    chrome.runtime.sendMessage({ type: 'register_watch', watchId: w.id, intervalMinutes });
    setUrl('');
    setLabel('');
    setIntervalMinutes(60);
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const handleToggle = async (watch: WatchConfig) => {
    const active = !watch.active;
    await watchStore.update(watch.id, { active });
    if (active) {
      chrome.runtime.sendMessage({ type: 'register_watch', watchId: watch.id, intervalMinutes: watch.intervalMinutes });
    } else {
      chrome.runtime.sendMessage({ type: 'unregister_watch', watchId: watch.id });
    }
    await load();
  };

  const handleRemove = async (watch: WatchConfig) => {
    chrome.runtime.sendMessage({ type: 'unregister_watch', watchId: watch.id });
    await watchStore.remove(watch.id);
    await load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="label-mono"
            style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          <span className="label-mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
            Web Watches
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="label-mono"
          style={{
            color: showForm ? 'var(--accent)' : 'var(--muted)',
            background: 'none',
            border: '1px solid var(--line)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 9,
          }}>
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              background: 'var(--glass)',
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: 12,
              color: 'var(--text)',
              marginBottom: 6,
              boxSizing: 'border-box',
            }}
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (e.g. HN front page)"
            style={{
              width: '100%',
              background: 'var(--glass)',
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: 12,
              color: 'var(--text)',
              marginBottom: 6,
              boxSizing: 'border-box',
            }}
          />
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span className="label-mono" style={{ color: 'var(--muted)', flexShrink: 0 }}>
              Check every
            </span>
            <select
              value={intervalMinutes}
              onChange={e => setIntervalMinutes(Number(e.target.value))}
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: 11,
                color: 'var(--text)',
                cursor: 'pointer',
              }}>
              {INTERVALS.map(i => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !url.trim() || !label.trim()}
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 4,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving || !url.trim() || !label.trim() ? 0.5 : 1,
            }}>
            {saving ? 'Adding…' : 'Add Watch'}
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading && (
          <div className="label-mono py-4 text-center" style={{ color: 'var(--muted)' }}>
            Loading…
          </div>
        )}

        {!loading && watches.length === 0 && (
          <div style={{ paddingTop: 40, textAlign: 'center' }}>
            <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 6 }}>
              No watches configured
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.7 }}>Add a URL to monitor for changes</div>
          </div>
        )}

        {!loading && watches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {watches.map(watch => (
              <div
                key={watch.id}
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{watch.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(watch)}
                      className="label-mono"
                      style={{
                        background: watch.active ? 'var(--accent)' : 'transparent',
                        color: watch.active ? 'var(--bg)' : 'var(--muted)',
                        border: '1px solid var(--line)',
                        borderRadius: 3,
                        padding: '1px 6px',
                        cursor: 'pointer',
                        fontSize: 8,
                      }}>
                      {watch.active ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(watch)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: '0 2px',
                      }}>
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="label-mono"
                  style={{
                    color: 'var(--muted)',
                    marginBottom: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  {watch.url}
                </div>
                <div className="flex items-center gap-2">
                  <span className="label-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                    Every {INTERVALS.find(i => i.value === watch.intervalMinutes)?.label ?? `${watch.intervalMinutes}m`}
                  </span>
                  {watch.lastChecked && (
                    <span className="label-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                      · checked {formatTime(watch.lastChecked)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
