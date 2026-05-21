-- Add title and link_url to notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS link_url text;
