import { useEffect, useState } from 'react';

export default function RegistryCleaner() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState({});
  const [backups, setBackups] = useState([]);

  useEffect(() => { refresh(); refreshBackups(); }, []);

  async function refresh() {
    if (!window.electronAPI) return;
    const r = await window.electronAPI.scanRegistry();
    setData(r);
  }
  async function refreshBackups() {
    if (!window.electronAPI) return;
    setBackups(await window.electronAPI.listRegBackups());
  }

  function toggle(idx) { setSelected(s => ({ ...s, [idx]: !s[idx] })); }

  async function clean() {
    const items = (data?.items || []).filter((_, i) => selected[i]);
    if (!items.length) return;
    if (!confirm(`Delete ${items.length} registry entr${items.length === 1 ? 'y' : 'ies'}? A .reg backup will be saved automatically before each delete.`)) return;
    setBusy(true);
    const r = await window.electronAPI.cleanRegistry(items);
    setBusy(false);
    setResult(r);
    setSelected({});
    refresh();
    refreshBackups();
  }

  async function restore(file) {
    if (!confirm(`Restore from ${file.split(/[\\/]/).pop()}? This re-imports the saved keys.`)) return;
    const r = await window.electronAPI.restoreRegBackup(file);
    if (r.ok) alert('Backup restored.');
    else alert(`Restore failed: ${r.error}`);
    refresh();
  }

  if (!window.electronAPI) {
    return (<div><h1 className="page-title">Registry</h1><div className="card">Desktop only.</div></div>);
  }
  if (!data) return (<div><h1 className="page-title">Registry</h1><div className="card">Scanning…</div></div>);
  if (data.supported === false) {
    return (
      <div>
        <h1 className="page-title">Registry</h1>
        <div className="card">
          <p style={{ margin: 0 }}>The Windows registry doesn't exist on macOS. This page is only useful on Windows.</p>
        </div>
      </div>
    );
  }

  const totalSelected = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Registry</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={refresh}>Rescan</button>
          <button className="btn btn-primary" disabled={busy || !totalSelected} onClick={clean}>
            {busy ? 'Cleaning…' : `Delete ${totalSelected} (with backup)`}
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
        Each delete writes a .reg backup file you can re-import to undo. We never delete without a successful backup.
      </div>

      {result && (
        <div className="card" style={{ marginBottom: 12, background: result.failed ? '#fff8e1' : '#e8f5e9' }}>
          {result.success} cleaned, {result.failed} failed.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="stat-label" style={{ marginBottom: 10 }}>Found {data.items.length} suspect entr{data.items.length === 1 ? 'y' : 'ies'}</div>
        {data.items.length === 0 && <div style={{ color: 'var(--muted)' }}>Nothing to clean — registry looks tidy.</div>}
        {data.items.map((it, i) => (
          <label key={i} style={{
            display: 'flex', gap: 10, padding: '8px 10px', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'center',
          }}>
            <input type="checkbox" checked={!!selected[i]} onChange={() => toggle(i)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{it.name || it.key}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', wordBreak: 'break-all' }}>{it.key}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                {it.kind === 'startup-orphan' ? `Startup target missing: ${it.target}` : it.reason}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10,
              background: it.risk === 'safe' ? '#e8f5e9' : '#fff8e1' }}>{it.risk}</span>
          </label>
        ))}
      </div>

      {backups.length > 0 && (
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 10 }}>Backups</div>
          {backups.slice(0, 10).map(b => (
            <div key={b.file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem' }}>{b.name}</div>
              <button className="btn" onClick={() => restore(b.file)}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
