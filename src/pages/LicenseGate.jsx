import { useState } from 'react';
import { setStoredLicense, validateLicense, startCheckout } from '../utils/license.js';

const REASONS = {
  no_license:       { title: 'Subscribe to clean',          body: 'Scanning is free. Subscribe or activate a license to remove the items found.' },
  expired:          { title: 'Subscription expired',        body: 'Your subscription has ended. Renew to continue.' },
  past_due_expired: { title: 'Payment failed',              body: 'We were unable to charge your card. Update payment to restore access.' },
  revoked:          { title: 'License revoked',             body: 'This license is no longer active. Contact support if you believe this is a mistake.' },
  wrong_device:     { title: 'License in use elsewhere',    body: 'This license is already activated on another device. Contact support to transfer.' },
  invalid:          { title: 'Activate PCFixScan',          body: 'Enter your license key to start using the app.' },
  network_error:    { title: 'Couldn’t verify license', body: 'No internet connection. Reconnect and try again.' },
};

export default function LicenseGate({ reason = 'no_license', message, onUnlock }) {
  const meta = REASONS[reason] || REASONS.no_license;

  const [key, setKey]     = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  async function activate(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const trimmed = key.trim().toUpperCase();
    const r = await validateLicense(trimmed);
    if (r.valid) {
      setStoredLicense(trimmed);
      onUnlock?.();
    } else {
      const map = {
        not_found:   'That license key isn’t recognized.',
        expired:     'This license has expired.',
        revoked:     'This license has been revoked.',
        wrong_device:'This license is bound to another device.',
        past_due_expired: 'Subscription is past due. Update payment first.',
      };
      setErr(map[r.reason] || r.message || 'License could not be validated. Try again.');
    }
    setBusy(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>{meta.title}</h1>
        <p style={s.sub}>{message || meta.body}</p>

        <form onSubmit={activate} style={{ marginTop: 20 }}>
          <label style={s.label}>License key</label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="PCFX-XXXX-XXXX-XXXX-XXXX"
            style={s.input}
            autoFocus
          />
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={busy || !key} style={{ ...s.btn, opacity: (busy || !key) ? 0.5 : 1 }}>
            {busy ? 'Validating…' : 'Activate'}
          </button>
        </form>

        <div style={s.divider}>or</div>

        <button onClick={startCheckout} style={s.buyBtn}>Subscribe — $19.99/month</button>

        <p style={s.foot}>
          Lost your key? Email <a href="mailto:support@pcfixscan.com" style={{ color: '#0078d4' }}>support@pcfixscan.com</a>.
        </p>
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card:    { width: 420, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: 36, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  title:   { fontSize: '1.3rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 8px' },
  sub:     { fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: 1.6 },
  label:   { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:   { width: '100%', height: 38, padding: '0 12px', fontSize: '0.92rem', fontFamily: 'SF Mono, Menlo, monospace', border: '1px solid #c8c8c8', borderRadius: 4, boxSizing: 'border-box', outline: 'none', letterSpacing: '0.5px' },
  err:     { marginTop: 10, padding: '8px 12px', background: '#fde7e9', borderLeft: '4px solid #d13438', borderRadius: 4, fontSize: '0.8rem', color: '#9b1c20' },
  btn:     { width: '100%', height: 40, marginTop: 14, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
  divider: { textAlign: 'center', color: '#999', fontSize: '0.78rem', margin: '20px 0', textTransform: 'uppercase', letterSpacing: '0.06em' },
  buyBtn:  { width: '100%', height: 40, background: '#fff', color: '#0078d4', border: '1px solid #0078d4', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
  foot:    { fontSize: '0.72rem', color: '#999', marginTop: 18, textAlign: 'center' },
};
