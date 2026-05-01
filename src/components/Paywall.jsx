import { useState } from 'react';
import { setStoredLicense, validateLicense, startCheckout } from '../utils/license.js';

export const TIERS = [
  {
    id: 'cleaner',
    name: 'Cleaner Pack',
    price: '$7.99',
    blurb: 'Reclaim disk space',
    includes: ['Junk file cleaner', 'Browser cache cleanup', 'Duplicate finder', 'Large file manager'],
  },
  {
    id: 'privacy',
    name: 'Privacy & Security',
    price: '$9.99',
    blurb: 'Lock down your machine',
    includes: ['Privacy cleaner (history, cookies, trackers)', 'Heuristic threat scanner', 'Secure-delete suspicious files'],
  },
  {
    id: 'performance',
    name: 'Performance Pack',
    price: '$9.99',
    blurb: 'Make it fast again',
    includes: ['Startup manager', 'Performance optimizer', 'Clean uninstaller', 'Registry cleaner (Win)'],
  },
  {
    id: 'bundle',
    name: 'All-in-One Bundle',
    price: '$19.99',
    blurb: 'Everything, save $8/mo',
    includes: ['Every scanner and cleaner', 'One-Click Optimize', 'Scheduled scans', 'Priority support'],
    best: true,
  },
];

export default function Paywall({ open, onClose, onUnlocked, freedPreview }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState('bundle');

  if (!open) return null;

  async function activate(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const trimmed = key.trim().toUpperCase();
    const r = await validateLicense(trimmed);
    if (r.valid) {
      setStoredLicense(trimmed);
      await onUnlocked?.();
    } else {
      const map = {
        not_found:        'That license key isn’t recognized.',
        expired:          'This license has expired.',
        revoked:          'This license has been revoked.',
        wrong_device:     'This license is bound to another device.',
        past_due_expired: 'Subscription is past due. Update payment first.',
      };
      setErr(map[r.reason] || r.message || 'License could not be validated. Try again.');
    }
    setBusy(false);
  }

  const tier = TIERS.find(t => t.id === selected) || TIERS[3];

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={s.close} aria-label="Close">x</button>
        <h2 style={s.title}>Pick a plan to clean</h2>
        <p style={s.sub}>
          {freedPreview
            ? `Your scan found ${freedPreview} ready to remove. Pick the service that matches what you need.`
            : 'Scanning is free. Pick a service to clean what was found and keep your system optimized.'}
        </p>

        <div style={s.tierGrid}>
          {TIERS.map(t => {
            const isSel = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  ...s.tier,
                  ...(isSel ? s.tierSel : {}),
                  ...(t.best ? s.tierBest : {}),
                }}
              >
                {t.best && <div style={s.bestTag}>Best value</div>}
                <div style={s.tierName}>{t.name}</div>
                <div style={s.tierPrice}>{t.price}<span style={s.tierPer}>/mo</span></div>
                <div style={s.tierBlurb}>{t.blurb}</div>
                <ul style={s.tierList}>
                  {t.includes.map(inc => <li key={inc}>{inc}</li>)}
                </ul>
              </button>
            );
          })}
        </div>

        <button onClick={() => startCheckout(selected)} style={s.buyBtn}>
          Subscribe to {tier.name} — {tier.price}/mo
        </button>
        <p style={s.fineprint}>Cancel anytime · 30-day money-back guarantee</p>

        <div style={s.divider}>Already have a key?</div>

        <form onSubmit={activate}>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="PCFX-XXXX-XXXX-XXXX-XXXX"
            style={s.input}
          />
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={busy || !key} style={{ ...s.activateBtn, opacity: (busy || !key) ? 0.5 : 1 }}>
            {busy ? 'Validating…' : 'Activate license'}
          </button>
        </form>

        <p style={s.foot}>
          Need help? <a href="mailto:support@pcfixscan.com" style={{ color: '#0078d4' }}>support@pcfixscan.com</a>
        </p>
      </div>
    </div>
  );
}

const s = {
  backdrop:   { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, overflowY: 'auto' },
  card:       { position: 'relative', width: 720, maxWidth: '100%', background: '#fff', border: '1px solid #d1d1d1', borderRadius: 10, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' },
  close:      { position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', fontSize: '1.1rem', color: '#888', cursor: 'pointer', padding: 4, lineHeight: 1 },
  title:      { fontSize: '1.4rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 8px' },
  sub:        { fontSize: '0.9rem', color: '#555', margin: '0 0 22px', lineHeight: 1.55 },

  tierGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 18 },
  tier:       { position: 'relative', textAlign: 'left', padding: '16px 14px 14px', border: '1.5px solid #e1e1e1', borderRadius: 8, background: '#fff', cursor: 'pointer', transition: 'all .15s', font: 'inherit', color: 'inherit' },
  tierSel:    { borderColor: '#0078d4', boxShadow: '0 0 0 3px rgba(0,120,212,0.12)' },
  tierBest:   { borderColor: '#00b341' },
  bestTag:    { position: 'absolute', top: -9, right: 10, background: '#00b341', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10 },
  tierName:   { fontSize: '0.86rem', fontWeight: 700, color: '#1b1b1b', marginBottom: 4 },
  tierPrice:  { fontSize: '1.45rem', fontWeight: 800, color: '#1b1b1b', lineHeight: 1 },
  tierPer:    { fontSize: '0.75rem', fontWeight: 600, color: '#888', marginLeft: 2 },
  tierBlurb:  { fontSize: '0.74rem', color: '#666', margin: '6px 0 8px' },
  tierList:   { listStyle: 'none', padding: 0, margin: 0, fontSize: '0.74rem', color: '#444', lineHeight: 1.55 },

  buyBtn:     { width: '100%', height: 46, marginTop: 4, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' },
  fineprint:  { textAlign: 'center', fontSize: '0.74rem', color: '#888', margin: '8px 0 0' },
  divider:    { textAlign: 'center', color: '#999', fontSize: '0.75rem', margin: '20px 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input:      { width: '100%', height: 38, padding: '0 12px', fontSize: '0.92rem', fontFamily: 'SF Mono, Menlo, monospace', border: '1px solid #c8c8c8', borderRadius: 4, boxSizing: 'border-box', outline: 'none', letterSpacing: '0.5px' },
  activateBtn:{ width: '100%', height: 38, marginTop: 10, background: '#fff', color: '#0078d4', border: '1px solid #0078d4', borderRadius: 6, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' },
  err:        { marginTop: 10, padding: '8px 12px', background: '#fde7e9', borderLeft: '4px solid #d13438', borderRadius: 4, fontSize: '0.8rem', color: '#9b1c20' },
  foot:       { fontSize: '0.72rem', color: '#999', marginTop: 16, textAlign: 'center' },
};
