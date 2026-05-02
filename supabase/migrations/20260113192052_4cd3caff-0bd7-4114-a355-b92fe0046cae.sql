-- Add deleted_at column for soft delete (agent will clean up files later)
ALTER TABLE public.slides 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for querying non-deleted slides
CREATE INDEX idx_slides_deleted_at ON public.slides (deleted_at) WHERE deleted_at IS NULL;