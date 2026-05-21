CREATE TABLE public.platform_settings (
  id integer primary key default 1,
  stripe_secret_key text,
  openai_api_key text,
  updated_at timestamptz default now() not null
);

-- Ensure only one row exists
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_single_row CHECK (id = 1);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings for API routes using service role, but for client side, admins only
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::user_role)
);
