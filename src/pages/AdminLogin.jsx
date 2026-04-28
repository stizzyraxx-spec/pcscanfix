import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase, isAdminEmail } from '../lib/supabase.js';

export default function AdminLogin({ destination = '/admin/dashboard', title = 'Admin Portal' }) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError(authErr.message); setBusy(false); return; }

    if (!isAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      setError('This account is not authorized for admin access.');
      setBusy(false);
      return;
    }

    sessionStorage.setItem('pcf_admin', '1');
    navigate(destination);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <Shield size={28} color="#0078d4" />
        </div>
        <h1 style={s.title}>{title}</h1>
        <p style={s.sub}>PCFixScan — Restricted Access</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@pcfixscan.com" required style={s.input} />
          </div>
          <div style={{ ...s.field, marginBottom: 0 }}>
            <label style={s.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required style={s.input} />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Signing in…' : 'Access Admin Panel'}
          </button>
        </form>

        <p style={s.foot}>Restricted to authorized administrators only.</p>
      </div>
    </div>
  );
}

const s = {
  page:     { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3' },
  card:     { width: 360, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2, padding: '36px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 12, background: '#e5f1fb', border: '1px solid #9dc8eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  title:    { fontSize: '1.25rem', fontWeight: 700, color: '#1b1b1b', marginBottom: 4 },
  sub:      { fontSize: '0.8rem', color: '#767676' },
  field:    { textAlign: 'left', marginBottom: 14 },
  label:    { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#444', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:    { width: '100%', height: 32, padding: '0 10px', fontSize: '0.875rem', border: '1px solid #ababab', borderRadius: 2, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  error:    { marginTop: 12, padding: '8px 12px', background: '#fde7e9', border: '1px solid #f4b8ba', borderLeft: '4px solid #d13438', borderRadius: 2, fontSize: '0.8rem', color: '#9b1c20', textAlign: 'left' },
  btn:      { width: '100%', height: 34, marginTop: 20, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 2, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  foot:     { marginTop: 20, fontSize: '0.72rem', color: '#ababab' },
};
