import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { topicId } = await request.json();
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

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
      .from('topic_purchases')
      .select('id')
      .eq('student_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (existing) return NextResponse.json({ message: 'Already purchased' });

    // Get topic details
    const { data: topic } = await supabaseAuth
      .from('topics')
      .select('price, title, section_id, content_items')
      .eq('id', topicId)
      .single();

    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    // Resolve price from column or content_items metadata fallback
    let price = typeof topic.price === 'number' ? topic.price : parseFloat(topic.price || '0') || 0;
    if (price === 0 && Array.isArray(topic.content_items)) {
      const meta = topic.content_items.find((i: any) => i?.__topic_meta);
      if (meta && meta.price !== undefined && meta.price !== null) {
        price = parseFloat(String(meta.price)) || 0;
      }
    }

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
    await supabaseAuth.from('topic_purchases').insert({
      student_id: user.id,
      topic_id: topicId,
      amount_paid: price,
    });

    // Record transaction
    await supabaseAuth.from('wallet_transactions').insert({
      student_id: user.id,
      type: 'purchase',
      amount: price,
      description: `Purchased lesson: ${topic.title}`,
    });

    return NextResponse.json({ message: 'Topic purchased', newBalance });
  } catch (err: any) {
    console.error('Purchase topic error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
