import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function fmt(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes || 1) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}


const RISK_STYLE = {
  safe:     { bg: '#e8f5e9', fg: '#1b5e20', label: 'Safe' },
  review:   { bg: '#fff8e1', fg: '#7a5b00', label: 'Review' },
  advanced: { bg: '#ffebee', fg: '#b71c1c', label: 'Advanced' },
};

function RiskBadge({ risk }) {
  const r = RISK_STYLE[risk] || RISK_STYLE.safe;
  return (
    <span style={{
      fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: r.bg, color: r.fg, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{r.label}</span>
  );
}

function FileRow({ item, checked, onToggle, onOpen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: '0.84rem' }}>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--primary)', width: 14, height: 14, cursor: 'pointer' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.name}
          {item.risk && <RiskBadge risk={item.risk} />}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.path}</div>
      </div>
      <div style={{ color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 56, textAlign: 'right' }}>{fmt(item.size)}</div>
      <button onClick={() => onOpen(item.path)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', fontSize: '0.78rem', fontWeight: 600 }}>
        Open
      </button>
    </div>
  );
}

function DupeGroup({ group, selected, onToggle }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--muted)' }}>{group.files.length} copies · {fmt(group.size)} each</span>
        <span style={{ color: 'var(--warning)' }}>Wasting {fmt(group.size * (group.files.length - 1))}</span>
      </div>
      {group.files.map((f, i) => (
        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 4px 16px', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={!!selected[f]} onChange={() => onToggle(f)}
            disabled={i === 0} style={{ accentColor: 'var(--primary)', cursor: i === 0 ? 'default' : 'pointer' }} />
          <span style={{ flex: 1, color: i === 0 ? 'var(--muted)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f} {i === 0 && <span style={{ color: 'var(--success)', fontSize: '0.7rem' }}>(keep)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Results({ scanResults }) {
  const [tab, setTab] = useState('junk');
  const [selected, setSelected] = useState({});
  const [cleaning, setCleaning] = useState(false);
  const [done, setDone] = useState(null);
  const navigate = useNavigate();

  // Auto-select junk and browser files when scan results arrive.
  // Default: only auto-select 'safe' items. Advanced Mode auto-selects 'review' too;
  // 'advanced' (e.g. Windows.old) is never auto-selected — always explicit user opt-in.
  useEffect(() => {
    if (!scanResults) return;
    let advancedMode = false;
    try { advancedMode = !!JSON.parse(localStorage.getItem('pcfixscan_settings') || '{}').advancedMode; } catch {}
    const auto = {};
    (scanResults.junk || []).forEach(f => {
      if (f.risk === 'safe' || (advancedMode && f.risk === 'review')) auto[f.path] = true;
    });
    (scanResults.browsers || []).forEach(f => { auto[f.path] = true; });
    setSelected(auto);
    setDone(null);
  }, [scanResults]);

  if (!scanResults) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        <div style={{ width: 56, height: 56, background: 'var(--primary-light)', borderRadius: 14, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: 7 }} />
        </div>
        <h2 style={{ marginBottom: 8 }}>No results yet</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Run a scan first to see results here.</p>
        <button className="btn btn-primary" onClick={() => navigate('/scanner')}>Go to Scanner</button>
      </div>
    );
  }

  const junk = scanResults.junk || [];
  const browsers = scanResults.browsers || [];
  const dupes = scanResults.duplicates || [];
  const large = scanResults.largeFiles || [];
  const malware = scanResults.malware || [];

  const TABS = [
    { id: 'junk', label: 'Junk', count: junk.length },
    { id: 'browsers', label: 'Browser', count: browsers.length },
    { id: 'duplicates', label: 'Duplicates', count: dupes.length },
    { id: 'large', label: 'Large Files', count: large.length },
    { id: 'malware', label: 'Threats', count: malware.length },
  ];

  function toggleFile(p) { setSelected(prev => ({ ...prev, [p]: !prev[p] })); }
  function selectAll(paths) { setSelected(prev => { const n = { ...prev }; paths.forEach(p => { n[p] = true; }); return n; }); }
  function deselectAll(paths) { setSelected(prev => { const n = { ...prev }; paths.forEach(p => { delete n[p]; }); return n; }); }

  const selectedPaths = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  const allItems = [...junk, ...browsers, ...large, ...malware];
  const selectedSize = allItems.filter(f => selected[f.path]).reduce((s, f) => s + (f.size || 0), 0);

  async function clean() {
    if (!selectedPaths.length) return;
    setCleaning(true);
    try {
      const result = await window.electronAPI.cleanFiles(selectedPaths, selectedSize);
      setDone(result);
      setSelected({});
    } finally {
      setCleaning(false);
    }
  }

  function renderList(items) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => selectAll(items.map(f => f.path))}>Select All</button>
          <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => deselectAll(items.map(f => f.path))}>Deselect</button>
        </div>
        {items.length === 0
          ? <div style={{ color: 'var(--success)', textAlign: 'center', padding: 32, fontWeight: 500 }}>No items found</div>
          : items.map(f => <FileRow key={f.path} item={f} checked={!!selected[f.path]} onToggle={() => toggleFile(f.path)} onOpen={p => window.electronAPI?.openPath(p)} />)}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Scan Results</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selectedPaths.length > 0 && (
            <span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{selectedPaths.length} selected · {fmt(selectedSize)} to free</span>
          )}
          <button className="btn btn-danger" onClick={clean} disabled={selectedPaths.length === 0 || cleaning}>
            {cleaning ? 'Cleaning...' : `Clean (${selectedPaths.length})`}
          </button>
        </div>
      </div>

      {done && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <span>{done.success} items cleaned{done.failed > 0 ? `, ${done.failed} failed` : ''}</span>
          <button onClick={() => setDone(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>x</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
            color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: tab === t.id ? 600 : 400, fontSize: '0.88rem', display: 'flex', gap: 6, alignItems: 'center',
          }}>
            {t.label}
            {t.count > 0 && <span className={`badge ${t.id === 'malware' && t.count > 0 ? 'badge-danger' : 'badge-primary'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'junk' && renderList(junk)}
        {tab === 'browsers' && renderList(browsers)}
        {tab === 'large' && renderList(large)}
        {tab === 'malware' && (
          <div>
            {malware.length === 0
              ? <div style={{ color: 'var(--success)', textAlign: 'center', padding: 32, fontWeight: 500 }}>No threats detected</div>
              : malware.map(f => (
                <div key={f.path} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={!!selected[f.path]} onChange={() => toggleFile(f.path)} style={{ accentColor: 'var(--danger)', marginTop: 3, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                        <span className={`tag ${f.severity === 'high' ? 'tag-red' : 'tag-yellow'}`}>{f.severity}</span>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{f.path}</div>
                      <div style={{ color: 'var(--warning)', fontSize: '0.78rem', marginTop: 2 }}>Warning: {f.reason}</div>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{fmt(f.size)}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
        {tab === 'duplicates' && (
          <div>
            {dupes.length === 0
              ? <div style={{ color: 'var(--success)', textAlign: 'center', padding: 32, fontWeight: 500 }}>No duplicates found</div>
              : dupes.map(g => <DupeGroup key={g.hash} group={g} selected={selected} onToggle={toggleFile} />)}
          </div>
        )}
      </div>
    </div>
  );
}
