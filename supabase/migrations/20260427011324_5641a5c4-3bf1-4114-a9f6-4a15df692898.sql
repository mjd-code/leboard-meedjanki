CREATE TABLE public.app_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  path TEXT,
  device TEXT NOT NULL DEFAULT 'desktop',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT NOT NULL,
  ref_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_events"
  ON public.app_events FOR SELECT
  USING (true);

CREATE POLICY "Public insert app_events"
  ON public.app_events FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_app_events_created_at ON public.app_events (created_at DESC);
CREATE INDEX idx_app_events_event_type ON public.app_events (event_type);
CREATE INDEX idx_app_events_session ON public.app_events (session_id);
CREATE INDEX idx_app_events_admin ON public.app_events (is_admin);