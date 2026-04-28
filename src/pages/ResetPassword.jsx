import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (password !== confirm) { setErr("Passwords don't match"); return; }
    setBusy(true);
    const r = await resetPassword(token, password);
    if (r.ok) navigate('/login?reset=1');
    else { setErr(r.error || 'Reset failed'); setBusy(false); }
  }

  if (!token) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>Invalid reset link</h1>
          <p style={s.sub}>The link is missing a token. Request a new one.</p>
          <div style={s.links}><Link to="/forgot-password" style={s.link}>Request a reset link</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Choose a new password</h1>
        <p style={s.sub}>You'll be signed in after resetting.</p>

        <form onSubmit={submit}>
          <div style={s.field}>
            <label style={s.label}>New password (8+ characters)</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={s.input} autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm password</label>
            <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} style={s.input} />
          </div>
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div style={s.links}>
          <Link to="/login" style={s.link}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
