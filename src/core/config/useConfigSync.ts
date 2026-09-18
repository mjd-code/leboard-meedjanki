/**
 * Mounts the configuration vault: registers sections, hydrates from local
 * storage before the UI renders, then syncs with the cloud.
 */

import { useEffect, useState } from 'react';
import { configService } from './ConfigService';
import { registerConfigSections } from './sections';
import { useVaultStore } from '@/shared/stores/useVaultStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { ConfigSyncState } from './types';

export function useConfigSync(): ConfigSyncState {
  const vaultId = useVaultStore((s) => s.currentVaultId);
  const { user } = useAuth();
  const [state, setState] = useState<ConfigSyncState>(configService.getState());

  useEffect(() => configService.onStateChange(setState), []);

  // Boot once: register sections and hydrate local settings.
  useEffect(() => {
    registerConfigSections();
    void configService.start(vaultId ?? null);

    const flush = () => void configService.flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-scope when the active vault changes.
  useEffect(() => {
    void configService.setVault(vaultId ?? null);
  }, [vaultId]);

  // Pull the account copy after sign-in.
  useEffect(() => {
    if (user) void configService.pullFromCloud();
  }, [user]);

  // React immediately to any auth transition (including dev quick login).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      ) {
        setTimeout(() => void configService.pullFromCloud(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}

export function useConfigSyncState(): ConfigSyncState {
  const [state, setState] = useState<ConfigSyncState>(configService.getState());
  useEffect(() => configService.onStateChange(setState), []);
  return state;
}
