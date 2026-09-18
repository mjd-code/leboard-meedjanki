-- Create user_vaults table for cloud-synced vaults with user isolation
CREATE TABLE public.user_vaults (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    graph_data JSONB NOT NULL DEFAULT '{"nodes": [], "links": []}'::jsonb,
    graph_config JSONB DEFAULT '{}'::jsonb,
    backup_config JSONB DEFAULT '{}'::jsonb,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    encryption_key_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_vault_name UNIQUE (user_id, name)
);

-- Create user_api_keys table for secure per-user API key management
CREATE TABLE public.user_api_keys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vault_history table for undo/redo with user isolation
CREATE TABLE public.vault_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vault_id UUID NOT NULL REFERENCES public.user_vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vault_backups table with user isolation
CREATE TABLE public.vault_backups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vault_id UUID NOT NULL REFERENCES public.user_vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    links JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_vaults (complete data isolation)
CREATE POLICY "Users can view own vaults" ON public.user_vaults
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vaults" ON public.user_vaults
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vaults" ON public.user_vaults
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vaults" ON public.user_vaults
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_api_keys (complete data isolation)
CREATE POLICY "Users can view own API keys" ON public.user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON public.user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vault_history (complete data isolation)
CREATE POLICY "Users can view own vault history" ON public.vault_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vault history" ON public.vault_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault history" ON public.vault_history
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vault_backups (complete data isolation)
CREATE POLICY "Users can view own vault backups" ON public.vault_backups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vault backups" ON public.vault_backups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault backups" ON public.vault_backups
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_vaults_user_id ON public.user_vaults(user_id);
CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX idx_vault_history_vault_id ON public.vault_history(vault_id);
CREATE INDEX idx_vault_backups_vault_id ON public.vault_backups(vault_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_vaults_updated_at
    BEFORE UPDATE ON public.user_vaults
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();