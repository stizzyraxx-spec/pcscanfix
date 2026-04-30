import { useState } from 'react';
import { Link } from 'react-router-dom';
import { startCheckout } from '../utils/license.js';

export default function Buy() {
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    await startCheckout();
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 18 }}>
          <rect x="1" y="2" width="22" height="14" rx="1.5" fill="#D4D0C8"/>
          <rect x="3" y="4" width="18" height="10" fill="#001628"/>
          <rect x="4.5" y="6" width="13" height="1.2" rx="0.3" fill="#00DC3C"/>
          <rect x="4.5" y="9.5" width="10" height="1.2" rx="0.3" fill="#00DC3C"/>
          <circle cx="20.5" cy="15" r="0.9" fill="#00F050"/>
          <rect x="10" y="16" width="4" height="3.5" fill="#B8B4AE"/>
          <rect x="7" y="19.5" width="10" height="2" rx="0.5" fill="#C4C0BA"/>
        </svg>

        <h1 style={s.title}>PCFixScan</h1>
        <p style={s.sub}>Monthly subscription · Mac &amp; Windows · Cancel anytime</p>

        <div style={s.price}>
          <span style={s.dollars}>$19</span>
          <span style={s.cents}>.99</span>
          <span style={{ fontSize: '0.95rem', color: '#666', marginLeft: 6 }}>/month</span>
        </div>

        <ul style={s.list}>
          <li>Unlimited scans &amp; cleanups</li>
          <li>Junk files, browser cache, duplicates, large files</li>
          <li>Startup manager &amp; app uninstaller</li>
          <li>Malware heuristics scan</li>
          <li>Auto-scan scheduling</li>
          <li>All updates included</li>
        </ul>

        <button onClick={buy} disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Opening checkout…' : 'Subscribe — $19.99/month'}
        </button>

        <p style={s.foot}>
          Secure checkout by Stripe · Cancel anytime in your account · License arrives by email instantly.
        </p>

        <div style={s.footer}>
          <Link to="/download" style={s.flink}>Download</Link>
          <Link to="/support" style={s.flink}>Support</Link>
          <Link to="/privacy" style={s.flink}>Privacy</Link>
          <Link to="/terms" style={s.flink}>Terms</Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card: { width: 420, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: '36px 36px 28px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 6px' },
  sub: { fontSize: '0.85rem', color: '#767676', margin: 0 },
  price: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', margin: '24px 0 18px', color: '#0078d4' },
  dollars: { fontSize: '3rem', fontWeight: 800, lineHeight: 1 },
  cents: { fontSize: '1.4rem', fontWeight: 700, marginLeft: 2 },
  list: { textAlign: 'left', listStyle: 'none', padding: 0, margin: '0 0 24px', color: '#333', fontSize: '0.88rem', lineHeight: 1.9 },
  btn: { width: '100%', height: 44, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },
  foot: { fontSize: '0.72rem', color: '#999', marginTop: 16, marginBottom: 0, lineHeight: 1.6 },
  footer: { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink: { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};
