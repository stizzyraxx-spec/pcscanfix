import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scanner', label: 'Scanner' },
  { to: '/results', label: 'Results' },
  { to: '/startup', label: 'Startup' },
  { to: '/uninstaller', label: 'Uninstaller' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

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
  return (
    <div style={s.shell}>
      {/* Title bar */}
      <div style={s.titleBar}>
        <div style={s.brand}>
          <div style={s.logoMark} />
          <span style={s.brandText}>PCScanFix</span>
        </div>

        {/* Window controls */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          <WinBtn label="─" onClick={() => window.electronAPI?.minimizeWindow()} />
          <WinBtn label="□" onClick={() => window.electronAPI?.maximizeWindow()} />
          <WinBtn label="✕" onClick={() => window.electronAPI?.closeWindow()} danger />
        </div>
      </div>

      {/* Menu / nav strip */}
      <div style={s.menuBar}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            ...s.menuItem, ...(isActive ? s.activeItem : {}),
          })}>
            {n.label}
          </NavLink>
        ))}
      </div>
    </div>
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
    paddingLeft: 14,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 20,
    height: 20,
    background: '#0078d4',
    borderRadius: 1,
    flexShrink: 0,
  },
  brandText: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.875rem',
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
};
