import { useState } from 'react';
import { setStoredLicense, validateLicense, startCheckout, trialDaysRemaining } from '../utils/license.js';

export default function LicenseGate({ trialExpired, onUnlock }) {
  const [key, setKey]       = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');

  async function activate(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const trimmed = key.trim().toUpperCase();
    const ok = await validateLicense(trimmed);
    if (ok) {
      setStoredLicense(trimmed);
      onUnlock?.();
    } else {
      setErr('That license key isn’t valid. Check your email or contact support.');
    }
    setBusy(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>{trialExpired ? 'Trial expired' : 'Activate PCFixScan'}</h1>
        <p style={s.sub}>
          {trialExpired
            ? 'Your 7-day trial has ended. Enter a license key to continue, or purchase one below.'
            : `Your trial has ${trialDaysRemaining()} day${trialDaysRemaining() === 1 ? '' : 's'} left. Activate any time.`}
        </p>

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

        <button onClick={startCheckout} style={s.buyBtn}>Buy a license — $19.99</button>

        <p style={s.foot}>Lost your key? Email support@pcfixscan.com with your purchase email.</p>
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
