// POST /functions/v1/admin-revoke-license  { key, status: 'active' | 'revoked' }
import { requireAdmin, serviceClient } from '../_shared/admin.ts';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse({ error: 'Admin auth required' }, 401);

  const { key, status } = await req.json();
  if (!key || !['active', 'revoked'].includes(status)) {
    return jsonResponse({ error: 'Invalid input' }, 400);
  }

  const supa = serviceClient();
  const { error } = await supa.from('licenses').update({ status }).eq('key', key);
  if (error) return jsonResponse({ error: error.message }, 500);

  // Audit
  await supa.from('events').insert({
    type: status === 'revoked' ? 'license.revoked' : 'license.reactivated',
    email: admin.email,
    metadata: { key },
  });

  return jsonResponse({ ok: true });
});
