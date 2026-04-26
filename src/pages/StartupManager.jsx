import { useEffect, useState } from 'react';

export default function StartupManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    window.electronAPI?.getStartupItems()
      .then(data => { setItems(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(item) {
    setToggling(item.path);
    const result = await window.electronAPI?.toggleStartupItem(item, !item.enabled);
    if (result?.ok) {
      setItems(prev => prev.map(i => i.path === item.path ? { ...i, enabled: !i.enabled } : i));
    }
    setToggling(null);
  }

  const typeLabel = { 'launch-agent': 'Launch Agent', 'launch-daemon': 'Daemon', 'registry-user': 'Registry', 'startup-folder': 'Startup Folder' };
  const typeColor = { 'launch-daemon': 'tag-red', 'launch-agent': 'tag-blue', 'registry-user': 'tag-blue', 'startup-folder': 'tag-yellow' };

  return (
    <div>
      <h1 className="page-title">Startup Manager</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Manage apps and services that launch at startup. Disabling items speeds up boot time.
      </p>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div className="spin" style={{ display: 'inline-block', fontSize: '1.5rem', marginBottom: 12 }}>◎</div>
          <div>Loading startup items…</div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
          <div style={{ color: 'var(--muted)' }}>No startup items found or access restricted.</div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span>{items.length} items</span>
            <span>{items.filter(i => i.enabled).length} enabled</span>
          </div>
          {items.map((item, idx) => (
            <div key={item.path + idx} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span className={`tag ${typeColor[item.type] || 'tag-blue'}`}>
                    {typeLabel[item.type] || item.type}
                  </span>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.path}
                </div>
              </div>
              <button
                onClick={() => toggle(item)}
                disabled={toggling === item.path}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: item.enabled ? 'var(--success)' : 'var(--border)',
                  transition: 'background 0.2s', position: 'relative', opacity: toggling === item.path ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, transition: 'left 0.2s',
                  left: item.enabled ? 23 : 3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
