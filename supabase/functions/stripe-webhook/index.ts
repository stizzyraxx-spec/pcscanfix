// POST /functions/v1/stripe-webhook
// Handles full subscription lifecycle:
//  - checkout.session.completed     → create user (if new), generate license, email it
//  - invoice.paid                   → extend license expiry (renewal)
//  - invoice.payment_failed         → mark past_due
//  - customer.subscription.deleted  → revoke license
//  - customer.subscription.updated  → reflect status change
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { Resend } from 'https://esm.sh/resend@4';
import { serviceClient } from '../_shared/admin.ts';
import { generateLicenseKey } from '../_shared/license.ts';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-10-28.acacia' });
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const PUBLIC_URL = Deno.env.get('PUBLIC_URL') || 'https://pcfixscan.com';
const FROM = Deno.env.get('RESEND_FROM_EMAIL') || 'PCFixScan <noreply@pcfixscan.com>';

async function ensureUser(supa: ReturnType<typeof serviceClient>, email: string, providedUserId: string | null) {
  if (providedUserId) {
    const { data } = await supa.auth.admin.listUsers();
    const found = data?.users?.find(u => u.id === providedUserId);
    if (found) return { user: found, isNew: false };
  }
  const { data: existing } = await supa.auth.admin.listUsers();
  const found = existing?.users?.find(u => u.email?.toLowerCase() === email);
  if (found) return { user: found, isNew: false };

  const { data: created } = await supa.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
  });
  return { user: created.user!, isNew: true };
}

async function logEvent(supa: any, type: string, email: string | null, userId: string | null, metadata: any) {
  await supa.from('events').insert({ type, email, user_id: userId, metadata }).catch((e: any) => console.error('[event]', e));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supa = serviceClient();

  try {
    switch (event.type) {
      // ─── New subscription: provision license + send key ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
        if (!email) break;

        const subId = session.subscription as string;
        const sub   = await stripe.subscriptions.retrieve(subId);
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();

        const { user, isNew } = await ensureUser(supa, email, session.metadata?.user_id || null);
        const licenseKey = generateLicenseKey();

        await supa.from('licenses').upsert({
          key: licenseKey,
          email,
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_session_id: session.id,
          subscription_id: subId,
          status: 'active',
          expires_at: expiresAt,
        }, { onConflict: 'stripe_session_id' });

        let setPwLink: string | null = null;
        if (isNew) {
          const { data: link } = await supa.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: `${PUBLIC_URL}/reset-password` },
          });
          setPwLink = link?.properties?.action_link ?? null;
        }

        await resend.emails.send({
          from: FROM, to: email,
          subject: 'Your PCFixScan license key',
          html: `
            <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h1 style="color:#0078d4;margin:0 0 12px;">Welcome to PCFixScan!</h1>
              <p style="color:#333;line-height:1.6;">Your license key:</p>
              <pre style="font-size:18px;letter-spacing:0.5px;padding:16px;background:#f3f3f3;border-radius:8px;border:1px solid #d1d1d1;text-align:center;font-family:'SF Mono',Menlo,monospace;">${licenseKey}</pre>
              <p style="color:#555;line-height:1.6;">Subscription active until <strong>${new Date(expiresAt).toLocaleDateString()}</strong>. Renews automatically — manage or cancel anytime in your account.</p>
              ${setPwLink ? `<p><a href="${setPwLink}" style="background:#0078d4;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Set your password</a></p>` : ''}
              <p style="margin-top:18px;"><a href="${PUBLIC_URL}/download" style="color:#0078d4;font-weight:600;">Download PCFixScan</a> · <a href="${PUBLIC_URL}/account" style="color:#0078d4;font-weight:600;">Manage subscription</a></p>
            </div>
          `,
        }).catch((e: any) => console.error('[email]', e));

        await logEvent(supa, 'purchase.completed', email, user.id, { license_key: licenseKey, subscription_id: subId });
        break;
      }

      // ─── Renewal: extend license expiry to new period_end ────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await supa.from('licenses')
          .update({ expires_at: expiresAt, status: 'active' })
          .eq('subscription_id', subId);
        await logEvent(supa, 'subscription.renewed', invoice.customer_email, null, { subscription_id: subId, expires_at: expiresAt });
        break;
      }

      // ─── Payment failure: mark past_due (license still works briefly) ────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;
        await supa.from('licenses').update({ status: 'past_due' }).eq('subscription_id', subId);
        await logEvent(supa, 'subscription.payment_failed', invoice.customer_email, null, { subscription_id: subId });
        break;
      }

      // ─── Subscription canceled / ended: revoke license ───────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supa.from('licenses')
          .update({ status: 'revoked', expires_at: new Date().toISOString() })
          .eq('subscription_id', sub.id);
        await logEvent(supa, 'subscription.canceled', null, null, { subscription_id: sub.id });
        break;
      }

      // ─── Status updates (active → past_due, etc.) ────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        const status = sub.status === 'active' ? 'active'
                     : sub.status === 'past_due' ? 'past_due'
                     : sub.status === 'canceled' ? 'revoked'
                     : 'inactive';
        await supa.from('licenses')
          .update({ expires_at: expiresAt, status })
          .eq('subscription_id', sub.id);
        await logEvent(supa, 'subscription.updated', null, null, { subscription_id: sub.id, status });
        break;
      }
    }
  } catch (err: any) {
    console.error('[webhook handler]', event.type, err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
