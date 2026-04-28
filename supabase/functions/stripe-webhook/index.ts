// POST /functions/v1/stripe-webhook
// Handles checkout.session.completed: generates license, links to user (creating one if needed),
// emails the customer. Uses service_role to write the license.
import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { Resend } from 'https://esm.sh/resend@4';
import { serviceClient } from '../_shared/admin.ts';
import { generateLicenseKey } from '../_shared/license.ts';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-10-28.acacia' });
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const PUBLIC_URL = Deno.env.get('PUBLIC_URL') || 'https://pcfixscan.com';
const FROM = Deno.env.get('RESEND_FROM_EMAIL') || 'PCFixScan <noreply@pcfixscan.com>';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err: any) {
    console.error('[webhook] invalid sig:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    if (!email) return new Response(JSON.stringify({ received: true, warning: 'no email' }), { status: 200 });

    const customerId = (session.customer as string) || null;
    const sessionId  = session.id;
    const providedUserId = session.metadata?.user_id || null;

    const supa = serviceClient();

    // Resolve user — prefer provided user_id, else look up by email, else create one
    let userId: string | null = providedUserId;

    if (!userId) {
      const { data: existing } = await supa.auth.admin.listUsers();
      const found = existing?.users?.find(u => u.email?.toLowerCase() === email);
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: createErr } = await supa.auth.admin.createUser({
          email,
          email_confirm: true,
          // Random throwaway password — the buyer will reset via the email link
          password: crypto.randomUUID() + crypto.randomUUID(),
        });
        if (createErr) { console.error('[webhook] createUser:', createErr); }
        else userId = created.user?.id ?? null;
      }
    }

    const licenseKey = generateLicenseKey();
    const { error: insertErr } = await supa.from('licenses').upsert({
      key: licenseKey,
      email,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_session_id: sessionId,
      status: 'active',
    }, { onConflict: 'stripe_session_id' });

    if (insertErr) {
      console.error('[webhook] license insert:', insertErr);
      return new Response('License insert failed', { status: 500 });
    }

    // Generate a "set password" magic link for new buyers
    let setPwLink: string | null = null;
    if (userId) {
      const { data: link } = await supa.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${PUBLIC_URL}/reset-password` },
      });
      setPwLink = link?.properties?.action_link ?? null;
    }

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Your PCFixScan license key',
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h1 style="color:#0078d4;margin:0 0 12px;">Thanks for your purchase!</h1>
            <p style="color:#333;line-height:1.6;">Your PCFixScan license key:</p>
            <pre style="font-size:18px;letter-spacing:0.5px;padding:16px;background:#f3f3f3;border-radius:8px;border:1px solid #d1d1d1;text-align:center;font-family:'SF Mono',Menlo,monospace;">${licenseKey}</pre>
            <p style="color:#555;line-height:1.6;">Open PCFixScan, click <strong>Login</strong> in the top-right, and paste this key into the License field.</p>
            ${setPwLink ? `
              <div style="background:#e5f1fb;border:1px solid #9dc8eb;border-radius:8px;padding:14px 18px;margin-top:18px;">
                <p style="margin:0 0 8px;font-weight:600;color:#0078d4;">Set up your account</p>
                <p style="margin:0 0 12px;color:#555;font-size:0.92rem;line-height:1.5;">We created an account so you can manage your license. Choose a password:</p>
                <a href="${setPwLink}" style="background:#0078d4;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Set password</a>
              </div>
            ` : ''}
            <p style="margin-top:24px;">
              <a href="${PUBLIC_URL}/download" style="background:#0078d4;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Download PCFixScan</a>
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error('[webhook] email send failed:', err);
    }

    // Audit log
    await supa.from('events').insert({
      type: 'purchase.completed',
      user_id: userId,
      email,
      metadata: { license_key: licenseKey, stripe_session_id: sessionId },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
