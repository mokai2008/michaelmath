import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fix() {
  const { data: requests } = await supabase.from('booking_requests').select('*, admin_availability_slots(*)').eq('status', 'approved');
  console.log(`Found ${requests?.length || 0} approved requests.`);
  
  if (!requests) return;

  for (const req of requests) {
    const scheduledAt = `${req.requested_date}T${req.requested_start_time}`;
    const slot = req.admin_availability_slots;
    
    // Check if a session already exists for this date/time and student
    // For simplicity, we just check if the student has any accepted enrollment around this time
    // But it's safer to just look up live_sessions directly
    const { data: existingSessions } = await supabase.from('live_sessions')
      .select('id')
      .eq('scheduled_at', scheduledAt)
      .eq('title', '1-on-1 Tutoring Session');
      
    let sessionId = existingSessions?.[0]?.id;
    
    if (!sessionId) {
      console.log(`Creating session for request ${req.id}`);
      const { data: newSession, error } = await supabase.from('live_sessions').insert({
        title: '1-on-1 Tutoring Session',
        scheduled_at: scheduledAt,
        duration_minutes: slot?.duration_minutes || 60,
        price: slot?.price || 0,
      }).select().single();
      
      if (error) {
        console.error("Error creating session", error);
        continue;
      }
      sessionId = newSession.id;
    }
    
    // Check enrollment
    const { data: enrollments } = await supabase.from('live_session_enrollments')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', req.student_id);
      
    if (!enrollments || enrollments.length === 0) {
      console.log(`Creating enrollment for student ${req.student_id}`);
      await supabase.from('live_session_enrollments').insert({
        session_id: sessionId,
        student_id: req.student_id,
        status: 'accepted',
        responded_at: new Date().toISOString()
      });
    } else {
      console.log(`Enrollment already exists for student ${req.student_id}`);
    }
  }
  console.log("Done");
}

fix();
