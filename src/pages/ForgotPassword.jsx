import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy]   = useState(false);
  const [sent, setSent]   = useState(false);
  const [err, setErr]     = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await forgotPassword(email);
    if (r.ok) setSent(true);
    else setErr(r.error || 'Request failed');
    setBusy(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Reset your password</h1>
        <p style={s.sub}>
          {sent
            ? 'If an account exists for that email, we just sent a reset link. Check your inbox.'
            : 'Enter the email you signed up with and we\'ll send you a reset link.'}
        </p>

        {!sent && (
          <form onSubmit={submit}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={s.input} autoFocus />
            </div>
            {err && <div style={s.err}>{err}</div>}
            <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div style={s.links}>
          <Link to="/login" style={s.link}>← Back to sign in</Link>
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
