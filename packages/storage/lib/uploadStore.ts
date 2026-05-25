import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

export interface UploadedFile {
  id: string;
  name: string;
  type: 'md';
  content: string;
  size: number;
  timestamp: number;
}

export type UploadStorage = BaseStorage<UploadedFile[]> & {
  addFile: (file: Omit<UploadedFile, 'id' | 'timestamp'>) => Promise<UploadedFile>;
  removeFile: (id: string) => Promise<void>;
  getFile: (id: string) => Promise<UploadedFile | undefined>;
  listFiles: () => Promise<UploadedFile[]>;
  clearAll: () => Promise<void>;
};

const storage = createStorage<UploadedFile[]>('upload-data', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const uploadStore: UploadStorage = {
  ...storage,

  async addFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name} exceeds the 5MB per-file limit`);
    }
    const current = await storage.get();
    const totalSize = current.reduce((sum, f) => sum + f.size, 0);
    if (totalSize + file.size > MAX_TOTAL_SIZE) {
      throw new Error('Total upload size limit (20MB) would be exceeded');
    }
    const newFile: UploadedFile = {
      ...file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    await storage.set([...current, newFile]);
    return newFile;
  },

  async removeFile(id) {
    await storage.set(prev => prev.filter(f => f.id !== id));
  },

  async getFile(id) {
    const all = await storage.get();
    return all.find(f => f.id === id);
  },

  async listFiles() {
    return storage.get();
  },

  async clearAll() {
    await storage.set([]);
  },
};
