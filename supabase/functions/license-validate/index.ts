// POST /functions/v1/license-validate  { key, device_id? }
// Returns { valid, reason?, email?, expires_at? }
// reason: 'not_found' | 'expired' | 'revoked' | 'past_due' | 'wrong_device'
import { serviceClient } from '../_shared/admin.ts';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ valid: false, reason: 'bad_method' }, 405);
  // 30 validations per IP per minute — enough for legitimate retries, blocks scraping
  if (!checkRateLimit(req, 'license-validate', 30, 60_000)) {
    return jsonResponse({ valid: false, reason: 'rate_limited' }, 429);
  }

  let body: { key?: string; device_id?: string };
  try { body = await req.json(); } catch { return jsonResponse({ valid: false, reason: 'bad_json' }, 400); }

  const key       = body.key?.trim().toUpperCase();
  const deviceId  = body.device_id?.trim() || null;
  if (!key) return jsonResponse({ valid: false, reason: 'missing_key' }, 400);

  const supa = serviceClient();

  const { data, error } = await supa
    .from('licenses')
    .select('key, email, user_id, status, expires_at, device_id, activated_at')
    .eq('key', key)
    .maybeSingle();

  if (error) { console.error('[validate]', error); return jsonResponse({ valid: false, reason: 'server_error' }, 500); }
  if (!data)                                                      return jsonResponse({ valid: false, reason: 'not_found' });
  if (data.status === 'revoked')                                  return jsonResponse({ valid: false, reason: 'revoked' });
  if (data.expires_at && new Date(data.expires_at) < new Date())  return jsonResponse({ valid: false, reason: 'expired', expires_at: data.expires_at });

  // past_due: 3-day grace period from expires_at, then expired
  if (data.status === 'past_due') {
    const grace = new Date(new Date(data.expires_at!).getTime() + 3 * 86400 * 1000);
    if (new Date() > grace) return jsonResponse({ valid: false, reason: 'past_due_expired' });
  }

  // Device binding — enforced for paid licenses only.
  // Master admin license has no device_id binding, so admins can use it anywhere.
  const isAdminLicense = key.startsWith('PCFX-ADMI');
  if (!isAdminLicense && deviceId) {
    if (!data.device_id) {
      // First activation — bind this device
      await supa.from('licenses')
        .update({ device_id: deviceId, activated_at: new Date().toISOString() })
        .eq('key', key);
      await supa.from('events').insert({
        type: 'license.activated',
        email: data.email,
        user_id: data.user_id,
        metadata: { key, device_id: deviceId },
      });
    } else if (data.device_id !== deviceId) {
      await supa.from('events').insert({
        type: 'license.wrong_device',
        email: data.email,
        user_id: data.user_id,
        metadata: { key, attempted_device: deviceId, bound_device: data.device_id },
      });
      return jsonResponse({
        valid: false,
        reason: 'wrong_device',
        message: 'This license is already activated on another device. Contact support to transfer.',
      });
    }
  }

  // Best-effort: bump last_validated_at
  supa.from('licenses').update({ last_validated_at: new Date().toISOString() }).eq('key', key)
    .then(({ error: e }) => e && console.error('[validate ts]', e));

  await supa.from('events').insert({
    type: 'license.validated',
    email: data.email,
    user_id: data.user_id,
    metadata: { key, device_id: deviceId },
  });

  return jsonResponse({
    valid: true,
    email: data.email,
    expires_at: data.expires_at,
    status: data.status,
  });
});
