/**
 * VaultManager Singleton
 * 
 * Provides a single shared instance of VaultManager across the application
 */

import { VaultManager } from './VaultManager';

let instance: VaultManager | null = null;

export const getVaultManager = (): VaultManager => {
  if (!instance) {
    instance = new VaultManager();
  }
  return instance;
};
