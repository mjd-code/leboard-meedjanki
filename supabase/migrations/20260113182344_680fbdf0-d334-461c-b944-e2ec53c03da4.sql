-- Presentations table (deck metadata)
CREATE TABLE public.presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Presentation',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Slides table (ordering and metadata only - content is in .tsx files)
CREATE TABLE public.slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  template_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comments table (for slide annotations)
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_id UUID NOT NULL REFERENCES public.slides(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CMS strings table (all UI text for easy editing)
CREATE TABLE public.cms_strings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now - personal tool)
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_strings ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth needed for personal tool)
CREATE POLICY "Public access for presentations" ON public.presentations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for slides" ON public.slides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for cms_strings" ON public.cms_strings FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX idx_slides_position ON public.slides(presentation_id, position);
CREATE INDEX idx_comments_slide_id ON public.comments(slide_id);
CREATE INDEX idx_cms_strings_key ON public.cms_strings(key);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_presentations_updated_at
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slides_updated_at
  BEFORE UPDATE ON public.slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_strings_updated_at
  BEFORE UPDATE ON public.cms_strings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();