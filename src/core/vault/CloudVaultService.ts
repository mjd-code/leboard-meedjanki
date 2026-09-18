/**
 * CloudVaultService - Supabase-backed vault storage with multi-tenant isolation
 * 
 * Provides secure cloud storage for vaults with automatic user isolation via RLS
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CloudVault {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  graph_data: {
    nodes: any[];
    links: any[];
  };
  graph_config: Record<string, any>;
  backup_config: Record<string, any>;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface VaultBackup {
  id: string;
  vault_id: string;
  nodes: any[];
  links: any[];
  reason: string | null;
  created_at: string;
}

export class CloudVaultService {
  /**
   * Get all vaults for the current user
   */
  async getVaults(): Promise<{ data: CloudVault[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('user_vaults')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Type-safe transformation
    const vaults: CloudVault[] = (data || []).map(vault => ({
      id: vault.id,
      user_id: vault.user_id,
      name: vault.name,
      description: vault.description,
      graph_data: (vault.graph_data as { nodes: any[]; links: any[] }) || { nodes: [], links: [] },
      graph_config: (vault.graph_config as Record<string, any>) || {},
      backup_config: (vault.backup_config as Record<string, any>) || {},
      is_encrypted: vault.is_encrypted,
      created_at: vault.created_at,
      updated_at: vault.updated_at,
      last_synced_at: vault.last_synced_at,
    }));

    return { data: vaults, error: null };
  }

  /**
   * Get a single vault by ID (automatically filtered by RLS)
   */
  async getVault(vaultId: string): Promise<{ data: CloudVault | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('user_vaults')
      .select('*')
      .eq('id', vaultId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const vault: CloudVault = {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      graph_data: (data.graph_data as { nodes: any[]; links: any[] }) || { nodes: [], links: [] },
      graph_config: (data.graph_config as Record<string, any>) || {},
      backup_config: (data.backup_config as Record<string, any>) || {},
      is_encrypted: data.is_encrypted,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_synced_at: data.last_synced_at,
    };

    return { data: vault, error: null };
  }

  /**
   * Create a new vault for the current user
   */
  async createVault(
    name: string,
    description?: string,
    graphData?: { nodes: any[]; links: any[] }
  ): Promise<{ data: CloudVault | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_vaults')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        graph_data: (graphData || { nodes: [], links: [] }) as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const vault: CloudVault = {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      graph_data: (data.graph_data as { nodes: any[]; links: any[] }) || { nodes: [], links: [] },
      graph_config: (data.graph_config as Record<string, any>) || {},
      backup_config: (data.backup_config as Record<string, any>) || {},
      is_encrypted: data.is_encrypted,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_synced_at: data.last_synced_at,
    };

    return { data: vault, error: null };
  }

  /**
   * Update vault data
   */
  async updateVault(
    vaultId: string,
    updates: {
      name?: string;
      description?: string;
      graph_data?: { nodes: any[]; links: any[] };
      graph_config?: Record<string, any>;
      backup_config?: Record<string, any>;
    }
  ): Promise<{ error: Error | null }> {
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.graph_data !== undefined) updateData.graph_data = updates.graph_data as unknown as Json;
    if (updates.graph_config !== undefined) updateData.graph_config = updates.graph_config as unknown as Json;
    if (updates.backup_config !== undefined) updateData.backup_config = updates.backup_config as unknown as Json;
    updateData.last_synced_at = new Date().toISOString();

    const { error } = await supabase
      .from('user_vaults')
      .update(updateData as never)
      .eq('id', vaultId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Delete a vault and all associated data
   */
  async deleteVault(vaultId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('user_vaults')
      .delete()
      .eq('id', vaultId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Create a backup of the vault
   */
  async createBackup(
    vaultId: string,
    nodes: any[],
    links: any[],
    reason?: string
  ): Promise<{ data: VaultBackup | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('vault_backups')
      .insert({
        vault_id: vaultId,
        user_id: user.id,
        nodes: nodes as unknown as Json,
        links: links as unknown as Json,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const backup: VaultBackup = {
      id: data.id,
      vault_id: data.vault_id,
      nodes: (data.nodes as any[]) || [],
      links: (data.links as any[]) || [],
      reason: data.reason,
      created_at: data.created_at,
    };

    return { data: backup, error: null };
  }

  /**
   * Get backups for a vault
   */
  async getBackups(vaultId: string, limit = 10): Promise<{ data: VaultBackup[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('vault_backups')
      .select('*')
      .eq('vault_id', vaultId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const backups: VaultBackup[] = (data || []).map(backup => ({
      id: backup.id,
      vault_id: backup.vault_id,
      nodes: (backup.nodes as any[]) || [],
      links: (backup.links as any[]) || [],
      reason: backup.reason,
      created_at: backup.created_at,
    }));

    return { data: backups, error: null };
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('vault_backups')
      .delete()
      .eq('id', backupId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Prune old backups, keeping only the most recent ones
   */
  async pruneBackups(vaultId: string, keepCount: number): Promise<{ error: Error | null }> {
    // Get all backups sorted by date
    const { data: backups, error: fetchError } = await supabase
      .from('vault_backups')
      .select('id, created_at')
      .eq('vault_id', vaultId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return { error: new Error(fetchError.message) };
    }

    if (!backups || backups.length <= keepCount) {
      return { error: null };
    }

    // Delete older backups
    const backupsToDelete = backups.slice(keepCount).map(b => b.id);
    
    const { error: deleteError } = await supabase
      .from('vault_backups')
      .delete()
      .in('id', backupsToDelete);

    if (deleteError) {
      return { error: new Error(deleteError.message) };
    }

    return { error: null };
  }
}

export const cloudVaultService = new CloudVaultService();
