import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Support() {
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState('idle'); // idle | sending | sent | error
  const [err, setErr]         = useState('');

  async function send(e) {
    e.preventDefault();
    setStatus('sending'); setErr('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setStatus('sent');
    } catch (e) {
      setErr(e.message); setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.check}>✓</div>
          <h1 style={s.title}>Message sent</h1>
          <p style={s.body}>We'll reply to {email} within 24 hours.</p>
          <Link to="/" style={s.btnLink}>Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Support</h1>
        <p style={s.sub}>Lost a license key, need a refund, found a bug? Send us a note.</p>

        <form onSubmit={send} style={{ marginTop: 18 }}>
          <input type="email" required placeholder="Your email" value={email}
            onChange={e => setEmail(e.target.value)} style={s.input} />
          <input required placeholder="Subject" value={subject}
            onChange={e => setSubject(e.target.value)} style={{ ...s.input, marginTop: 10 }} />
          <textarea required placeholder="Tell us what's going on…" value={message}
            onChange={e => setMessage(e.target.value)} style={s.textarea} rows={6} />
          {err && <div style={s.err}>{err}</div>}
          <button type="submit" disabled={status === 'sending'} style={{ ...s.btn, opacity: status === 'sending' ? 0.6 : 1 }}>
            {status === 'sending' ? 'Sending…' : 'Send'}
          </button>
        </form>

        <p style={s.foot}>
          Or email <a href="mailto:support@pcfixscan.com" style={s.link}>support@pcfixscan.com</a> directly.
        </p>

        <div style={s.footer}>
          <Link to="/buy" style={s.flink}>Buy</Link>
          <Link to="/download" style={s.flink}>Download</Link>
          <Link to="/privacy" style={s.flink}>Privacy</Link>
          <Link to="/terms" style={s.flink}>Terms</Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card:    { width: 460, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: 36, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  title:   { fontSize: '1.4rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 6px' },
  sub:     { fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: 1.6 },
  input:   { width: '100%', height: 38, padding: '0 12px', fontSize: '0.9rem', border: '1px solid #c8c8c8', borderRadius: 4, boxSizing: 'border-box', outline: 'none' },
  textarea:{ width: '100%', padding: 12, fontSize: '0.9rem', border: '1px solid #c8c8c8', borderRadius: 4, boxSizing: 'border-box', outline: 'none', marginTop: 10, fontFamily: 'inherit', resize: 'vertical' },
  err:     { marginTop: 10, padding: '8px 12px', background: '#fde7e9', borderLeft: '4px solid #d13438', borderRadius: 4, fontSize: '0.8rem', color: '#9b1c20' },
  btn:     { width: '100%', height: 40, marginTop: 14, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
  foot:    { textAlign: 'center', fontSize: '0.78rem', color: '#777', marginTop: 18 },
  link:    { color: '#0078d4', fontWeight: 500 },
  check:   { width: 56, height: 56, borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  body:    { fontSize: '0.9rem', color: '#444', textAlign: 'center', lineHeight: 1.6 },
  btnLink: { display: 'inline-block', marginTop: 12, padding: '10px 24px', background: '#0078d4', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' },
  footer:  { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 24, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink:   { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};
