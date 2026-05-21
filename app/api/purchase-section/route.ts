import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { sectionId } = await request.json();
    if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');

    // Use authenticated client with RLS
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Check if already purchased
    const { data: existing } = await supabaseAuth
      .from('section_purchases')
      .select('id')
      .eq('student_id', user.id)
      .eq('section_id', sectionId)
      .maybeSingle();

    if (existing) return NextResponse.json({ message: 'Already purchased' });

    // Get section price
    const { data: section } = await supabaseAuth
      .from('sections')
      .select('price, title, course_id')
      .eq('id', sectionId)
      .single();

    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const price = section.price || 0;

    // Get wallet balance
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    const balance = profile?.wallet_balance || 0;
    if (balance < price) {
      return NextResponse.json({ error: 'Insufficient wallet balance', balance, price }, { status: 400 });
    }

    // Deduct from wallet
    const newBalance = balance - price;
    await supabaseAuth.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);

    // Record purchase
    await supabaseAuth.from('section_purchases').insert({
      student_id: user.id,
      section_id: sectionId,
      amount_paid: price,
    });

    // Record transaction
    await supabaseAuth.from('wallet_transactions').insert({
      student_id: user.id,
      type: 'purchase',
      amount: price,
      description: `Purchased section: ${section.title}`,
    });

    return NextResponse.json({ message: 'Section purchased', newBalance });
  } catch (err: any) {
    console.error('Purchase error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
