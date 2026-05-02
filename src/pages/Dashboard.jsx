import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Paywall from '../components/Paywall.jsx';

function fmt(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}
function pct(used, total) { return total ? Math.round((used / total) * 100) : 0; }

function UsageBar({ used, total, color }) {
  const p = pct(used, total);
  const barColor = p > 85 ? 'var(--danger)' : p > 65 ? 'var(--warning)' : (color || 'var(--primary)');
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>{fmt(used)} used</span>
        <span style={{ fontWeight: 600, color: barColor }}>{p}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${p}%`, background: barColor }} />
      </div>
      <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>{fmt(total - used)} free</div>
    </div>
  );
}

function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease', strokeLinecap: 'round' }} />
      </svg>
      <div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>Health Score</div>
        <div style={{ color, fontWeight: 600, fontSize: '0.85rem', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ scanResults, access, refreshAccess }) {
  const [info, setInfo] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const navigate = useNavigate();
  const licensed = access && (access.reason === 'admin' || access.reason === 'license');
  const unlocked = !!access?.unlocked;

  useEffect(() => {
    window.electronAPI?.getSystemInfo().then(setInfo).catch(() => {});
  }, []);

  // One-click Optimize: scan junk + browser caches, then auto-clean only items tagged risk='safe'.
  // Why "safe only": the spec forbids fake/aggressive cleanup; Review/Advanced items always require
  // a human glance, so we surface them in /results with a CTA instead of deleting them silently.
  async function oneClickOptimize() {
    if (!window.electronAPI) return;
    if (!unlocked) { setPaywall(true); return; }
    setOptimizing(true);
    setOptResult(null);
    try {
      const results = await window.electronAPI.startScan({ categories: ['junk', 'browsers'] });
      const safePaths = [];
      let safeBytes = 0;
      for (const j of results.junk || []) {
        if (j.risk === 'safe') { safePaths.push(j.path); safeBytes += j.size || 0; }
      }
      for (const b of results.browsers || []) {
        // Browser caches are always safe to delete (regenerate on next launch)
        for (const f of b.files || []) safePaths.push(f);
        safeBytes += b.size || 0;
      }
      if (!safePaths.length) {
        setOptResult({ ok: 0, freed: 0, message: 'Nothing safe to clean — system is already tidy.' });
      } else {
        const r = await window.electronAPI.cleanFiles(safePaths, safeBytes);
        setOptResult({ ok: r.success, blocked: r.blocked || 0, freed: safeBytes });
      }
    } finally {
      setOptimizing(false);
    }
  }

  const totalJunk = scanResults
    ? [...(scanResults.junk || []), ...(scanResults.browsers || [])].reduce((s, f) => s + (f.size || 0), 0)
    : 0;

  const healthScore = info
    ? Math.max(0, Math.round(100
        - pct(info.memory.used, info.memory.total) * 0.3
        - pct(info.disk.used, info.disk.total) * 0.4
        - Math.min(40, totalJunk / (1024 * 1024 * 50)) * 0.3))
    : 85;

  return (
    <div>
      <h1 className="page-title">System Overview</h1>

      {!unlocked && (
        <div style={{ background: 'linear-gradient(135deg, #eef4ff 0%, #e0ecff 100%)', border: '1px solid #c7d8ff', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1b3a8a', marginBottom: 10 }}>
            How PCFixScan works
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { n: 1, t: 'Scan free', d: 'Run a scan from the Scanner tab — no card, no trial. See exactly what is wasting space.' },
              { n: 2, t: 'Review results', d: 'Open Results to view junk, browser cache, duplicates, large files, and threats.' },
              { n: 3, t: 'Subscribe to clean', d: 'Press Clean (or One-Click Optimize) and subscribe — $19.99/month, cancel anytime.' },
            ].map(step => (
              <div key={step.n} style={{ flex: '1 1 200px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0078d4', color: '#fff', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1b3a8a' }}>{step.t}</div>
                  <div style={{ fontSize: '0.78rem', color: '#3f4f7a', lineHeight: 1.45, marginTop: 2 }}>{step.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/scanner')} style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Start free scan
            </button>
            <button onClick={() => setPaywall(true)} style={{ background: '#fff', color: '#0078d4', border: '1px solid #0078d4', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Subscribe — $19.99/month
            </button>
          </div>
        </div>
      )}
      {licensed && access.reason === 'license' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#1b5e20' }}>
          ✓ Licensed — full version active
        </div>
      )}

      <Paywall
        open={paywall}
        onClose={() => setPaywall(false)}
        onUnlocked={async () => { await refreshAccess?.(); setPaywall(false); }}
      />

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <ScoreRing score={healthScore} />
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {scanResults ? 'Based on last scan results' : 'Run a scan for accurate results'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={optimizing} onClick={oneClickOptimize}>
                {optimizing ? 'Optimizing…' : unlocked ? '⚡ One-Click Optimize' : '🔒 One-Click Optimize'}
              </button>
              <button className="btn" onClick={() => navigate('/scanner')}>
                {scanResults ? 'Run New Scan' : 'Start Scan'}
              </button>
            </div>
            {optResult && (
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--success)' }}>
                {optResult.message
                  || `Cleaned ${optResult.ok} item${optResult.ok === 1 ? '' : 's'} — freed ${fmt(optResult.freed)}.`}
                {optResult.blocked > 0 && ` (${optResult.blocked} skipped by safety guard.)`}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Processor</div>
          <div style={{ fontWeight: 600, marginBottom: 4, marginTop: 8 }}>{info?.cpu.model || '—'}</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            {info?.cpu.cores || '—'} cores &nbsp;·&nbsp; {info?.platform === 'darwin' ? 'macOS' : 'Windows'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 4 }}>
            Uptime: {info ? `${Math.floor(info.uptime / 3600)}h ${Math.floor((info.uptime % 3600) / 60)}m` : '—'}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 14 }}>Disk Usage</div>
          <UsageBar used={info?.disk.used || 0} total={info?.disk.total || 1} />
        </div>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 14 }}>Memory Usage</div>
          <UsageBar used={info?.memory.used || 0} total={info?.memory.total || 1} color="var(--secondary)" />
        </div>
      </div>

      {scanResults ? (
        <div className="grid-4">
          {[
            { label: 'Junk Files', value: scanResults.junk?.length || 0, size: (scanResults.junk || []).reduce((s, f) => s + f.size, 0), color: 'var(--warning)' },
            { label: 'Browser Cache', value: scanResults.browsers?.length || 0, size: (scanResults.browsers || []).reduce((s, f) => s + f.size, 0), color: 'var(--cyan)' },
            { label: 'Duplicates', value: scanResults.duplicates?.length || 0, size: (scanResults.duplicates || []).reduce((s, g) => s + g.size * (g.files.length - 1), 0), color: 'var(--secondary)' },
            { label: 'Threats', value: scanResults.malware?.length || 0, size: 0, color: scanResults.malware?.length ? 'var(--danger)' : 'var(--success)' },
          ].map(item => (
            <div key={item.label} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/results')}>
              <div className="stat-label">{item.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: item.color, margin: '8px 0 4px' }}>{item.value}</div>
              {item.size > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmt(item.size)}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary-light)', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, background: 'var(--primary)', borderRadius: 6 }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>No scan data available</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.875rem' }}>
            Run a scan to identify junk files, browser cache, duplicates, and potential threats.
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/scanner')}>Run First Scan</button>
        </div>
      )}
    </div>
  );
}
