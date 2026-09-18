/**
 * ApiKeyService - Secure per-user API key management
 * 
 * Provides secure API key generation, storage, and validation with user isolation
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string; // Only returned on creation
}

export type ApiKeyPermission = 'read' | 'write' | 'delete' | 'admin';

export class ApiKeyService {
  /**
   * Generate a secure random API key
   */
  private generateApiKey(): { key: string; prefix: string } {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return {
      key: `vk_${key}`,
      prefix: `vk_${key.slice(0, 8)}...`,
    };
  }

  /**
   * Hash an API key for secure storage
   */
  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get all API keys for the current user (without secrets)
   */
  async getApiKeys(): Promise<{ data: ApiKey[] | null; error: Error | null }> {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const keys: ApiKey[] = (data || []).map(key => ({
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      permissions: (key.permissions as string[]) || ['read'],
      last_used_at: key.last_used_at,
      expires_at: key.expires_at,
      is_active: key.is_active,
      created_at: key.created_at,
    }));

    return { data: keys, error: null };
  }

  /**
   * Create a new API key
   * The full key is only returned once on creation
   */
  async createApiKey(
    name: string,
    permissions: ApiKeyPermission[] = ['read'],
    expiresInDays?: number
  ): Promise<{ data: ApiKeyWithSecret | null; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { key, prefix } = this.generateApiKey();
    const keyHash = await this.hashKey(key);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_prefix: prefix,
        permissions: permissions as unknown as Json,
        expires_at: expiresAt,
      })
      .select('id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const apiKey: ApiKeyWithSecret = {
      id: data.id,
      name: data.name,
      key_prefix: data.key_prefix,
      permissions: (data.permissions as string[]) || ['read'],
      last_used_at: data.last_used_at,
      expires_at: data.expires_at,
      is_active: data.is_active,
      created_at: data.created_at,
      secret: key, // Only returned on creation
    };

    return { data: apiKey, error: null };
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(keyId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Update API key permissions or expiration
   */
  async updateApiKey(
    keyId: string,
    updates: {
      name?: string;
      permissions?: ApiKeyPermission[];
      expires_at?: string | null;
      is_active?: boolean;
    }
  ): Promise<{ error: Error | null }> {
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions as unknown as Json;
    if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const { error } = await supabase
      .from('user_api_keys')
      .update(updateData as never)
      .eq('id', keyId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  /**
   * Validate an API key and return user ID if valid
   * This should be called from an edge function for security
   */
  async validateApiKey(key: string): Promise<{ 
    valid: boolean; 
    userId?: string; 
    permissions?: string[];
    error?: string;
  }> {
    const keyHash = await this.hashKey(key);

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('user_id, permissions, expires_at, is_active')
      .eq('key_hash', keyHash)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'API key has been revoked' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last_used_at
    await supabase
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return { 
      valid: true, 
      userId: data.user_id,
      permissions: (data.permissions as string[]) || ['read'],
    };
  }
}

export const apiKeyService = new ApiKeyService();
