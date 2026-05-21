-- ============================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Add booking functionality to admin_availability_slots
-- ============================================

-- 1. Add price and is_booked columns to admin_availability_slots
ALTER TABLE public.admin_availability_slots 
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_booked boolean DEFAULT false;

-- 2. Ensure anyone can see active and unbooked slots
DROP POLICY IF EXISTS "Anyone can view active availability slots." ON public.admin_availability_slots;
CREATE POLICY "Anyone can view active availability slots."
  ON public.admin_availability_slots FOR SELECT USING (is_active = true);

-- 3. Allow admins to update the slots (already covered by RLS, but let's make sure)
-- Just ensuring admins can modify slots entirely
DROP POLICY IF EXISTS "Admin can manage availability slots." ON public.admin_availability_slots;
CREATE POLICY "Admin can manage availability slots."
  ON public.admin_availability_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

