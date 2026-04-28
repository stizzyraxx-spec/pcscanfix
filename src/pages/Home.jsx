import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={s.page}>
      {/* Top bar */}
      <header style={s.topbar}>
        <Link to="/" style={s.logo}>
          <Logo />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>PCFixScan</span>
        </Link>
        <nav style={s.nav}>
          <Link to="/download" style={s.navLink}>Download</Link>
          <Link to="/buy" style={s.navLink}>Pricing</Link>
          <Link to="/support" style={s.navLink}>Support</Link>
          <Link to="/login" style={s.navLink}>Sign in</Link>
          <Link to="/buy" style={s.cta}>Buy — $19.99</Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={s.hero}>
        <h1 style={s.h1}>Clean, secure, and fast — your PC, the way it shipped.</h1>
        <p style={s.lede}>
          PCFixScan finds the junk slowing your computer down: cache, duplicates, browser bloat,
          and forgotten apps. One click cleans them safely.
        </p>
        <div style={s.heroBtns}>
          <Link to="/download" style={s.primaryBtn}>Download free trial</Link>
          <Link to="/buy" style={s.secondaryBtn}>Buy a license — $19.99</Link>
        </div>
        <p style={s.heroSub}>7-day free trial · Mac &amp; Windows · One-time purchase, no subscription</p>
      </section>

      {/* Features */}
      <section style={s.features}>
        {FEATURES.map(f => (
          <div key={f.title} style={s.feature}>
            <div style={s.featureIcon}>{f.icon}</div>
            <h3 style={s.featureTitle}>{f.title}</h3>
            <p style={s.featureBody}>{f.body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section style={s.pricing}>
        <h2 style={s.h2}>Simple pricing</h2>
        <div style={s.priceCard}>
          <div style={s.priceTier}>Lifetime License</div>
          <div style={s.price}><span style={s.dollars}>$19</span><span style={s.cents}>.99</span></div>
          <ul style={s.priceList}>
            <li>Unlimited scans &amp; cleanups</li>
            <li>All scanners: junk, browser cache, duplicates, large files, threats</li>
            <li>Startup manager &amp; clean uninstaller</li>
            <li>Mac &amp; Windows · lifetime updates</li>
            <li>30-day money-back guarantee</li>
          </ul>
          <Link to="/buy" style={{ ...s.primaryBtn, width: '100%', boxSizing: 'border-box' }}>Buy now</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div>© 2026 RAXX BEATS STUDIOS LLC · PCFixScan</div>
        <div style={s.footerLinks}>
          <Link to="/download" style={s.footerLink}>Download</Link>
          <Link to="/buy" style={s.footerLink}>Pricing</Link>
          <Link to="/support" style={s.footerLink}>Support</Link>
          <Link to="/privacy" style={s.footerLink}>Privacy</Link>
          <Link to="/terms" style={s.footerLink}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="2" width="22" height="14" rx="1.5" fill="#D4D0C8"/>
      <rect x="3" y="4" width="18" height="10" fill="#001628"/>
      <rect x="4.5" y="6" width="13" height="1.2" rx="0.3" fill="#00DC3C"/>
      <rect x="4.5" y="9.5" width="10" height="1.2" rx="0.3" fill="#00DC3C"/>
      <circle cx="20.5" cy="15" r="0.9" fill="#00F050"/>
      <rect x="10" y="16" width="4" height="3.5" fill="#B8B4AE"/>
      <rect x="7" y="19.5" width="10" height="2" rx="0.5" fill="#C4C0BA"/>
    </svg>
  );
}

const FEATURES = [
  { icon: '🧹', title: 'Smart junk scanner', body: 'Finds cache files, logs, and temp data across the whole system. Reviewable, recoverable, never silent.' },
  { icon: '🔍', title: 'Duplicate detection', body: 'Finds true duplicate files across folders. Pick which copies to keep, free gigabytes in seconds.' },
  { icon: '🌐', title: 'Browser cleanup', body: 'Cache, cookies, and history from Chrome, Safari, Firefox, and Edge — selective, never destructive.' },
  { icon: '⚡', title: 'Startup manager', body: 'See exactly what loads when your computer boots. Disable bloat, keep what you need.' },
  { icon: '🗑️', title: 'Clean uninstaller', body: 'Removes apps and the leftover files most uninstallers miss. Reclaim space and clean your registry.' },
  { icon: '🛡️', title: 'Threat scanner', body: 'Heuristic scan for suspicious executables. Not a replacement for antivirus, but a useful second pair of eyes.' },
];

const s = {
  page:    { background: '#fff', color: '#1b1b1b', minHeight: '100vh' },
  topbar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 6vw', borderBottom: '1px solid #ececec', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)', zIndex: 10 },
  logo:    { display: 'flex', alignItems: 'center', gap: 10, color: '#1b1b1b', textDecoration: 'none' },
  nav:     { display: 'flex', gap: 18, alignItems: 'center' },
  navLink: { color: '#444', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 },
  cta:     { background: '#0078d4', color: '#fff', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' },

  hero:        { textAlign: 'center', padding: '80px 6vw 60px', maxWidth: 880, margin: '0 auto' },
  h1:          { fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 18px', letterSpacing: '-0.02em' },
  lede:        { fontSize: 'clamp(1rem, 1.4vw, 1.15rem)', color: '#555', lineHeight: 1.6, margin: '0 0 32px' },
  heroBtns:    { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn:  { background: '#0078d4', color: '#fff', padding: '14px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem', display: 'inline-block' },
  secondaryBtn:{ background: '#fff', color: '#0078d4', padding: '13px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', border: '1px solid #0078d4', display: 'inline-block' },
  heroSub:     { fontSize: '0.82rem', color: '#888', marginTop: 18 },

  features:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, padding: '40px 6vw 80px', maxWidth: 1100, margin: '0 auto' },
  feature:     { padding: 24, background: '#fafafa', border: '1px solid #ececec', borderRadius: 10 },
  featureIcon: { fontSize: '1.8rem', marginBottom: 10 },
  featureTitle:{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px' },
  featureBody: { fontSize: '0.86rem', color: '#555', lineHeight: 1.6, margin: 0 },

  pricing:     { padding: '40px 6vw 80px', maxWidth: 480, margin: '0 auto' },
  h2:          { fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', margin: '0 0 28px' },
  priceCard:   { background: '#fff', border: '1px solid #d1d1d1', borderRadius: 12, padding: '36px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  priceTier:   { fontSize: '0.78rem', fontWeight: 700, color: '#0078d4', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 12 },
  price:       { display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 24, color: '#1b1b1b' },
  dollars:     { fontSize: '3.2rem', fontWeight: 800, lineHeight: 1 },
  cents:       { fontSize: '1.4rem', fontWeight: 700, marginLeft: 2 },
  priceList:   { listStyle: 'none', padding: 0, margin: '0 0 28px', color: '#444', fontSize: '0.88rem', lineHeight: 1.9 },

  footer:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 6vw', borderTop: '1px solid #ececec', color: '#777', fontSize: '0.82rem', flexWrap: 'wrap', gap: 16 },
  footerLinks: { display: 'flex', gap: 16 },
  footerLink:  { color: '#777', textDecoration: 'none' },
};
