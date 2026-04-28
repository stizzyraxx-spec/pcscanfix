// POST /functions/v1/checkout
// Creates a Stripe Checkout session and returns the URL.
// If caller is authenticated, prefills email + tags metadata.user_id for the webhook.
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, preflightOrNull } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-10-28.acacia' });

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const priceId = Deno.env.get('STRIPE_PRICE_ID');
  if (!priceId) return jsonResponse({ error: 'STRIPE_PRICE_ID not configured' }, 500);

  const base = Deno.env.get('PUBLIC_URL') || 'https://pcfixscan.com';

  // Try to identify the buyer if they're logged in
  let userEmail: string | null = null;
  let userId: string | null = null;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) { userEmail = user.email; userId = user.id; }
  }

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/buy`,
      customer_creation: 'always',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };
    if (userEmail) params.customer_email = userEmail;
    if (userId)    params.metadata = { user_id: userId };

    const session = await stripe.checkout.sessions.create(params);
    return jsonResponse({ url: session.url });
  } catch (err: any) {
    console.error('[checkout]', err);
    return jsonResponse({ error: err.message }, 500);
  }
});
