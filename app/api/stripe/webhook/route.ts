import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2024-12-18.acacia' as any });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service_role_dummy_key'
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amount = parseFloat(session.metadata?.amount || '0');

    if (userId && amount > 0) {
      // 1. Credit wallet
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      const newBalance = (profile?.wallet_balance || 0) + amount;
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      // 2. Record transaction
      await supabaseAdmin.from('wallet_transactions').insert({
        student_id: userId,
        type: 'topup',
        amount,
        description: `Stripe top-up: $${amount}`,
      });

      // 3. Notify student
      await supabaseAdmin.from('notifications').insert({
        student_id: userId,
        title: 'Wallet Topped Up!',
        message: `$${amount} has been added to your wallet. New balance: $${newBalance.toFixed(2)}`,
        type: 'system',
      });
    }
  }

  return NextResponse.json({ received: true });
}
