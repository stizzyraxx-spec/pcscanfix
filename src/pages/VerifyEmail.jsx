import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmailToken } from '../utils/auth.js';
import { s } from './auth-shared.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState('verifying'); // verifying | ok | error
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('error'); setErr('Missing token'); return; }
    verifyEmailToken(token).then(r => {
      if (r.ok) setState('ok');
      else { setState('error'); setErr(r.error || 'Verification failed'); }
    });
  }, [params]);

  return (
    <div style={s.page}>
      <div style={s.card}>
        {state === 'verifying' && (
          <>
            <h1 style={s.title}>Verifying…</h1>
            <p style={s.sub}>One moment.</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <h1 style={{ ...s.title, color: '#1b5e20' }}>✓ Email verified</h1>
            <p style={s.sub}>Your account is now fully active. You can sign in any time.</p>
            <Link to="/account" style={{ ...s.btn, display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '40px' }}>
              Go to my account
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 style={{ ...s.title, color: '#9b1c20' }}>Verification failed</h1>
            <p style={s.sub}>{err}</p>
            <p style={{ ...s.sub, marginTop: 12 }}>Sign in to your account to request a new verification email.</p>
            <Link to="/login" style={{ ...s.btn, display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '40px' }}>
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
