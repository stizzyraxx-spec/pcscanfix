// GET  /functions/v1/admin-data?resource=users|licenses|events|stats
// Admin-only (email must be in ADMIN_EMAILS env var on the function).
import { requireAdmin, serviceClient } from '../_shared/admin.ts';
import { jsonResponse, preflightOrNull } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflightOrNull(req); if (pre) return pre;

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse({ error: 'Admin auth required' }, 401);

  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');
  const limit    = Math.min(parseInt(url.searchParams.get('limit')  || '200', 10), 500);
  const search   = url.searchParams.get('search') || '';
  const filter   = url.searchParams.get('filter') || '';

  const supa = serviceClient();

  if (resource === 'stats') {
    const [usersRes, activeRes, revokedRes, recentRes] = await Promise.all([
      supa.auth.admin.listUsers({ perPage: 1 }),
      supa.from('licenses').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supa.from('licenses').select('id', { count: 'exact', head: true }).eq('status', 'revoked'),
      supa.from('licenses').select('id', { count: 'exact', head: true })
        .gt('created_at', new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
    ]);
    return jsonResponse({
      users: usersRes.data?.total ?? 0,
      activeLicenses: activeRes.count ?? 0,
      revokedLicenses: revokedRes.count ?? 0,
      last30Days: recentRes.count ?? 0,
    });
  }

  if (resource === 'users') {
    // List up to 200 users via admin.listUsers + count licenses per user
    const { data: usersData } = await supa.auth.admin.listUsers({ page: 1, perPage: limit });
    const users = (usersData?.users || [])
      .filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()))
      .map(u => ({
        id: u.id,
        email: u.email,
        email_verified: !!u.email_confirmed_at,
        created_at: u.created_at,
      }));

    // Batch license counts
    const ids = users.map(u => u.id);
    const { data: lic } = await supa.from('licenses').select('user_id').in('user_id', ids);
    const counts: Record<string, number> = {};
    (lic || []).forEach(l => { if (l.user_id) counts[l.user_id] = (counts[l.user_id] || 0) + 1; });

    return jsonResponse({ users: users.map(u => ({ ...u, license_count: counts[u.id] || 0 })) });
  }

  if (resource === 'licenses') {
    let q = supa.from('licenses')
      .select('key, email, user_id, status, created_at, last_validated_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (search) q = q.or(`key.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ licenses: data });
  }

  if (resource === 'events') {
    let q = supa.from('events')
      .select('id, type, email, ip, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (filter) q = q.eq('type', filter);
    if (search) q = q.ilike('email', `%${search}%`);
    const { data, error } = await q;
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ events: data });
  }

  return jsonResponse({ error: 'Unknown resource' }, 400);
});
