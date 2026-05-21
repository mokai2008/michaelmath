import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated supabase client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify user exists
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Check admin using the DB function (SECURITY DEFINER, reliable)
    const { data: isAdmin, error: rpcError } = await supabaseAuth.rpc('is_admin');
    if (rpcError || !isAdmin) {
      return NextResponse.json({ error: 'Admin only', debug: rpcError?.message }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, amount, description } = body;

    if (!studentId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'studentId and positive amount are required' }, { status: 400 });
    }

    // Get current balance
    const { data: student, error: fetchErr } = await supabaseAuth
      .from('profiles')
      .select('wallet_balance, full_name')
      .eq('id', studentId)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: 'Student not found: ' + (fetchErr?.message || '') }, { status: 404 });
    }

    const newBalance = (student.wallet_balance || 0) + amount;

    // Update balance
    const { error: updateErr } = await supabaseAuth
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', studentId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update balance: ' + updateErr.message }, { status: 500 });
    }

    // Record transaction
    const { error: txErr } = await supabaseAuth.from('wallet_transactions').insert({
      student_id: studentId,
      type: 'topup',
      amount,
      description: description || 'Manual top-up by admin',
    });
    if (txErr) console.error('Transaction record error:', txErr);

    // Notify student
    await supabaseAuth.from('notifications').insert({
      student_id: studentId,
      title: 'Wallet Credited!',
      message: `$${amount.toFixed(2)} has been added to your wallet. New balance: $${newBalance.toFixed(2)}`,
      type: 'system',
    });

    return NextResponse.json({ message: 'Wallet credited', newBalance, studentName: student.full_name });
  } catch (err: any) {
    console.error('Admin credit error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
