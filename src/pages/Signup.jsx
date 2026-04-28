import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await signup(email, password);
    if (r.ok) navigate('/account?welcome=1');
    else { setErr(r.error || 'Signup failed'); setBusy(false); }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Create your account</h1>
        <p style={s.sub}>Manage your license, view receipts, and recover keys.</p>

        <form onSubmit={submit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={s.input} autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password (8+ characters)</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={s.input} />
          </div>
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div style={s.links}>
          <Link to="/login" style={s.link}>Already have an account?</Link>
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
