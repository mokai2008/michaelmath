-- 1. Add price column to topics table (default 0.00 = free/included in section)
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS price numeric(10, 2) DEFAULT 0.00 NOT NULL;

COMMENT ON COLUMN public.topics.price IS 'Individual price to unlock this topic/lesson using wallet balance (0.00 = free/included)';

-- 2. Create topic_purchases table
CREATE TABLE IF NOT EXISTS public.topic_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz DEFAULT now() NOT NULL,
  amount_paid numeric(10, 2) NOT NULL DEFAULT 0.00,
  UNIQUE (student_id, topic_id)
);

-- 3. Enable RLS on topic_purchases
ALTER TABLE public.topic_purchases ENABLE ROW LEVEL SECURITY;

-- 4. Students can read their own topic_purchases
DROP POLICY IF EXISTS "Users can read own topic purchases." ON public.topic_purchases;
CREATE POLICY "Users can read own topic purchases."
  ON public.topic_purchases FOR SELECT USING (auth.uid() = student_id);

-- 5. Students can insert own topic_purchases
DROP POLICY IF EXISTS "Users can insert own topic purchases." ON public.topic_purchases;
CREATE POLICY "Users can insert own topic purchases."
  ON public.topic_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 6. Admin can manage topic_purchases
DROP POLICY IF EXISTS "Admin can manage topic_purchases." ON public.topic_purchases;
CREATE POLICY "Admin can manage topic_purchases."
  ON public.topic_purchases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Add index for fast student lookups
CREATE INDEX IF NOT EXISTS idx_topic_purchases_student_id ON public.topic_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_purchases_topic_id ON public.topic_purchases(topic_id);
