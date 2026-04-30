import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { validateLicense, setStoredLicense } from '../utils/license.js';

const REPO    = 'stizzyraxx-spec/pcscanfix';
const VERSION = '1.0.0';

const ASSETS = {
  mac:        `https://github.com/${REPO}/releases/latest/download/PCScanFix-${VERSION}-arm64.dmg`,
  'mac-x64':  `https://github.com/${REPO}/releases/latest/download/PCScanFix-${VERSION}.dmg`,
  win:        `https://github.com/${REPO}/releases/latest/download/PCScanFix.Setup.${VERSION}.exe`,
  linux:      `https://github.com/${REPO}/releases/latest/download/PCScanFix-${VERSION}.AppImage`,
};

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua))   return 'mac';
  if (/Win/i.test(ua))   return 'win';
  if (/Linux/i.test(ua)) return 'linux';
  return 'mac';
}

export default function Download() {
  const [platform, setPlatform] = useState('mac');
  const [unlocked, setUnlocked] = useState(false);
  const [loading,  setLoading]  = useState(true);

  // License-key entry state
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  useEffect(() => {
    setPlatform(detectPlatform());
    (async () => {
      // 1) Logged-in users with at least one active license can download
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: licenses } = await supabase
          .from('licenses').select('status, expires_at').eq('status', 'active');
        const hasValid = (licenses || []).some(l =>
          !l.expires_at || new Date(l.expires_at) > new Date()
        );
        if (hasValid) { setUnlocked(true); setLoading(false); return; }
      }
      setLoading(false);
    })();
  }, []);

  async function unlockWithKey(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await validateLicense(key.trim().toUpperCase());
    if (r.valid) {
      setStoredLicense(key.trim().toUpperCase());
      setUnlocked(true);
    } else {
      const map = {
        not_found:    'That license key isn’t recognized.',
        expired:      'This license has expired. Renew at /buy.',
        revoked:      'This license has been revoked.',
      };
      setErr(map[r.reason] || 'Could not validate license.');
    }
    setBusy(false);
  }

  if (loading) {
    return <div style={s.page}><div style={s.card}><p style={s.sub}>Loading…</p></div></div>;
  }

  if (!unlocked) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>Activate to download</h1>
          <p style={s.sub}>Enter your license key (sent by email after purchase) to download PCFixScan.</p>

          <form onSubmit={unlockWithKey} style={{ marginTop: 18 }}>
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="PCFX-XXXX-XXXX-XXXX-XXXX"
              style={s.licenseInput}
              autoFocus
            />
            {err && <div style={s.err}>{err}</div>}
            <button type="submit" disabled={busy || !key} style={{ ...s.primaryBtn, opacity: (busy || !key) ? 0.5 : 1 }}>
              {busy ? 'Validating…' : 'Show downloads'}
            </button>
          </form>

          <div style={s.divider}>or</div>
          <Link to="/buy" style={s.secondaryBtn}>Subscribe — $19.99/month</Link>

          <p style={s.note}>
            Already have an account?{' '}
            <Link to="/login?next=/download" style={s.link}>Sign in</Link>
            {' '}— customers with active subscriptions can download without re-entering the key.
          </p>

          <Footer />
        </div>
      </div>
    );
  }

  const labels = {
    mac:       'Download for macOS (Apple Silicon)',
    'mac-x64': 'macOS (Intel)',
    win:       'Download for Windows',
    linux:     'Download for Linux',
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Download PCFixScan</h1>
        <p style={s.sub}>Active subscription — version {VERSION}</p>

        <a href={ASSETS[platform]} style={s.primaryBtn}>{labels[platform]}</a>

        <div style={s.others}>
          {Object.keys(ASSETS).filter(k => k !== platform).map(k => (
            <a key={k} href={ASSETS[k]} style={s.secondaryBtnSmall}>{labels[k]}</a>
          ))}
        </div>

        <p style={s.note}>
          Open the downloaded file → drag PCFixScan to Applications → launch and paste your license key.
        </p>

        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={s.footer}>
      <Link to="/buy" style={s.flink}>Buy</Link>
      <Link to="/support" style={s.flink}>Support</Link>
      <Link to="/privacy" style={s.flink}>Privacy</Link>
      <Link to="/terms" style={s.flink}>Terms</Link>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card: { width: 460, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: '36px 32px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 6px' },
  sub: { fontSize: '0.85rem', color: '#767676', margin: '0 0 8px' },
  licenseInput: { width: '100%', height: 40, padding: '0 14px', fontSize: '0.92rem', fontFamily: 'SF Mono, Menlo, monospace', border: '1px solid #c8c8c8', borderRadius: 6, boxSizing: 'border-box', outline: 'none', letterSpacing: '0.5px', textAlign: 'center', marginBottom: 12 },
  err: { padding: '8px 12px', background: '#fde7e9', borderLeft: '4px solid #d13438', borderRadius: 4, fontSize: '0.8rem', color: '#9b1c20', marginBottom: 12, textAlign: 'left' },
  primaryBtn: { display: 'inline-block', width: '100%', padding: '14px 0', background: '#0078d4', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', boxSizing: 'border-box', border: 'none', cursor: 'pointer' },
  secondaryBtn: { display: 'inline-block', width: '100%', padding: '12px 0', background: '#fff', color: '#0078d4', border: '1px solid #0078d4', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', boxSizing: 'border-box' },
  divider: { color: '#999', fontSize: '0.78rem', margin: '14px 0', textTransform: 'uppercase', letterSpacing: '0.06em' },
  others: { display: 'flex', gap: 8, marginTop: 12 },
  secondaryBtnSmall: { flex: 1, padding: '10px 0', background: '#fff', color: '#0078d4', border: '1px solid #c8c8c8', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500 },
  note: { fontSize: '0.82rem', color: '#555', marginTop: 18, lineHeight: 1.6 },
  link: { color: '#0078d4', fontWeight: 600 },
  footer: { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink: { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};
