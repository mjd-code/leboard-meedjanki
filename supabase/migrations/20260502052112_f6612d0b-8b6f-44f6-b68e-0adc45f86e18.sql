
-- Add missing columns for blog posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured_image text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id text;

-- Copy existing data from old columns to new columns
UPDATE public.posts SET featured_image = cover_image WHERE featured_image IS NULL AND cover_image IS NOT NULL;
UPDATE public.posts SET author_id = author WHERE author_id IS NULL AND author IS NOT NULL;
