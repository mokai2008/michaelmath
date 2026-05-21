import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
  if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
});

async function request(path, method = 'GET', body = null) {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Request failed: ${error}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fix() {
  const requests = await request('booking_requests?status=eq.approved&select=*,admin_availability_slots(*)');
  console.log(`Found ${requests.length} approved requests.`);
  
  for (const req of requests) {
    const scheduledAt = `${req.requested_date}T${req.requested_start_time}`;
    const slot = req.admin_availability_slots;
    
    const existingSessions = await request(`live_sessions?scheduled_at=eq.${encodeURIComponent(scheduledAt)}&title=eq.1-on-1%20Tutoring%20Session&select=id`);
    let sessionId = existingSessions?.[0]?.id;
    
    if (!sessionId) {
      console.log(`Creating session for request ${req.id}`);
      // to get the id, we need to POST with Prefer: return=representation
      const created = await fetch(`${supabaseUrl}/rest/v1/live_sessions`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: '1-on-1 Tutoring Session',
          scheduled_at: scheduledAt,
          duration_minutes: slot?.duration_minutes || 60,
          price: slot?.price || 0,
        })
      });
      const createdData = await created.json();
      sessionId = createdData[0].id;
    }
    
    const enrollments = await request(`live_session_enrollments?session_id=eq.${sessionId}&student_id=eq.${req.student_id}&select=id`);
    if (!enrollments || enrollments.length === 0) {
      console.log(`Creating enrollment for student ${req.student_id}`);
      await request('live_session_enrollments', 'POST', {
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

fix().catch(console.error);
