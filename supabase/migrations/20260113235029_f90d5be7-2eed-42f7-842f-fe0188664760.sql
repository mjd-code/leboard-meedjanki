-- Create slide_changes table for storing pending edits per slide
CREATE TABLE public.slide_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_id UUID NOT NULL REFERENCES public.slides(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slide_changes ENABLE ROW LEVEL SECURITY;

-- Public access policy (matching existing pattern)
CREATE POLICY "Public access for slide_changes"
ON public.slide_changes
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for efficient lookups by slide
CREATE INDEX idx_slide_changes_slide_id ON public.slide_changes(slide_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.slide_changes;