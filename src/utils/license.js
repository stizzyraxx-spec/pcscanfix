import { supabase } from '../lib/supabase.js';
import { isAdminEmail } from '../lib/supabase.js';

const LICENSE_KEY = 'pcf_license';
const DEVICE_KEY  = 'pcf_device_id';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function getStoredLicense() { return localStorage.getItem(LICENSE_KEY) || ''; }
export function setStoredLicense(key) { localStorage.setItem(LICENSE_KEY, key.trim().toUpperCase()); }
export function clearStoredLicense() { localStorage.removeItem(LICENSE_KEY); }

// Stable per-install identifier for device binding.
// Stored once in localStorage; persists across launches but new install = new ID.
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// Sign out everywhere: clear license, clear Supabase session.
export async function signOutEverywhere() {
  clearStoredLicense();
  try { await supabase.auth.signOut(); } catch {}
}

// Returns { unlocked, reason, email?, expires_at?, message? }
//   unlocked=true  → user can use the app
//   reason: 'admin' | 'license' | 'no_license' | 'expired' | 'revoked' | 'wrong_device' | 'past_due_expired'
export async function checkAccess() {
  // Admin: signed-in Supabase user with admin email (NOT the old client-side bypass)
  const { data: { user } } = await supabase.auth.getUser();
  if (user && isAdminEmail(user.email)) {
    return { unlocked: true, reason: 'admin', email: user.email };
  }

  const license = getStoredLicense();
  if (!license) return { unlocked: false, reason: 'no_license' };

  const result = await validateLicense(license);
  if (result.valid) {
    return { unlocked: true, reason: 'license', email: result.email, expires_at: result.expires_at };
  }

  // Don't auto-clear on transient errors — only on explicit invalidations
  if (['revoked', 'expired', 'past_due_expired', 'not_found'].includes(result.reason)) {
    clearStoredLicense();
  }
  return { unlocked: false, reason: result.reason || 'invalid', message: result.message };
}

export async function validateLicense(key) {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/license-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, device_id: getDeviceId() }),
    });
    return await res.json();
  } catch (err) {
    console.error('[license] validation failed:', err);
    return { valid: false, reason: 'network_error' };
  }
}

export async function startCheckout(tier) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };
    const res  = await fetch(`${FUNCTIONS_URL}/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tier: tier || 'bundle' }),
    });
    const data = await res.json();
    if (!data.url) throw new Error(data.error || 'No checkout URL');

    if (window.electronAPI?.openURL) window.electronAPI.openURL(data.url);
    else window.location.href = data.url;
  } catch (err) {
    alert(`Checkout failed: ${err.message}`);
  }
}
