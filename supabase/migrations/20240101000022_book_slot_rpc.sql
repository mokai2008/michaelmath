-- ============================================
-- SQL for secure slot booking (bypasses RLS for wallet/slot update)
-- ============================================

CREATE OR REPLACE FUNCTION public.book_availability_slot(
  p_slot_id uuid, 
  p_student_id uuid, 
  p_booking_date date, 
  p_notes text
)
RETURNS public.booking_requests AS $$
DECLARE
  v_price numeric;
  v_balance numeric;
  v_start_time time;
  v_is_booked boolean;
  v_booking public.booking_requests;
BEGIN
  -- 1. Check if slot exists and is available
  SELECT price, is_booked, start_time INTO v_price, v_is_booked, v_start_time 
  FROM public.admin_availability_slots 
  WHERE id = p_slot_id;
  
  IF v_is_booked THEN
    RAISE EXCEPTION 'Slot is already booked';
  END IF;

  -- 2. Check student wallet balance
  SELECT wallet_balance INTO v_balance 
  FROM public.profiles 
  WHERE id = p_student_id;
  
  IF v_price > 0 THEN
    IF v_balance < v_price THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Deduct wallet
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - v_price 
    WHERE id = p_student_id;
    
    -- Record transaction
    INSERT INTO public.wallet_transactions (student_id, type, amount, description) 
    VALUES (p_student_id, 'purchase', v_price, 'Booked session slot');
  END IF;
  
  -- 3. Mark slot as booked
  UPDATE public.admin_availability_slots 
  SET is_booked = true 
  WHERE id = p_slot_id;
  
  -- 4. Create booking request
  INSERT INTO public.booking_requests (student_id, slot_id, requested_date, requested_start_time, notes, status)
  VALUES (p_student_id, p_slot_id, p_booking_date, v_start_time, p_notes, 'pending')
  RETURNING * INTO v_booking;
  
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
