import { supabase } from '../lib/supabase.js';

const PUBLIC_URL = (typeof window !== 'undefined' ? window.location.origin : 'https://pcfixscan.com');

function ok(data)         { return { ok: true,  ...data }; }
function err(error)       { return { ok: false, error: error?.message || String(error) }; }

export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${PUBLIC_URL}/verify-email` },
  });
  if (error) return err(error);
  return ok({ user: data.user });
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return err(error);
  return ok({ user: data.user });
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function me() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch licenses tied to this user (RLS scopes results to current user)
  const { data: licenses } = await supabase
    .from('licenses')
    .select('key, status, created_at')
    .order('created_at', { ascending: false });

  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      createdAt: user.created_at,
    },
    licenses: licenses || [],
  };
}

export async function forgotPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${PUBLIC_URL}/reset-password`,
  });
  if (error) return err(error);
  return ok();
}

// Supabase places a recovery session in the URL; once handled by detectSessionInUrl,
// the user is "logged in" with a recovery token. updateUser() then sets the new password.
export async function resetPassword(_token, newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return err(error);
  await supabase.auth.signOut();
  return ok();
}

// Supabase auto-confirms email when user clicks the link (detectSessionInUrl handles it).
// This stub exists only so the existing /verify-email page doesn't error.
export async function verifyEmailToken(_token) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email_confirmed_at) return ok();
  return err({ message: 'Verification not detected — try clicking the link from your email again' });
}

export async function resendVerify() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err({ message: 'Not signed in' });
  if (user.email_confirmed_at) return ok({ alreadyVerified: true });

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: { emailRedirectTo: `${PUBLIC_URL}/verify-email` },
  });
  if (error) return err(error);
  return ok();
}

export async function changePassword(_currentPassword, newPassword) {
  // Supabase's updateUser doesn't require the current password (the active session
  // is the proof). Passing it through for API compatibility but it's ignored.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return err(error);
  return ok();
}
