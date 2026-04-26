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

export default function Sidebar() {
  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.logoMark} />
        <span style={s.brandText}>PCScanFix</span>
      </div>

      <div style={s.section}>MENU</div>
      <nav style={s.nav}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            ...s.link, ...(isActive ? s.active : {}),
          })}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div style={s.footer}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>v1.0.0</span>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 'var(--sidebar-w)',
    minWidth: 'var(--sidebar-w)',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 0,
    WebkitAppRegion: 'drag',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '22px 22px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  logoMark: {
    width: 26,
    height: 26,
    background: 'var(--primary)',
    borderRadius: 6,
    flexShrink: 0,
  },
  brandText: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '-0.01em',
  },
  section: {
    padding: '20px 22px 8px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  nav: { flex: 1, WebkitAppRegion: 'no-drag', padding: '0 12px' },
  link: {
    display: 'block',
    padding: '9px 12px',
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: 7,
    marginBottom: 2,
    transition: 'all 0.12s',
    letterSpacing: '0.005em',
  },
  active: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: 600,
  },
  footer: {
    padding: '16px 22px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
};
