import { useState, useEffect, useCallback } from 'react';
import { scheduledTaskStore, type ScheduledTask } from '@extension/storage';

interface ScheduledTaskListProps {
  onClose: () => void;
  onRunTask?: (taskDescription: string) => void;
}

const INTERVALS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
  { label: '6 hr', value: 360 },
  { label: '12 hr', value: 720 },
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

export default function ScheduledTaskList({ onClose, onRunTask }: ScheduledTaskListProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await scheduledTaskStore.getAll();
    setTasks(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const trimLabel = label.trim();
    const trimTask = taskDescription.trim();
    if (!trimLabel || !trimTask) return;

    setSaving(true);
    const t = await scheduledTaskStore.add({
      label: trimLabel,
      taskDescription: trimTask,
      intervalMinutes,
      active: true,
    });
    chrome.runtime.sendMessage({ type: 'register_scheduled_task', taskId: t.id, intervalMinutes });
    setLabel('');
    setTaskDescription('');
    setIntervalMinutes(60);
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const handleToggle = async (task: ScheduledTask) => {
    const active = !task.active;
    const nextRunAt = active ? Date.now() + task.intervalMinutes * 60 * 1000 : null;
    await scheduledTaskStore.update(task.id, { active, nextRunAt });
    if (active) {
      chrome.runtime.sendMessage({
        type: 'register_scheduled_task',
        taskId: task.id,
        intervalMinutes: task.intervalMinutes,
      });
    } else {
      chrome.runtime.sendMessage({ type: 'unregister_scheduled_task', taskId: task.id });
    }
    await load();
  };

  const handleRemove = async (task: ScheduledTask) => {
    chrome.runtime.sendMessage({ type: 'unregister_scheduled_task', taskId: task.id });
    await scheduledTaskStore.remove(task.id);
    await load();
  };

  const handleRunNow = (task: ScheduledTask) => {
    onRunTask?.(task.taskDescription);
    onClose();
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
            Scheduled Tasks
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
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Task name (e.g. Morning news digest)"
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
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="Task instruction for the agent…"
            rows={3}
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
              resize: 'vertical',
            }}
          />
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span className="label-mono" style={{ color: 'var(--muted)', flexShrink: 0 }}>
              Run every
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
            disabled={saving || !label.trim() || !taskDescription.trim()}
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 4,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving || !label.trim() || !taskDescription.trim() ? 0.5 : 1,
            }}>
            {saving ? 'Adding…' : 'Add Task'}
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

        {!loading && tasks.length === 0 && (
          <div style={{ paddingTop: 40, textAlign: 'center' }}>
            <div className="label-mono" style={{ color: 'var(--muted)', marginBottom: 6 }}>
              No scheduled tasks
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.7 }}>
              Add a task to run automatically on a schedule
            </div>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map(task => (
              <div
                key={task.id}
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 10px',
                }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{task.label}</span>
                  <div className="flex items-center gap-1">
                    {onRunTask && (
                      <button
                        type="button"
                        onClick={() => handleRunNow(task)}
                        className="label-mono"
                        style={{
                          background: 'transparent',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                          borderRadius: 3,
                          padding: '1px 6px',
                          cursor: 'pointer',
                          fontSize: 8,
                        }}>
                        RUN
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggle(task)}
                      className="label-mono"
                      style={{
                        background: task.active ? 'var(--accent)' : 'transparent',
                        color: task.active ? 'var(--bg)' : 'var(--muted)',
                        border: '1px solid var(--line)',
                        borderRadius: 3,
                        padding: '1px 6px',
                        cursor: 'pointer',
                        fontSize: 8,
                      }}>
                      {task.active ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(task)}
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
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  {task.taskDescription}
                </div>
                <div className="flex items-center gap-2">
                  <span className="label-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                    Every {INTERVALS.find(i => i.value === task.intervalMinutes)?.label ?? `${task.intervalMinutes}m`}
                  </span>
                  {task.lastRunAt && (
                    <span className="label-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                      · last {formatTime(task.lastRunAt)}
                    </span>
                  )}
                  {task.nextRunAt && task.active && (
                    <span className="label-mono" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                      · next {formatTime(task.nextRunAt)}
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
