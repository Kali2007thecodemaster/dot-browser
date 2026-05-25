import { StorageEnum } from './base/enums';
import { createStorage } from './base/base';
import type { BaseStorage } from './base/types';

export interface ProfileEducation {
  institution: string;
  degree: string;
  year: string;
}

export interface ProfileExperience {
  company: string;
  role: string;
  dates: string;
  description: string;
}

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  education: ProfileEducation[];
  experience: ProfileExperience[];
  skills: string[];
  links: Record<string, string>;
}

export type ProfileStorage = BaseStorage<ProfileData> & {
  getProfile: () => Promise<ProfileData>;
  setProfile: (data: Partial<ProfileData>) => Promise<void>;
  clearProfile: () => Promise<void>;
};

export const DEFAULT_PROFILE_DATA: ProfileData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  education: [],
  experience: [],
  skills: [],
  links: {},
};

const storage = createStorage<ProfileData>('profile-data', DEFAULT_PROFILE_DATA, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const profileStore: ProfileStorage = {
  ...storage,

  async getProfile() {
    return (await storage.get()) ?? DEFAULT_PROFILE_DATA;
  },

  async setProfile(data: Partial<ProfileData>) {
    const current = (await storage.get()) ?? DEFAULT_PROFILE_DATA;
    await storage.set({ ...current, ...data });
  },

  async clearProfile() {
    await storage.set(DEFAULT_PROFILE_DATA);
  },
};
