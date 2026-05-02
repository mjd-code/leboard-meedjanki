-- Drop cms_strings table
DROP TABLE IF EXISTS public.cms_strings;

-- Drop presentations table (need to drop slides FK constraint first or use CASCADE)
-- First remove the foreign key from slides
ALTER TABLE public.slides DROP CONSTRAINT IF EXISTS slides_presentation_id_fkey;

-- Drop presentations table
DROP TABLE IF EXISTS public.presentations;

-- Remove presentation_id column from slides since we're simplifying
ALTER TABLE public.slides DROP COLUMN IF EXISTS presentation_id;