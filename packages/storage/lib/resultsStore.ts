import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

export interface SavedResult {
  id: string;
  type: 'job' | 'research' | 'extraction';
  data: string;
  source: string;
  timestamp: number;
}

export type ResultsStorage = BaseStorage<SavedResult[]> & {
  addResult: (result: Omit<SavedResult, 'id' | 'timestamp'>) => Promise<SavedResult>;
  getResults: (type?: SavedResult['type']) => Promise<SavedResult[]>;
  clearResults: () => Promise<void>;
};

const storage = createStorage<SavedResult[]>('results-data', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const resultsStore: ResultsStorage = {
  ...storage,

  async addResult(result) {
    const newResult: SavedResult = {
      ...result,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    await storage.set(prev => [...prev, newResult]);
    return newResult;
  },

  async getResults(type?) {
    const all = await storage.get();
    return type ? all.filter(r => r.type === type) : all;
  },

  async clearResults() {
    await storage.set([]);
  },
};
