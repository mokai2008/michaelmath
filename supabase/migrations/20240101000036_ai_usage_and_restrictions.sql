-- Migration: 20240101000036_ai_usage_and_restrictions.sql
-- Description: Adds AI usage tracking, token logging, and ability to stop/enable student AI usage

-- 1. Add AI permission and limit columns to public.profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_disabled_reason TEXT DEFAULT 'AI Assistant access has been disabled for your account by the instructor.',
  ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT NULL;

-- 2. Enhance public.chat_logs to track tokens, message count, and last active timestamp
ALTER TABLE public.chat_logs
  ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- 3. Create public.ai_usage_events table to track individual AI queries, model, tokens, and estimated cost
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  chat_id UUID REFERENCES public.chat_logs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0 NOT NULL,
  completion_tokens INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  cost_cents NUMERIC(10, 4) DEFAULT 0 NOT NULL,
  context_page TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast queries by student and date
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_student_created ON public.ai_usage_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created ON public.ai_usage_events(created_at DESC);

-- 4. Enable RLS on ai_usage_events
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies for ai_usage_events
DROP POLICY IF EXISTS "Admin and users can view ai usage events" ON public.ai_usage_events;
CREATE POLICY "Admin and users can view ai usage events"
  ON public.ai_usage_events FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Authenticated users can insert ai usage events" ON public.ai_usage_events;
CREATE POLICY "Authenticated users can insert ai usage events"
  ON public.ai_usage_events FOR INSERT
  WITH CHECK (auth.uid() = student_id OR public.is_admin());

-- 6. Ensure Admin can view, update, and manage all chat_logs
DROP POLICY IF EXISTS "Admin and users can view chat logs" ON public.chat_logs;
CREATE POLICY "Admin and users can view chat logs"
  ON public.chat_logs FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin can manage chat logs" ON public.chat_logs;
CREATE POLICY "Admin can manage chat logs"
  ON public.chat_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Ensure Admin can update profiles for AI access toggle
DROP POLICY IF EXISTS "Admin can update profiles for ai" ON public.profiles;
CREATE POLICY "Admin can update profiles for ai"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
