import { useEffect, useState } from 'react';

function fmt(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

const ALL_CATEGORIES = [
  { key: 'history',   label: 'Browsing history' },
  { key: 'cookies',   label: 'Cookies' },
  { key: 'sessions',  label: 'Open tabs / sessions' },
  { key: 'cache',     label: 'Cache' },
  { key: 'formdata',  label: 'Form data / autofill' },
  { key: 'downloads', label: 'Download history' },
];

export default function PrivacyCleaner() {
  const [browsers, setBrowsers] = useState(null);
  const [selected, setSelected] = useState({});  // { 'Chrome|Default|history': true }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    if (!window.electronAPI) return;
    const list = await window.electronAPI.scanPrivacy();
    setBrowsers(list);
  }

  function key(b, cat) { return `${b.browser}|${b.profile}|${cat}`; }
  function toggle(b, cat) { setSelected(s => ({ ...s, [key(b, cat)]: !s[key(b, cat)] })); }

  function selectAllCategoriesFor(b) {
    setSelected(s => {
      const next = { ...s };
      const allOn = ALL_CATEGORIES.every(c => !b.categories[c.key] || s[key(b, c.key)]);
      for (const c of ALL_CATEGORIES) {
        if (b.categories[c.key]) next[key(b, c.key)] = !allOn;
      }
      return next;
    });
  }

  async function clearSelected() {
    if (!browsers) return;
    setBusy(true);
    setResult(null);
    let totalFreed = 0, totalOk = 0, totalFail = 0;
    for (const b of browsers) {
      const cats = ALL_CATEGORIES.filter(c => selected[key(b, c.key)]).map(c => c.key);
      if (!cats.length) continue;
      const r = await window.electronAPI.clearPrivacy({
        browser: b.browser, engine: b.engine, profileDir: b.profileDir, categories: cats,
      });
      totalFreed += r.freed || 0;
      totalOk    += r.success || 0;
      totalFail  += r.failed || 0;
    }
    setBusy(false);
    setResult({ freed: totalFreed, ok: totalOk, fail: totalFail });
    setSelected({});
    refresh();
  }

  if (!window.electronAPI) {
    return (
      <div>
        <h1 className="page-title">Privacy</h1>
        <div className="card"><p style={{ margin: 0, color: 'var(--muted)' }}>The privacy cleaner is only available in the desktop app.</p></div>
      </div>
    );
  }
  if (!browsers) return (<div><h1 className="page-title">Privacy</h1><div className="card">Scanning browsers…</div></div>);
  if (browsers.length === 0) return (<div><h1 className="page-title">Privacy</h1><div className="card">No supported browsers detected on this machine.</div></div>);

  const totalSelected = Object.values(selected).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Privacy</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={refresh}>Rescan</button>
          <button className="btn btn-primary" disabled={busy || !totalSelected} onClick={clearSelected}>
            {busy ? 'Clearing…' : `Clear ${totalSelected} selection${totalSelected === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
        Items go to Trash so you can recover them if needed. Close the browser before clearing for clean results.
      </div>

      {result && (
        <div className="card" style={{ marginBottom: 12, background: '#e8f5e9', borderLeft: '3px solid var(--success)' }}>
          Cleared {result.ok} item{result.ok === 1 ? '' : 's'} — freed {fmt(result.freed)}.{result.fail > 0 ? ` ${result.fail} failed (likely in use).` : ''}
        </div>
      )}

      {browsers.map(b => (
        <div className="card" key={`${b.browser}-${b.profile}`} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.browser}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.profile} · {b.engine}</div>
            </div>
            <button className="btn" onClick={() => selectAllCategoriesFor(b)}>Toggle all</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {ALL_CATEGORIES.map(c => {
              const data = b.categories[c.key];
              const disabled = !data;
              const checked = !!selected[key(b, c.key)];
              return (
                <label key={c.key} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6,
                  background: checked ? '#e5f1fb' : '#f7f7f8',
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                }}>
                  <input type="checkbox" disabled={disabled} checked={checked} onChange={() => toggle(b, c.key)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{data ? fmt(data.size) : 'none'}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
