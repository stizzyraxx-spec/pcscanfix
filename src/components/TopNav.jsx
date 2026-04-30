import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, isAdminEmail } from '../lib/supabase.js';

const isWin = (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform));

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scanner', label: 'Scanner' },
  { to: '/results', label: 'Results' },
  { to: '/performance', label: 'Performance' },
  { to: '/startup', label: 'Startup' },
  { to: '/privacy-cleaner', label: 'Privacy' },
  ...(isWin ? [{ to: '/registry', label: 'Registry' }] : []),
  { to: '/uninstaller', label: 'Uninstaller' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
];

export default function TopNav() {
  // Real Supabase session — no client-side bypass
  const [user, setUser]       = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [err, setErr]       = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const isAdmin = user && isAdminEmail(user.email);

  async function login(e) {
    e.preventDefault();
    setErr('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr(error.message); return; }
    if (!isAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      setErr('This account does not have admin privileges.');
      return;
    }
    setUser(data.user);
    setShowModal(false);
    setEmail(''); setPass(''); setErr('');
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // The custom title bar (logo + brand + Windows controls) is gone — Electron now
  // uses the OS-native title bar with traffic lights / min-max-close + "PCFixScan" title.
  // Web renders the title in the browser tab. Both contexts get a clean menu strip below.
  return (
    <>
      <div style={s.shell}>
        {/* Menu / nav strip */}
        <div style={s.menuBar}>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
                ...s.menuItem, ...(isActive ? s.activeItem : {}),
              })}>
                {n.label}
              </NavLink>
            ))}
          </div>

          {/* Login / Logout — admin only; customer uses license key, not login */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 8, gap: 6, WebkitAppRegion: 'no-drag' }}>
            {user && isAdmin ? (
              <>
                <span style={{ fontSize: '0.72rem', color: '#0078d4', fontWeight: 600 }}>Admin</span>
                <button onClick={logout} style={s.authBtn}>Logout</button>
              </>
            ) : (
              <button onClick={() => setShowModal(true)} style={s.authBtn}>Admin</button>
            )}
          </div>
        </div>
      </div>

      {/* Login modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => { setShowModal(false); setErr(''); }}>
          <form onSubmit={login} style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 18 }}>Admin Login</div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              style={{ ...s.input, marginTop: 10 }}
            />
            {err && <div style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: 6 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="submit" style={{ ...s.authBtn, flex: 1, padding: '8px 0', background: '#0078d4', color: '#fff' }}>
                Login
              </button>
              <button type="button" onClick={() => { setShowModal(false); setErr(''); }}
                style={{ ...s.authBtn, flex: 1, padding: '8px 0', background: '#f0f0f0', color: '#333' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const s = {
  shell: {
    flexShrink: 0,
  },
  menuBar: {
    height: 32,
    background: '#f3f3f3',
    borderBottom: '1px solid #d1d1d1',
    display: 'flex',
    alignItems: 'stretch',
    padding: '0 4px',
    WebkitAppRegion: 'no-drag',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    color: '#1b1b1b',
    textDecoration: 'none',
    fontSize: '0.84rem',
    fontWeight: 400,
    whiteSpace: 'nowrap',
    borderBottom: '3px solid transparent',
    transition: 'background 0.1s',
  },
  activeItem: {
    color: '#0078d4',
    borderBottom: '3px solid #0078d4',
    background: '#e5f1fb',
    fontWeight: 600,
  },
  authBtn: {
    padding: '3px 12px',
    borderRadius: 4,
    border: '1px solid #c8c8c8',
    background: '#fff',
    color: '#1b1b1b',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    WebkitAppRegion: 'no-drag',
  },
  modal: {
    background: '#fff',
    borderRadius: 10,
    padding: '28px 32px',
    width: 320,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #d1d1d1',
    fontSize: '0.84rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
};
