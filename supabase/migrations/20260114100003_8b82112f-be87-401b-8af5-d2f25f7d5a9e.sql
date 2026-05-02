-- Add x_position and y_position columns to slide_changes table for positioned AI edit comments
ALTER TABLE public.slide_changes 
ADD COLUMN x_position numeric DEFAULT 50,
ADD COLUMN y_position numeric DEFAULT 50;