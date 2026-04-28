import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  const justReset    = params.get('reset')    === '1';
  const justVerified = params.get('verified') === '1';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await login(email, password);
    if (r.ok) navigate(params.get('next') || '/account');
    else { setErr(r.error || 'Login failed'); setBusy(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Sign in</h1>
        <p style={s.sub}>Access your license keys and account.</p>

        {justReset && (
          <div style={s.ok}>✓ Password updated. Sign in with your new password.</div>
        )}
        {justVerified && (
          <div style={s.ok}>✓ Email verified. You can now sign in.</div>
        )}

        <form onSubmit={submit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={s.input} autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={s.input} />
          </div>
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={s.links}>
          <Link to="/forgot-password" style={s.link}>Forgot password?</Link>
          <Link to="/signup" style={s.link}>Create account</Link>
        </div>

        <div style={s.footer}>
          <Link to="/buy" style={s.flink}>Buy</Link>
          <Link to="/support" style={s.flink}>Support</Link>
          <Link to="/privacy" style={s.flink}>Privacy</Link>
          <Link to="/terms" style={s.flink}>Terms</Link>
        </div>
      </div>
    </div>
  );
}
