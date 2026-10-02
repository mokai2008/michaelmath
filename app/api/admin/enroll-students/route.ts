import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify user exists and is admin
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: isAdmin } = await supabaseAuth.rpc('is_admin');
    if (!isAdmin) {
      const { data: profile } = await supabaseAuth
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && user.email !== 'mokai2008@gmail.com') {
        return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { action = 'enroll_all_first_course', studentId, courseId } = body;

    // Use admin client if service role key available, otherwise fall back to authenticated client
    const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabaseAuth;

    // ACTION 1: Enroll a single student in a specific course
    if (action === 'enroll_single') {
      if (!studentId) {
        return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
      }

      let targetCourseId = courseId;
      if (!targetCourseId) {
        const { data: firstCourse } = await dbClient
          .from('courses')
          .select('id, title')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!firstCourse) {
          return NextResponse.json({ error: 'No courses found in database' }, { status: 404 });
        }
        targetCourseId = firstCourse.id;
      }

      const { data: enrollment, error: enrError } = await dbClient
        .from('enrollments')
        .upsert(
          { student_id: studentId, course_id: targetCourseId },
          { onConflict: 'student_id,course_id' }
        )
        .select()
        .single();

      if (enrError) {
        return NextResponse.json({ error: enrError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Student enrolled successfully',
        enrollment
      });
    }

    // ACTION 2: Unenroll a student from a course
    if (action === 'unenroll_single') {
      if (!studentId || !courseId) {
        return NextResponse.json({ error: 'studentId and courseId are required' }, { status: 400 });
      }

      const { error: delError } = await dbClient
        .from('enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Student unenrolled successfully'
      });
    }

    // ACTION 3: Enroll ALL students into the 1st course
    const { data: firstCourse, error: fcErr } = await dbClient
      .from('courses')
      .select('id, title')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fcErr || !firstCourse) {
      return NextResponse.json({ error: 'No course found in the database.' }, { status: 404 });
    }

    // Fetch all student profiles
    const { data: profiles, error: pErr } = await dbClient
      .from('profiles')
      .select('id, full_name, email')
      .neq('role', 'admin');

    if (pErr) {
      return NextResponse.json({ error: 'Failed to fetch profiles: ' + pErr.message }, { status: 500 });
    }

    const nonAdminStudents = (profiles || []).filter((p: any) => p.email !== 'mokai2008@gmail.com');

    if (nonAdminStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No registered students found to enroll.',
        enrolledCount: 0
      });
    }

    const rows = nonAdminStudents.map((s: any) => ({
      student_id: s.id,
      course_id: firstCourse.id,
    }));

    const { error: insertErr } = await dbClient
      .from('enrollments')
      .upsert(rows, { onConflict: 'student_id,course_id' });

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to enroll students: ' + insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Enrolled ${nonAdminStudents.length} students into "${firstCourse.title}" successfully.`,
      courseTitle: firstCourse.title,
      courseId: firstCourse.id,
      enrolledCount: nonAdminStudents.length
    });

  } catch (err: any) {
    console.error('Enroll students API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
