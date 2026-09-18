CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_id uuid REFERENCES public.user_vaults(id) ON DELETE CASCADE,
  section text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
ON public.user_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX user_settings_unique_scope
  ON public.user_settings (user_id, section, COALESCE(vault_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX user_settings_user_idx ON public.user_settings (user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();