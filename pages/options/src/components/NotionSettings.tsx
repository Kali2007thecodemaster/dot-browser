import { useState, useEffect, useCallback } from 'react';
import { notionStore, type NotionConfig, type PinnedNotionDatabase, DEFAULT_NOTION_CONFIG } from '@extension/storage';
import { FiRefreshCw, FiCheck, FiX, FiTrash2, FiPlus, FiEye, FiEyeOff } from 'react-icons/fi';

interface NotionSettingsProps {
  isDarkMode?: boolean;
}

/** UI status of the most recent "Test connection" attempt. */
type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; workspace: string; bot: string }
  | { kind: 'error'; message: string };

const TOKEN_HELP_URL = 'https://www.notion.so/my-integrations';

export const NotionSettings = ({ isDarkMode = false }: NotionSettingsProps) => {
  // Note about state shape: tokenInput is the textbox draft; `config.apiToken` is what's
  // persisted. We only persist after a successful test connection (or on explicit save).
  const [config, setConfig] = useState<NotionConfig>(DEFAULT_NOTION_CONFIG);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [pinDraftName, setPinDraftName] = useState('');
  const [pinDraftId, setPinDraftId] = useState('');
  const [pinDraftDesc, setPinDraftDesc] = useState('');

  useEffect(() => {
    notionStore.getConfig().then(c => {
      setConfig(c);
      setTokenInput(c.apiToken);
    });
  }, []);

  const handleTest = useCallback(async () => {
    const candidate = tokenInput.trim();
    if (!candidate) {
      setTest({ kind: 'error', message: 'Paste your integration token first.' });
      return;
    }
    setTest({ kind: 'testing' });
    try {
      // chrome.runtime.sendMessage round-trip to the background service worker,
      // which holds the NotionClient. We never let the options page talk to the
      // Notion API directly — keeps the token egress path centralized.
      const res = await chrome.runtime.sendMessage({
        type: 'notion_test_connection',
        token: candidate,
      });
      if (res?.ok) {
        setTest({ kind: 'ok', workspace: res.workspace, bot: res.bot });
        // On success, persist the token immediately. The user came here to connect.
        await notionStore.updateConfig({ apiToken: candidate });
        setConfig(c => ({ ...c, apiToken: candidate }));
      } else {
        setTest({ kind: 'error', message: res?.error || 'Unknown error.' });
      }
    } catch (err) {
      setTest({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [tokenInput]);

  const handleDisconnect = useCallback(async () => {
    await notionStore.disconnect();
    setConfig(DEFAULT_NOTION_CONFIG);
    setTokenInput('');
    setTest({ kind: 'idle' });
  }, []);

  const handleToggleAutoWrite = useCallback(async () => {
    const next = !config.autoWrite;
    await notionStore.updateConfig({ autoWrite: next });
    setConfig(c => ({ ...c, autoWrite: next }));
  }, [config.autoWrite]);

  const handleAddPin = useCallback(async () => {
    const name = pinDraftName.trim();
    const databaseId = pinDraftId.trim();
    if (!name || !databaseId) return;
    const entry: PinnedNotionDatabase = {
      name,
      databaseId,
      description: pinDraftDesc.trim() || undefined,
    };
    await notionStore.upsertPinned(entry);
    const c = await notionStore.getConfig();
    setConfig(c);
    setPinDraftName('');
    setPinDraftId('');
    setPinDraftDesc('');
  }, [pinDraftName, pinDraftId, pinDraftDesc]);

  const handleRemovePin = useCallback(async (name: string) => {
    await notionStore.removePinned(name);
    const c = await notionStore.getConfig();
    setConfig(c);
  }, []);

  const isConnected = config.apiToken.length > 0;

  return (
    <section className="space-y-6">
      {/* Connection card */}
      <div className="rounded-lg border border-line bg-surface p-6 text-left">
        <h2 className="mb-1 text-xl font-semibold text-ink">Notion connection</h2>
        <p className="mb-4 text-sm text-muted">
          Dot uses an internal Notion integration as long-term memory (job tracker, reading list, contacts, etc.).
          Create an integration at{' '}
          <a href={TOKEN_HELP_URL} target="_blank" rel="noopener noreferrer" className="text-amber underline">
            notion.so/my-integrations
          </a>
          , copy the <code className="rounded bg-surface px-1 py-0.5 text-amber">secret_</code> token below, then share
          the specific Notion pages you want Dot to access using Notion's "Share → Add connections" menu.
        </p>

        <label htmlFor="notion-token" className="mb-1 block text-sm font-medium text-ink">
          Integration token
        </label>
        <div className="mb-3 flex items-center gap-2">
          <input
            id="notion-token"
            type={showToken ? 'text' : 'password'}
            placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-amber"
          />
          <button
            type="button"
            onClick={() => setShowToken(s => !s)}
            aria-label={showToken ? 'Hide token' : 'Show token'}
            title={showToken ? 'Hide' : 'Show'}
            className="rounded-md border border-line bg-surface p-2 text-muted hover:text-ink">
            {showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={test.kind === 'testing' || !tokenInput.trim()}
            className="rounded-md bg-amber px-4 py-2 text-sm text-ground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {test.kind === 'testing' ? (
              <span className="inline-flex items-center gap-2">
                <FiRefreshCw className="animate-spin" size={14} />
                Testing…
              </span>
            ) : (
              'Test connection & save'
            )}
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink">
              Disconnect
            </button>
          )}
        </div>

        {test.kind === 'ok' && (
          <div className="mt-4 flex items-center gap-2 rounded border border-line bg-surface p-3 text-sm text-ink">
            <FiCheck className="text-amber" size={16} />
            <span>
              Connected as <strong>{test.bot}</strong> in workspace <strong>{test.workspace}</strong>. Don't forget to
              share specific pages with the integration in Notion.
            </span>
          </div>
        )}
        {test.kind === 'error' && (
          <div className="mt-4 flex items-start gap-2 rounded border border-line bg-surface p-3 text-sm text-ink">
            <FiX className="mt-0.5 shrink-0 text-amber" size={16} />
            <span>{test.message}</span>
          </div>
        )}
      </div>

      {/* Behavior card */}
      <div className="rounded-lg border border-line bg-surface p-6 text-left">
        <h2 className="mb-4 text-xl font-semibold text-ink">Write behavior</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-ink">Auto-write</h3>
            <p className="text-sm text-muted">
              When ON, Dot writes to Notion without asking. When OFF, it pauses and asks for confirmation before any
              create / update / archive operation.
            </p>
          </div>
          <label htmlFor="notion-auto-write" className="relative inline-flex cursor-pointer items-center">
            <input
              id="notion-auto-write"
              type="checkbox"
              checked={config.autoWrite}
              onChange={handleToggleAutoWrite}
              className="peer sr-only"
              disabled={!isConnected}
            />
            <div
              className={
                "peer h-6 w-11 cursor-pointer rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"
              }
            />
          </label>
        </div>
      </div>

      {/* Pinned databases card */}
      <div className="rounded-lg border border-line bg-surface p-6 text-left">
        <h2 className="mb-1 text-xl font-semibold text-ink">Pinned databases</h2>
        <p className="mb-4 text-sm text-muted">
          Give a friendly name to a Notion database so the agent can find it by name across sessions (e.g. "Job
          Tracker"). The database ID is the UUID in the database URL — copy it from Notion's "Copy link to view" menu.
        </p>

        {/* Existing entries */}
        {config.pinnedDatabases.length === 0 ? (
          <p className="mb-4 text-sm italic text-muted">No databases pinned yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {config.pinnedDatabases.map(d => (
              <li
                key={d.name}
                className="flex items-center justify-between rounded border border-line bg-surface p-3 text-sm text-ink">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted">
                    <code className="text-amber">{d.databaseId}</code>
                    {d.description ? ` · ${d.description}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePin(d.name)}
                  aria-label={`Remove ${d.name}`}
                  className="rounded-md border border-line bg-surface p-2 text-muted hover:text-ink">
                  <FiTrash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name (e.g. Job Tracker)"
              value={pinDraftName}
              onChange={e => setPinDraftName(e.target.value)}
              className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              disabled={!isConnected}
            />
            <input
              type="text"
              placeholder="Database ID (UUID)"
              value={pinDraftId}
              onChange={e => setPinDraftId(e.target.value)}
              className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              disabled={!isConnected}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Description (optional)"
              value={pinDraftDesc}
              onChange={e => setPinDraftDesc(e.target.value)}
              className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              disabled={!isConnected}
            />
            <button
              type="button"
              onClick={handleAddPin}
              disabled={!isConnected || !pinDraftName.trim() || !pinDraftId.trim()}
              className="rounded-md bg-amber px-4 py-2 text-sm text-ground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              <span className="inline-flex items-center gap-2">
                <FiPlus size={14} />
                Add pin
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
