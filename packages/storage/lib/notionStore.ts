import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

/**
 * A pinned Notion database. Lets the agent refer to a database by friendly name
 * (e.g. "Job Tracker") instead of memorizing the UUID across sessions.
 */
export interface PinnedNotionDatabase {
  /** Friendly name used by the agent (must be unique). */
  name: string;
  /** Notion database UUID (with or without dashes — Notion accepts both). */
  databaseId: string;
  /** Optional human description shown in the settings UI. */
  description?: string;
}

export interface NotionConfig {
  /** Internal-integration secret (secret_xxx). Empty string when not configured. */
  apiToken: string;
  /** When true, the agent writes to Notion without asking; when false, it asks via human_interrupt first. */
  autoWrite: boolean;
  /** User-pinned databases the agent can reference by name. */
  pinnedDatabases: PinnedNotionDatabase[];
}

export const DEFAULT_NOTION_CONFIG: NotionConfig = {
  apiToken: '',
  autoWrite: false,
  pinnedDatabases: [],
};

export type NotionStorage = BaseStorage<NotionConfig> & {
  /** Get the full config (token + flags + pinned list). */
  getConfig: () => Promise<NotionConfig>;
  /** Merge a partial update into the stored config. */
  updateConfig: (patch: Partial<NotionConfig>) => Promise<void>;
  /** Convenience: token only. Empty string when not configured. */
  getToken: () => Promise<string>;
  /** Convenience: lookup a pinned database by friendly name. */
  getPinned: (name: string) => Promise<PinnedNotionDatabase | undefined>;
  /** Add or replace a pinned database by name. */
  upsertPinned: (entry: PinnedNotionDatabase) => Promise<void>;
  /** Remove a pinned database by name. Returns true if it was present. */
  removePinned: (name: string) => Promise<boolean>;
  /** Wipe everything (token + pinned list). */
  disconnect: () => Promise<void>;
};

const storage = createStorage<NotionConfig>('notion-config', DEFAULT_NOTION_CONFIG, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const notionStore: NotionStorage = {
  ...storage,

  async getConfig() {
    const stored = await storage.get();
    // Defensive merge — older installs may not have all fields.
    return { ...DEFAULT_NOTION_CONFIG, ...(stored ?? {}) };
  },

  async updateConfig(patch) {
    const current = (await storage.get()) ?? DEFAULT_NOTION_CONFIG;
    await storage.set({ ...DEFAULT_NOTION_CONFIG, ...current, ...patch });
  },

  async getToken() {
    const c = await this.getConfig();
    return c.apiToken;
  },

  async getPinned(name) {
    const c = await this.getConfig();
    return c.pinnedDatabases.find(d => d.name === name);
  },

  async upsertPinned(entry) {
    const c = await this.getConfig();
    const without = c.pinnedDatabases.filter(d => d.name !== entry.name);
    await this.updateConfig({ pinnedDatabases: [...without, entry] });
  },

  async removePinned(name) {
    const c = await this.getConfig();
    const before = c.pinnedDatabases.length;
    const after = c.pinnedDatabases.filter(d => d.name !== name);
    if (after.length === before) return false;
    await this.updateConfig({ pinnedDatabases: after });
    return true;
  },

  async disconnect() {
    await storage.set(DEFAULT_NOTION_CONFIG);
  },
};
