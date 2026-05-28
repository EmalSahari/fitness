import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Next.js App Router: must opt out of body parsing so we can verify the Stripe signature
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' });
}

async function setProStatus(supabaseUserId: string, isPro: boolean, stripeSubscriptionId?: string) {
  const supabase = createClient();
  await supabase
    .from('profiles')
    .update({
      is_pro: isPro,
      stripe_subscription_id: stripeSubscriptionId ?? null,
    })
    .eq('id', supabaseUserId);
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sub = event.data.object as Stripe.Subscription;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      const userId =
        (sub.metadata?.supabase_user_id as string | undefined) ??
        (await getUserIdFromCustomer(sub.customer as string));
      if (userId) {
        await setProStatus(userId, isActive, sub.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const userId =
        (sub.metadata?.supabase_user_id as string | undefined) ??
        (await getUserIdFromCustomer(sub.customer as string));
      if (userId) {
        await setProStatus(userId, false);
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
