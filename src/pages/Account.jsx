import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { me, logout, resendVerify, changePassword } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function Account() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendState, setResendState] = useState(null); // null | 'sending' | 'sent' | 'error'
  const welcome = params.get('welcome') === '1';

  useEffect(() => {
    me().then(d => {
      if (!d) { navigate('/login?next=/account'); return; }
      setData(d); setLoading(false);
    });
  }, [navigate]);

  async function doLogout() {
    await logout();
    navigate('/login');
  }

  async function doResend() {
    setResendState('sending');
    const r = await resendVerify();
    setResendState(r.ok ? 'sent' : 'error');
  }

  if (loading) {
    return <div style={s.page}><div style={s.card}><p style={s.sub}>Loading…</p></div></div>;
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.card, width: 480 }}>
        <h1 style={s.title}>Your account</h1>
        <p style={s.sub}>{data.user.email}</p>

        {welcome && !data.user.emailVerified && (
          <div style={s.ok}>
            Welcome! We sent a verification email to {data.user.email} — check your inbox.
          </div>
        )}

        {!data.user.emailVerified && !welcome && (
          <div style={{ ...s.ok, background: '#fff8e1', borderLeftColor: '#f57c00', color: '#7c4a03' }}>
            <div style={{ marginBottom: 8 }}>Email not verified yet.</div>
            <button onClick={doResend} disabled={resendState === 'sending'} style={hs.smallBtn}>
              {resendState === 'sending' ? 'Sending…'
                : resendState === 'sent' ? '✓ Sent — check inbox'
                : resendState === 'error' ? 'Error — try again'
                : 'Resend verification email'}
            </button>
          </div>
        )}

        <h2 style={hs.h2}>Your licenses</h2>
        {data.licenses.length === 0 ? (
          <div style={hs.empty}>
            No licenses yet.
            <Link to="/buy" style={{ ...s.link, marginLeft: 6 }}>Purchase a license →</Link>
          </div>
        ) : (
          <div style={hs.licenseList}>
            {data.licenses.map(l => (
              <div key={l.key} style={hs.licenseCard}>
                <div style={hs.licenseKey}>{l.key}</div>
                <div style={hs.licenseMeta}>
                  <span style={{ color: l.status === 'active' ? '#1b5e20' : '#9b1c20', fontWeight: 600 }}>{l.status}</span>
                  <span style={{ color: '#999' }}>· {new Date(l.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <ChangePassword />

        <div style={hs.actions}>
          <button onClick={doLogout} style={hs.logoutBtn}>Sign out</button>
        </div>

        <div style={s.footer}>
          <Link to="/" style={s.flink}>Home</Link>
          <Link to="/buy" style={s.flink}>Buy</Link>
          <Link to="/support" style={s.flink}>Support</Link>
          <Link to="/privacy" style={s.flink}>Privacy</Link>
          <Link to="/terms" style={s.flink}>Terms</Link>
        </div>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [cur, setCur]   = useState('');
  const [neu, setNeu]   = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await changePassword(cur, neu);
    if (r.ok) { setDone(true); setCur(''); setNeu(''); }
    else setErr(r.error || 'Failed');
    setBusy(false);
  }

  if (!open) {
    return (
      <div style={{ marginTop: 24 }}>
        <button onClick={() => setOpen(true)} style={hs.smallBtn}>Change password</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, padding: 16, background: '#fafafa', border: '1px solid #ececec', borderRadius: 6 }}>
      <h2 style={{ ...hs.h2, marginTop: 0 }}>Change password</h2>
      {done ? (
        <div style={s.ok}>
          ✓ Password updated.
          <button onClick={() => { setOpen(false); setDone(false); }} style={{ ...hs.smallBtn, marginLeft: 12 }}>Close</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <input type="password" required placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)} style={s.input} />
          <input type="password" required minLength={8} placeholder="New password (8+ chars)" value={neu} onChange={e => setNeu(e.target.value)} style={{ ...s.input, marginTop: 10 }} />
          {err && <div style={s.err}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={busy} style={{ ...s.btn, marginTop: 0, flex: 1, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{ ...hs.logoutBtn, height: 40 }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

const hs = {
  h2:          { fontSize: '0.85rem', fontWeight: 700, color: '#444', marginTop: 28, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' },
  empty:       { padding: 14, background: '#fafafa', border: '1px solid #ececec', borderRadius: 6, fontSize: '0.85rem', color: '#666' },
  licenseList: { display: 'flex', flexDirection: 'column', gap: 8 },
  licenseCard: { padding: 12, background: '#fafafa', border: '1px solid #ececec', borderRadius: 6 },
  licenseKey:  { fontFamily: 'SF Mono, Menlo, monospace', fontSize: '0.92rem', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 4 },
  licenseMeta: { fontSize: '0.78rem', display: 'flex', gap: 6 },
  actions:     { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 24 },
  logoutBtn:   { background: 'none', border: '1px solid #c8c8c8', color: '#444', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: '0.82rem' },
  smallBtn:    { background: '#fff', border: '1px solid #c8c8c8', color: '#0078d4', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 },
};
