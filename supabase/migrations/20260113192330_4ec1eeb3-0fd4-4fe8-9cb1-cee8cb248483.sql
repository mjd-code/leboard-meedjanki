-- Add pending_agent_action field to track slides waiting for agent processing
ALTER TABLE public.slides 
ADD COLUMN pending_agent_action boolean NOT NULL DEFAULT false;