import { useEffect, useState } from 'react';

function fmt(bytes) {
  if (!bytes) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes || 1) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function Uninstaller() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [leftovers, setLeftovers] = useState(null);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [checkedLeft, setCheckedLeft] = useState(new Set());
  const [uninstalling, setUninstalling] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.electronAPI?.getInstalledApps()
      .then(list => { setApps(list || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function pick(app) {
    setSelected(app);
    setLeftovers(null);
    setCheckedLeft(new Set());
    setLoadingLeft(true);
    const found = await window.electronAPI?.getAppLeftovers(app) || [];
    setLeftovers(found);
    setCheckedLeft(new Set(found.map(f => f.path)));
    setLoadingLeft(false);
  }

  async function doUninstall() {
    if (!selected) return;
    setUninstalling(true);
    const result = await window.electronAPI?.uninstallApp(selected, [...checkedLeft]);
    setUninstalling(false);
    if (result?.ok) {
      setToast(`${selected.name} removed`);
      setApps(prev => prev.filter(a => a.path !== selected.path));
      setSelected(null);
      setLeftovers(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const filtered = apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  function toggleLeft(p) {
    setCheckedLeft(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }

  return (
    <div>
      <h1 className="page-title">App Uninstaller</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: '0.9rem' }}>
        Fully remove apps including leftover cache, preferences, and support files.
      </p>

      {toast && (
        <div className="card" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid var(--success)', marginBottom: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--success)' }}>✓ {toast}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div>
          <input
            type="text"
            placeholder="Search apps…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', marginBottom: 10, padding: '8px 12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: '0.88rem',
            }}
          />
          <div className="card" style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No apps found</div>}
            {filtered.map((app, i) => (
              <div key={app.path} onClick={() => pick(app)} style={{
                padding: '11px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: selected?.path === app.path ? 'rgba(99,102,241,0.07)' : 'transparent',
                borderLeft: selected?.path === app.path ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{app.name}</div>
                  {app.version && <div style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>{app.version}</div>}
                </div>
                {app.size > 0 && <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{fmt(app.size)}</div>}
              </div>
            ))}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ color: 'var(--muted)', fontWeight: 500 }}>Select an app to inspect</div>
            </div>
          ) : (
            <div className="card">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 2 }}>{selected.name}</div>
                {selected.version && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>v{selected.version}</div>}
                {selected.bundleId && <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>{selected.bundleId}</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  Leftover Files
                  {loadingLeft && <span style={{ color: 'var(--muted)', fontWeight: 400 }} className="pulse">scanning…</span>}
                </div>
                {leftovers?.length === 0 && (
                  <div style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ No leftover files found</div>
                )}
                {leftovers?.map(f => (
                  <div key={f.path} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={checkedLeft.has(f.path)} onChange={() => toggleLeft(f.path)}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{f.path}</div>
                    {f.size > 0 && <div style={{ color: 'var(--muted)', flexShrink: 0 }}>{fmt(f.size)}</div>}
                  </div>
                ))}
              </div>

              <button className="btn btn-danger" onClick={doUninstall} disabled={uninstalling}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}>
                {uninstalling
                  ? 'Removing...'
                  : `Uninstall${checkedLeft.size > 0 ? ` + ${checkedLeft.size} leftover${checkedLeft.size !== 1 ? 's' : ''}` : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
