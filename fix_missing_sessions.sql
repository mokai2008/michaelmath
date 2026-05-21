-- Run this in your Supabase SQL Editor to generate sessions for already approved requests

DO $$
DECLARE
    req RECORD;
    new_session_id UUID;
    slot RECORD;
BEGIN
    FOR req IN 
        SELECT br.* 
        FROM public.booking_requests br
        LEFT JOIN public.live_session_enrollments lse ON lse.student_id = br.student_id
        LEFT JOIN public.live_sessions ls ON ls.id = lse.session_id AND ls.scheduled_at = (br.requested_date + br.requested_start_time)
        WHERE br.status = 'approved' AND ls.id IS NULL
    LOOP
        -- Get slot details
        SELECT * INTO slot FROM public.admin_availability_slots WHERE id = req.slot_id;
        
        -- Insert new session
        INSERT INTO public.live_sessions (title, scheduled_at, duration_minutes, price)
        VALUES (
            '1-on-1 Tutoring Session',
            (req.requested_date + req.requested_start_time),
            COALESCE(slot.duration_minutes, 60),
            COALESCE(slot.price, 0)
        )
        RETURNING id INTO new_session_id;

        -- Enroll student
        INSERT INTO public.live_session_enrollments (session_id, student_id, status, responded_at)
        VALUES (
            new_session_id,
            req.student_id,
            'accepted',
            NOW()
        );
    END LOOP;
END;
$$;
