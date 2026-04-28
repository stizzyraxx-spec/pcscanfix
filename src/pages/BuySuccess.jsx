import { Link, useSearchParams } from 'react-router-dom';

export default function BuySuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.check}>✓</div>
        <h1 style={s.title}>Payment received</h1>
        <p style={s.body}>
          Your license key is on its way. Check your email — it should arrive within a minute.
        </p>
        <p style={s.body}>
          The same email contains a <strong>"Set password"</strong> link to create your account so
          you can manage your license at <Link to="/account" style={{ color: '#0078d4', fontWeight: 600 }}>pcfixscan.com/account</Link>.
        </p>
        <p style={s.body}>
          Then open PCFixScan, click <strong>Login</strong> in the top-right, and paste your license key.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
          <Link to="/download" style={s.btn}>Download app</Link>
          <Link to="/" style={{ ...s.btn, background: '#fff', color: '#0078d4', border: '1px solid #0078d4' }}>Home</Link>
        </div>
        {sessionId && <p style={s.foot}>Order ref: {sessionId.slice(-12)}</p>}
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card:  { width: 440, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: 36, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  check: { width: 60, height: 60, borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 14px' },
  body:  { fontSize: '0.9rem', color: '#444', lineHeight: 1.6, margin: '0 0 14px' },
  btn:   { display: 'inline-block', marginTop: 12, padding: '10px 24px', background: '#0078d4', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' },
  foot:  { fontSize: '0.7rem', color: '#999', marginTop: 18 },
};
