/**
 * Vault Store - Manages vault-related state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { SaveStatus } from './types';
import type { GraphConfigState } from './useGraphStore';

interface VaultState {
  // State
  currentVaultId: string | null;
  vaultGraphConfig: GraphConfigState | null;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  setCurrentVaultId: (id: string | null) => void;
  setVaultGraphConfig: (config: GraphConfigState | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSaved: (date: Date | null) => void;
  setCanUndo: (canUndo: boolean) => void;
  setCanRedo: (canRedo: boolean) => void;
  updateUndoRedoState: (canUndo: boolean, canRedo: boolean) => void;
  
  // Reset
  reset: () => void;
}

export const useVaultStore = create<VaultState>()(
  devtools(
    subscribeWithSelector((set) => ({
      // Initial state
      currentVaultId: null,
      vaultGraphConfig: null,
      saveStatus: 'idle',
      lastSaved: null,
      canUndo: false,
      canRedo: false,
      
      // Actions
      setCurrentVaultId: (id) => set({ currentVaultId: id }, false, 'setCurrentVaultId'),
      
      setVaultGraphConfig: (config) => set(
        { vaultGraphConfig: config },
        false,
        'setVaultGraphConfig'
      ),
      
      setSaveStatus: (status) => set({ saveStatus: status }, false, 'setSaveStatus'),
      
      setLastSaved: (date) => set({ lastSaved: date }, false, 'setLastSaved'),
      
      setCanUndo: (canUndo) => set({ canUndo }, false, 'setCanUndo'),
      
      setCanRedo: (canRedo) => set({ canRedo }, false, 'setCanRedo'),
      
      updateUndoRedoState: (canUndo, canRedo) => set(
        { canUndo, canRedo },
        false,
        'updateUndoRedoState'
      ),
      
      reset: () => set({
        currentVaultId: null,
        vaultGraphConfig: null,
        saveStatus: 'idle',
        lastSaved: null,
        canUndo: false,
        canRedo: false,
      }, false, 'reset'),
    })),
    { name: 'VaultStore' }
  )
);
