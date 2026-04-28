import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard({ scanResults, access }) {
  const [info, setInfo] = useState(null);
  const navigate = useNavigate();
  const showBanner = access && access.reason === 'trial';
  const licensed = access && (access.reason === 'admin' || access.reason === 'license');

  useEffect(() => {
    window.electronAPI?.getSystemInfo().then(setInfo).catch(() => {});
  }, []);

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

      {showBanner && (
        <div style={{ background: 'linear-gradient(90deg, #0078d4, #005a9e)', borderRadius: 8, padding: '11px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
              Trial — {access.daysLeft} day{access.daysLeft === 1 ? '' : 's'} left
            </span>
            <span style={{ fontSize: '0.8rem', marginLeft: 10, opacity: 0.85 }}>
              Buy a license for unlimited scans and lifetime updates.
            </span>
          </div>
          <button
            onClick={() => window.electronAPI?.openURL('https://pcfixscan.com/buy') || navigate('/buy')}
            style={{ background: '#fff', color: '#0078d4', border: 'none', borderRadius: 6, padding: '5px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, marginLeft: 16 }}
          >
            Buy — $19.99
          </button>
        </div>
      )}
      {licensed && access.reason === 'license' && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '8px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#1b5e20' }}>
          ✓ Licensed — full version active
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <ScoreRing score={healthScore} />
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {scanResults ? 'Based on last scan results' : 'Run a scan for accurate results'}
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
              {scanResults ? 'Run New Scan' : 'Start Scan'}
            </button>
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
