import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const ADMIN_EMAIL = 'admin@pcfixscan.com';
const ADMIN_PASS  = 'ShaniyaK12!!';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scanner', label: 'Scanner' },
  { to: '/results', label: 'Results' },
  { to: '/startup', label: 'Startup' },
  { to: '/uninstaller', label: 'Uninstaller' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
];

const isMac = window.electronAPI?.platform === 'darwin';

function WinBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 46,
        height: 40,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.75)',
        fontSize: danger ? '1rem' : '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'no-drag',
        transition: 'background 0.1s',
        fontFamily: 'Segoe MDL2 Assets, Segoe UI, sans-serif',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#c42b1c' : 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {label}
    </button>
  );
}

export default function TopNav() {
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('pcf_admin'));
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [err, setErr]       = useState('');

  function login(e) {
    e.preventDefault();
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      sessionStorage.setItem('pcf_admin', '1');
      setIsAdmin(true);
      setShowModal(false);
      setEmail(''); setPass(''); setErr('');
    } else {
      setErr('Invalid credentials');
    }
  }

  function logout() {
    sessionStorage.removeItem('pcf_admin');
    setIsAdmin(false);
  }

  return (
    <>
      <div style={s.shell}>
        {/* Title bar */}
        <div style={{ ...s.titleBar, position: 'relative' }}>
          <div style={{ paddingLeft: isMac ? 72 : 14, display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={s.logoMark}>
              <rect x="1" y="2" width="22" height="14" rx="1.5" fill="#D4D0C8"/>
              <rect x="2" y="2.5" width="20" height="1" rx="0.5" fill="#EEE8E0" opacity="0.8"/>
              <rect x="3" y="4" width="18" height="10" fill="#001628"/>
              <rect x="4.5" y="6"   width="13" height="1.2" rx="0.3" fill="#00DC3C" opacity="0.9"/>
              <rect x="4.5" y="9.5" width="10" height="1.2" rx="0.3" fill="#00DC3C" opacity="0.9"/>
              <rect x="15.5" y="9.5" width="1.5" height="1.2" fill="#00DC3C"/>
              <circle cx="20.5" cy="15" r="0.9" fill="#00F050"/>
              <rect x="10" y="16" width="4" height="3.5" fill="#B8B4AE"/>
              <rect x="7" y="19.5" width="10" height="2" rx="0.5" fill="#C4C0BA"/>
            </svg>
          </div>

          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>PCFixScan</span>

          {!isMac && (
            <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
              <WinBtn label="─" onClick={() => window.electronAPI?.minimizeWindow()} />
              <WinBtn label="□" onClick={() => window.electronAPI?.maximizeWindow()} />
              <WinBtn label="✕" onClick={() => window.electronAPI?.closeWindow()} danger />
            </div>
          )}
        </div>

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

          {/* Login / Logout */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 8, gap: 6, WebkitAppRegion: 'no-drag' }}>
            {isAdmin ? (
              <>
                <span style={{ fontSize: '0.72rem', color: '#0078d4', fontWeight: 600 }}>Admin</span>
                <button onClick={logout} style={s.authBtn}>Logout</button>
              </>
            ) : (
              <button onClick={() => setShowModal(true)} style={s.authBtn}>Login</button>
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
    WebkitAppRegion: 'drag',
  },
  titleBar: {
    height: 40,
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #0d0d1a',
  },
  logoMark: {
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
