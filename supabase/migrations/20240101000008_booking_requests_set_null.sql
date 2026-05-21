-- Update booking_requests to preserve history when admin deletes slots
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_slot_id_fkey,
  ALTER COLUMN slot_id DROP NOT NULL,
  ADD CONSTRAINT booking_requests_slot_id_fkey
    FOREIGN KEY (slot_id) REFERENCES public.admin_availability_slots(id) ON DELETE SET NULL;
