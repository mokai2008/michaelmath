import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key to bypass RLS for enrollment insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Regular client to verify the user's session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Get the auth token from the request header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already enrolled', enrollment: existing });
    }

    // Insert enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: user.id,
        course_id: courseId,
      })
      .select()
      .single();

    if (enrollError) {
      console.error('Enrollment error:', enrollError);
      return NextResponse.json({ error: enrollError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Enrolled successfully', enrollment });
  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
