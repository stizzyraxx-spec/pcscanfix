import { useEffect, useState } from 'react';

function fmt(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes || 1) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      window.electronAPI?.getHistory(),
      window.electronAPI?.getHistoryStats(),
    ]).then(([h, s]) => { setHistory(h || []); setStats(s); });
  }, []);

  return (
    <div>
      <h1 className="page-title">Cleaning History</h1>

      {stats && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Scans', value: stats.totalScans, color: 'var(--primary)' },
            { label: 'Total Cleans', value: stats.totalCleans, color: 'var(--secondary)' },
            { label: 'Lifetime Freed', value: fmt(stats.totalBytesFreed), color: 'var(--success)' },
            { label: 'Items Cleaned', value: stats.totalItemsCleaned.toLocaleString(), color: 'var(--cyan)' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginTop: 8 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary-light)', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, background: 'var(--primary)', borderRadius: 6 }} />
          </div>
          <div style={{ color: 'var(--muted)' }}>No history yet. Run a scan to get started.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.map((entry, i) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: entry.type === 'clean' ? 'rgba(22,163,74,0.12)' : 'rgba(79,70,229,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: entry.type === 'clean' ? 'var(--success)' : 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                  {entry.type === 'scan'
                    ? `Scan complete — ${entry.totalItems} items found`
                    : `Cleaned ${entry.itemsCleaned} items`}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 2 }}>
                  {new Date(entry.date).toLocaleString()}
                  {entry.type === 'scan' && entry.categories && ` · ${entry.categories.join(', ')}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {entry.type === 'clean' && (
                  <div style={{ color: 'var(--success)', fontWeight: 700 }}>+{fmt(entry.bytesFreed)}</div>
                )}
                {entry.type === 'scan' && entry.totalSize > 0 && (
                  <div style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>{fmt(entry.totalSize)} found</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
