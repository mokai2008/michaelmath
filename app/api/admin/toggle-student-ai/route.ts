import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify user exists
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify user is an admin
    const { data: isAdmin, error: rpcError } = await supabaseAuth.rpc('is_admin');
    if (rpcError || !isAdmin) {
      // Fallback check against profiles table
      const { data: profile } = await supabaseAuth
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { studentId, aiEnabled, reason, dailyLimit } = body;

    if (!studentId || typeof aiEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'studentId (string) and aiEnabled (boolean) are required' }, 
        { status: 400 }
      );
    }

    // Check student existence
    const { data: student, error: fetchErr } = await supabaseAuth
      .from('profiles')
      .select('id, full_name, email, ai_enabled')
      .eq('id', studentId)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Prepare update payload
    const updatePayload: Record<string, any> = {
      ai_enabled: aiEnabled,
    };

    if (reason !== undefined) {
      updatePayload.ai_disabled_reason = reason;
    }
    if (dailyLimit !== undefined) {
      updatePayload.ai_daily_limit = dailyLimit === '' || dailyLimit === null ? null : Number(dailyLimit);
    }

    // Update profile
    const { error: updateErr } = await supabaseAuth
      .from('profiles')
      .update(updatePayload)
      .eq('id', studentId);

    if (updateErr) {
      return NextResponse.json(
        { error: 'Failed to update student AI settings: ' + updateErr.message }, 
        { status: 500 }
      );
    }

    // Send notification to the student about the status change
    try {
      const notificationTitle = aiEnabled ? 'AI Assistant Enabled 🤖' : 'AI Assistant Access Paused 🔒';
      const notificationMessage = aiEnabled
        ? 'Your AI Assistant access has been enabled by Michael Gad. You can now ask math questions anytime from your dashboard!'
        : (reason || 'Your AI Assistant access has been paused by the instructor. Please contact Michael Gad if you need assistance.');

      await supabaseAuth.from('notifications').insert({
        student_id: studentId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'system',
      });
    } catch (notifErr) {
      console.warn('Could not create notification for AI status update:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `AI access for ${student.full_name || student.email} has been ${aiEnabled ? 'enabled' : 'stopped'}.`,
      studentId,
      aiEnabled,
      dailyLimit: updatePayload.ai_daily_limit ?? null,
    });

  } catch (error: any) {
    console.error('Toggle Student AI error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
