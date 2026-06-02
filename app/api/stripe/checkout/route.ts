import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'Stripe not configured — missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID' }, { status: 503 });
  }

  const stripe = getStripe();

  // Derive the base URL: prefer the explicit env var, fall back to the
  // incoming request's own origin (always correct, always HTTPS in production).
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appUrl = (envUrl?.startsWith('http') ? envUrl : new URL(req.url).origin).replace(/\/$/, '');

  console.log('[stripe/checkout] appUrl:', appUrl, '| priceId:', process.env.STRIPE_PRICE_ID);

  try {
    // Reuse existing customer if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, name')
      .eq('id', user.id)
      .single();

    let customerId = (profile as { stripe_customer_id?: string; name?: string } | null)?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: (profile as { name?: string } | null)?.name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      ui_mode: 'hosted_page',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/account?upgraded=1`,
      cancel_url: `${appUrl}/account?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const e = err as { message?: string; param?: string; type?: string; statusCode?: number };
    const detail = `${e.message ?? String(err)} | param: ${e.param ?? 'n/a'} | type: ${e.type ?? 'n/a'} | appUrl: ${appUrl}`;
    console.error('[stripe/checkout]', detail);
    return NextResponse.json({ error: detail }, { status: e.statusCode ?? 500 });
  }
}
