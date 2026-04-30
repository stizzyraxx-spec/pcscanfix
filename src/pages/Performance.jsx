import { useEffect, useRef, useState } from 'react';

function fmt(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function Bar({ label, percent, sub }) {
  const color = percent > 85 ? 'var(--danger)' : percent > 65 ? 'var(--warning)' : 'var(--primary)';
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, marginTop: 6 }}>{percent}%</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>{sub}</div>}
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${percent}%`, background: color }} /></div>
    </div>
  );
}

export default function Performance() {
  const [snap, setSnap] = useState(null);
  const [running, setRunning] = useState(true);
  const [pausedSnap, setPausedSnap] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const tick = async () => {
      try {
        const s = await window.electronAPI?.getPerformanceSnapshot();
        if (s) setSnap(s);
      } catch {}
    };
    tick();
    timerRef.current = setInterval(tick, 2000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const view = running ? snap : (pausedSnap || snap);
  const isElectron = !!window.electronAPI;

  if (!isElectron) {
    return (
      <div>
        <h1 className="page-title">Performance</h1>
        <div className="card">
          <p style={{ margin: 0, color: 'var(--muted)' }}>The real-time performance monitor is only available in the desktop app.</p>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div>
        <h1 className="page-title">Performance</h1>
        <div className="card"><p style={{ margin: 0, color: 'var(--muted)' }}>Sampling…</p></div>
      </div>
    );
  }

  async function killProc(pid) {
    if (!confirm(`Terminate process ${pid}?`)) return;
    const r = await window.electronAPI.killProcess(pid);
    if (!r.success) alert(`Could not terminate: ${r.error}`);
  }

  function togglePause() {
    if (running) setPausedSnap(snap);
    setRunning(!running);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Performance</h1>
        <button className="btn" onClick={togglePause}>{running ? 'Pause' : 'Resume'}</button>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <Bar label="CPU" percent={view.cpu} sub={`${view.processCount} processes`} />
        <Bar label="Memory" percent={view.memory.percent} sub={`${fmt(view.memory.used)} of ${fmt(view.memory.total)}`} />
        <Bar label="Disk" percent={view.disk.percent} sub={`${fmt(view.disk.free)} free`} />
      </div>

      {view.suggestions?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="stat-label" style={{ marginBottom: 10 }}>Suggestions</div>
          {view.suggestions.map((s, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 6, marginBottom: 6,
              background: s.severity === 'high' ? '#ffebee' : '#fff8e1',
              borderLeft: `3px solid ${s.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}`,
              fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}>
              <span>{s.text}</span>
              {s.pid && <button className="btn" onClick={() => killProc(s.pid)}>End</button>}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="stat-label" style={{ marginBottom: 10 }}>Top Processes</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
              <th style={{ padding: '6px 8px' }}>Name</th>
              <th style={{ padding: '6px 8px' }}>PID</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>CPU%</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>RAM%</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {view.processes.map(p => (
              <tr key={p.pid} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{p.pid}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.cpu}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.mem}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  <button className="btn" onClick={() => killProc(p.pid)}>End</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
