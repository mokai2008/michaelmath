-- Add specific date to availability slots
ALTER TABLE public.admin_availability_slots
  ADD COLUMN IF NOT EXISTS slot_date date;

-- Update booking_requests: ensure admin can update with WITH CHECK
DROP POLICY IF EXISTS "Admin can update booking requests." ON public.booking_requests;
CREATE POLICY "Admin can update booking requests."
  ON public.booking_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
