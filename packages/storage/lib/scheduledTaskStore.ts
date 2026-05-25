import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

export interface ScheduledTask {
  id: string;
  label: string;
  taskDescription: string;
  intervalMinutes: number;
  nextRunAt: number | null;
  lastRunAt: number | null;
  active: boolean;
  createdAt: number;
}

export type ScheduledTaskStorage = BaseStorage<ScheduledTask[]> & {
  add: (config: Omit<ScheduledTask, 'id' | 'createdAt' | 'nextRunAt' | 'lastRunAt'>) => Promise<ScheduledTask>;
  update: (id: string, updates: Partial<ScheduledTask>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getAll: () => Promise<ScheduledTask[]>;
};

const storage = createStorage<ScheduledTask[]>('dot-scheduled-tasks', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const scheduledTaskStore: ScheduledTaskStorage = {
  ...storage,
  async add(config) {
    const nextRunAt = config.active ? Date.now() + config.intervalMinutes * 60 * 1000 : null;
    const newTask: ScheduledTask = {
      ...config,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      nextRunAt,
      lastRunAt: null,
    };
    await storage.set(prev => [...prev, newTask]);
    return newTask;
  },
  async update(id, updates) {
    await storage.set(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  },
  async remove(id) {
    await storage.set(prev => prev.filter(t => t.id !== id));
  },
  async getAll() {
    return storage.get();
  },
};
