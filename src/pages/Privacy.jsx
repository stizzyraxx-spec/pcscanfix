import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div style={s.page}>
      <article style={s.card}>
        <Link to="/" style={s.back}>← Back</Link>
        <h1>Privacy Policy</h1>
        <p style={s.muted}>Last updated: April 2026</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Purchase information</strong> — your email, billing details, and license key are processed by Stripe and stored to deliver your license. We do not store credit card numbers.</li>
          <li><strong>License validation pings</strong> — when the desktop app launches, it sends your license key to our API so we can confirm it's still active. We log the timestamp.</li>
          <li><strong>Anonymous usage events</strong> — page views, scan completions, and bytes-found counts. No file paths, file names, or personal content is transmitted.</li>
        </ul>

        <h2>What we don't collect</h2>
        <ul>
          <li>The contents of any file on your computer</li>
          <li>Lists of files scanned, found, or deleted</li>
          <li>Browser history or open tabs</li>
          <li>Any data from inside files we read</li>
        </ul>

        <h2>How we use it</h2>
        <p>To deliver and maintain your license, send transactional email (license delivery, receipts), and improve the product based on aggregate usage patterns.</p>

        <h2>Third parties</h2>
        <ul>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Resend</strong> — transactional email</li>
          <li><strong>Vercel</strong> — hosting</li>
        </ul>

        <h2>Your rights</h2>
        <p>Email <a href="mailto:support@pcfixscan.com">support@pcfixscan.com</a> to request a copy of your data, deletion, or refund.</p>

        <p style={s.muted}>
          PCFixScan is operated by RAXX BEATS STUDIOS LLC. Wellington, FL.
        </p>

        <Footer />
      </article>
    </div>
  );
}

function Footer() {
  return (
    <div style={s.footer}>
      <Link to="/buy" style={s.flink}>Buy</Link>
      <Link to="/download" style={s.flink}>Download</Link>
      <Link to="/support" style={s.flink}>Support</Link>
      <Link to="/terms" style={s.flink}>Terms</Link>
    </div>
  );
}

const s = {
  page:   { minHeight: '100vh', background: '#f3f3f3', padding: '40px 16px' },
  card:   { maxWidth: 720, margin: '0 auto', background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: '32px 40px', lineHeight: 1.7, color: '#1b1b1b', fontSize: '0.94rem' },
  back:   { color: '#0078d4', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-block', marginBottom: 18 },
  muted:  { color: '#999', fontSize: '0.84rem' },
  footer: { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 32, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink:  { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};
