import { createClient } from '@supabase/supabase-js';

const url      = import.meta.env.VITE_SUPABASE_URL;
const anonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles email-verify + reset-password redirects
  },
});

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function isAdminEmail(email) {
  const allow = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return email && allow.includes(email.toLowerCase());
}
