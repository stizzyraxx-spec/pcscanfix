// POST /functions/v1/checkout — creates a Stripe Checkout subscription session
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-10-28.acacia' });

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!checkRateLimit(req, 'checkout', 10, 60_000)) return jsonResponse({ error: 'Too many checkout attempts' }, 429);

  // Tier → Stripe price ID. Falls back to the legacy single STRIPE_PRICE_ID when a
  // tier-specific env var isn't set, so the flow stays live before all four
  // per-tier prices have been provisioned in Stripe.
  let tier = 'bundle';
  try {
    const body = await req.clone().json();
    if (typeof body?.tier === 'string') tier = body.tier;
  } catch {}
  const tierEnvMap: Record<string, string> = {
    cleaner:     'STRIPE_PRICE_ID_CLEANER',
    privacy:     'STRIPE_PRICE_ID_PRIVACY',
    performance: 'STRIPE_PRICE_ID_PERFORMANCE',
    bundle:      'STRIPE_PRICE_ID_BUNDLE',
  };
  const priceId = Deno.env.get(tierEnvMap[tier] || 'STRIPE_PRICE_ID_BUNDLE')
    || Deno.env.get('STRIPE_PRICE_ID');
  if (!priceId) return jsonResponse({ error: 'No Stripe price configured' }, 500);

  const base = Deno.env.get('PUBLIC_URL') || 'https://pcfixscan.com';

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
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/buy`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };
    if (userEmail) params.customer_email = userEmail;
    params.metadata = { tier, ...(userId ? { user_id: userId } : {}) };
    params.subscription_data = { metadata: { tier, ...(userId ? { user_id: userId } : {}) } };

    const session = await stripe.checkout.sessions.create(params);
    return jsonResponse({ url: session.url });
  } catch (err: any) {
    console.error('[checkout]', err);
    return jsonResponse({ error: err.message }, 500);
  }
});
