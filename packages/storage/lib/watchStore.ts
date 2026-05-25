import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

export interface WatchConfig {
  id: string;
  url: string;
  label: string;
  intervalMinutes: number;
  lastSnapshot: string | null;
  lastChecked: number | null;
  active: boolean;
  createdAt: number;
}

export type WatchStorage = BaseStorage<WatchConfig[]> & {
  add: (config: Omit<WatchConfig, 'id' | 'createdAt' | 'lastSnapshot' | 'lastChecked'>) => Promise<WatchConfig>;
  update: (id: string, updates: Partial<WatchConfig>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getAll: () => Promise<WatchConfig[]>;
};

const storage = createStorage<WatchConfig[]>('dot-watches', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const watchStore: WatchStorage = {
  ...storage,
  async add(config) {
    const newWatch: WatchConfig = {
      ...config,
      id: `watch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      lastSnapshot: null,
      lastChecked: null,
    };
    await storage.set(prev => [...prev, newWatch]);
    return newWatch;
  },
  async update(id, updates) {
    await storage.set(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
  },
  async remove(id) {
    await storage.set(prev => prev.filter(w => w.id !== id));
  },
  async getAll() {
    return storage.get();
  },
};
