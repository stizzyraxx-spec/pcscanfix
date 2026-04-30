// POST /functions/v1/support  { email, subject, message }
import { Resend } from 'https://esm.sh/resend@4';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const FROM   = Deno.env.get('RESEND_FROM_EMAIL') || 'PCFixScan <noreply@pcfixscan.com>';

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!checkRateLimit(req, 'support', 5, 60 * 60 * 1000)) return jsonResponse({ error: 'Too many requests' }, 429);

  const { email, subject, message } = await req.json();
  if (!email || !subject || !message) return jsonResponse({ error: 'Missing fields' }, 400);
  if (message.length > 5000)            return jsonResponse({ error: 'Message too long' }, 400);

  try {
    await resend.emails.send({
      from: FROM,
      to: 'support@pcfixscan.com',
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <p><strong>From:</strong> ${escape(email)}</p>
        <p><strong>Subject:</strong> ${escape(subject)}</p>
        <hr>
        <pre style="white-space:pre-wrap;font-family:inherit;">${escape(message)}</pre>
      `,
    });
    return jsonResponse({ ok: true });
  } catch (err: any) {
    console.error('[support]', err);
    return jsonResponse({ error: 'Failed to send' }, 500);
  }
});
