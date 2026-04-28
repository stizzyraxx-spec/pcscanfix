// POST /functions/v1/license-validate — { key } → { valid, email? }
// Called by the desktop app at startup and from the LicenseGate screen.
import { serviceClient } from '../_shared/admin.ts';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ valid: false, error: 'Method not allowed' }, 405);

  let body: { key?: string };
  try { body = await req.json(); }
  catch { return jsonResponse({ valid: false, error: 'Bad JSON' }, 400); }

  const key = body.key?.trim().toUpperCase();
  if (!key) return jsonResponse({ valid: false, error: 'Missing key' }, 400);

  const supa = serviceClient();

  const { data, error } = await supa
    .from('licenses')
    .select('key, email, status')
    .eq('key', key)
    .maybeSingle();

  if (error)         { console.error('[validate]', error); return jsonResponse({ valid: false, error: 'Server error' }, 500); }
  if (!data)         return jsonResponse({ valid: false });
  if (data.status !== 'active') return jsonResponse({ valid: false, status: data.status });

  // Best-effort timestamp update
  supa.from('licenses').update({ last_validated_at: new Date().toISOString() }).eq('key', key)
    .then(({ error: e }) => e && console.error('[validate] ts update:', e));

  // Audit
  supa.from('events').insert({
    type: 'license.validated',
    email: data.email,
    metadata: { key },
  }).then(({ error: e }) => e && console.error('[validate] event:', e));

  return jsonResponse({ valid: true, email: data.email });
});
