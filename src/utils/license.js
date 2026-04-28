import { supabase } from '../lib/supabase.js';

const TRIAL_DAYS  = 7;
const TRIAL_KEY   = 'pcf_first_launch';
const LICENSE_KEY = 'pcf_license';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function getStoredLicense() { return localStorage.getItem(LICENSE_KEY) || ''; }
export function setStoredLicense(key) { localStorage.setItem(LICENSE_KEY, key.trim().toUpperCase()); }
export function clearStoredLicense() { localStorage.removeItem(LICENSE_KEY); }

export function getTrialStartedAt() {
  let t = localStorage.getItem(TRIAL_KEY);
  if (!t) { t = String(Date.now()); localStorage.setItem(TRIAL_KEY, t); }
  return parseInt(t, 10);
}
export function trialDaysRemaining() {
  const elapsed = Date.now() - getTrialStartedAt();
  const remaining = TRIAL_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
export function isTrialExpired() { return trialDaysRemaining() === 0; }

export function isAdminSession() { return !!sessionStorage.getItem('pcf_admin'); }

export async function checkAccess() {
  if (isAdminSession()) return { unlocked: true, reason: 'admin' };

  const license = getStoredLicense();
  if (license) {
    const valid = await validateLicense(license);
    if (valid) return { unlocked: true, reason: 'license' };
    clearStoredLicense();
  }

  if (!isTrialExpired()) {
    return { unlocked: true, reason: 'trial', daysLeft: trialDaysRemaining() };
  }
  return { unlocked: false, reason: 'expired' };
}

export async function validateLicense(key) {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/license-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    return !!data.valid;
  } catch (err) {
    console.error('[license] validation failed:', err);
    return false;
  }
}

export async function startCheckout() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };
    const res = await fetch(`${FUNCTIONS_URL}/checkout`, { method: 'POST', headers });
    const data = await res.json();
    if (!data.url) throw new Error(data.error || 'No checkout URL');

    if (window.electronAPI?.openURL) window.electronAPI.openURL(data.url);
    else window.location.href = data.url;
  } catch (err) {
    alert(`Checkout failed: ${err.message}`);
  }
}
