export type { BaseStorage } from './base/types';
export * from './settings';
export * from './chat';
export * from './profile';
export * from './prompt/favorites';
export * from './profileStore';
export * from './resultsStore';
export * from './uploadStore';
export * from './notionStore';

export * from './watchStore';
export * from './scheduledTaskStore';

// Re-export the favorites instance for direct use
export { default as favoritesStorage } from './prompt/favorites';
