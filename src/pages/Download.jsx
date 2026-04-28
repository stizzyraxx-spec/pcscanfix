import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const REPO = 'YOUR_GITHUB_USER/pcfixscan';   // update once you create the repo
const VERSION = '1.0.0';

const ASSETS = {
  mac:   `https://github.com/${REPO}/releases/latest/download/PCFixScan-${VERSION}.dmg`,
  win:   `https://github.com/${REPO}/releases/latest/download/PCFixScan-Setup-${VERSION}.exe`,
  linux: `https://github.com/${REPO}/releases/latest/download/PCFixScan-${VERSION}.AppImage`,
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
  useEffect(() => setPlatform(detectPlatform()), []);

  const labels = {
    mac:   'Download for macOS',
    win:   'Download for Windows',
    linux: 'Download for Linux',
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Download PCFixScan</h1>
        <p style={s.sub}>Free 7-day trial · Buy a license to keep using after</p>

        <a href={ASSETS[platform]} style={s.primaryBtn}>
          {labels[platform]} ({VERSION})
        </a>

        <div style={s.others}>
          {Object.keys(ASSETS).filter(k => k !== platform).map(k => (
            <a key={k} href={ASSETS[k]} style={s.secondaryBtn}>{labels[k]}</a>
          ))}
        </div>

        <p style={s.note}>
          After install, you have a 7-day trial.{' '}
          <Link to="/buy" style={s.link}>Buy a license — $19.99</Link> for unlimited use.
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
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 6px' },
  sub: { fontSize: '0.85rem', color: '#767676', margin: '0 0 28px' },
  primaryBtn: { display: 'inline-block', width: '100%', padding: '14px 0', background: '#0078d4', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', boxSizing: 'border-box' },
  others: { display: 'flex', gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, padding: '10px 0', background: '#fff', color: '#0078d4', border: '1px solid #c8c8c8', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500 },
  note: { fontSize: '0.82rem', color: '#555', marginTop: 24, lineHeight: 1.6 },
  link: { color: '#0078d4', fontWeight: 600 },
  footer: { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 24, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink: { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};
