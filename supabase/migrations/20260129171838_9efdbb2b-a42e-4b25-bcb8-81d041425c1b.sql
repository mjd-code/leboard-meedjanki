-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Public access for presenter_notes" ON public.presenter_notes;

CREATE POLICY "Allow all access to presenter_notes" 
ON public.presenter_notes 
FOR ALL 
USING (true) 
WITH CHECK (true);