import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Returns the authenticated user if their email is in ADMIN_EMAILS, else null.
export async function requireAdmin(req: Request): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const allow = (Deno.env.get('ADMIN_EMAILS') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allow.includes(user.email.toLowerCase())) return null;

  return { id: user.id, email: user.email };
}

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
