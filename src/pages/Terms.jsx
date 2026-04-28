import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={s.page}>
      <article style={s.card}>
        <Link to="/" style={s.back}>← Back</Link>
        <h1>Terms of Service</h1>
        <p style={s.muted}>Last updated: April 2026</p>

        <h2>1. License grant</h2>
        <p>When you purchase a PCFixScan license, you receive a non-exclusive, non-transferable license to install and use the software on personal devices you own or control. The license key is for your use only — sharing it may result in deactivation.</p>

        <h2>2. Trial period</h2>
        <p>PCFixScan offers a 7-day free trial. After the trial expires, a license key is required to continue using core features.</p>

        <h2>3. Refunds</h2>
        <p>Full refunds are available within 30 days of purchase, no questions asked. Email <a href="mailto:support@pcfixscan.com">support@pcfixscan.com</a> with your purchase email.</p>

        <h2>4. Use at your own risk</h2>
        <p>PCFixScan deletes files. While the default behavior is to move items to the system Trash (recoverable), we are not liable for any data loss resulting from use of the software. <strong>Always review what the scanner finds before cleaning, and back up important data regularly.</strong></p>

        <h2>5. Malware detection disclaimer</h2>
        <p>The malware scan is heuristic-based and is not a replacement for dedicated antivirus software. Do not rely on PCFixScan as your only line of defense against malware.</p>

        <h2>6. Updates</h2>
        <p>The software may automatically check for and download updates. You can disable this in Settings.</p>

        <h2>7. Changes to these terms</h2>
        <p>We may update these terms from time to time. Material changes will be communicated via email to license holders.</p>

        <h2>8. Contact</h2>
        <p>Questions about these terms? Email <a href="mailto:support@pcfixscan.com">support@pcfixscan.com</a>.</p>

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
      <Link to="/privacy" style={s.flink}>Privacy</Link>
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
