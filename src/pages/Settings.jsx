import { useState } from 'react';

const DEFAULT = {
  largeFileThreshold: 100,
  scanDepth: 4,
  excludePaths: '',
  trashMode: true,
  autoScan: true,                  // default ON — app runs in background and scans automatically
  autoScanInterval: 'hourly',      // default frequent — junk piles up fast
  advancedMode: false,             // gates registry/disk tools and Review/Advanced cleanup tiers
  smartTriggerDisk: true,          // run a scan when disk free drops below the threshold
  smartTriggerMemory: true,        // run a scan when memory usage spikes above the threshold
  diskFreePctBelow: 15,
  memoryPctAbove: 85,
};

export default function Settings() {
  const [s, setS] = useState(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('pcfixscan_settings') || '{}') }; }
    catch { return DEFAULT; }
  });
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem('pcfixscan_settings', JSON.stringify(s));
    window.electronAPI?.saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function row(label, desc, children) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{label}</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{desc}</div>
        </div>
        <div>{children}</div>
      </div>
    );
  }

  function toggle(val, checked) { return (
    <div onClick={() => setS(p => ({ ...p, [val]: !p[val] }))} style={{
      width: 44, height: 24, borderRadius: 12, background: s[val] ? 'var(--primary)' : 'var(--border)',
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: s[val] ? 23 : 3, transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  ); }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="page-title">Settings</h1>

      <div className="card">
        {row('Auto-Scan', 'Automatically scan on a schedule and notify when junk is found',
          toggle('autoScan')
        )}

        {s.autoScan && row('Scan Schedule', 'How often the background daemon scans for junk',
          <select value={s.autoScanInterval} onChange={e => setS(p => ({ ...p, autoScanInterval: e.target.value }))}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)' }}>
            <option value="hourly">Every hour</option>
            <option value="4hr">Every 4 hours</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        )}

        {s.autoScan && row('Smart Trigger: Low Disk', 'Auto-scan when free disk drops below this %',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {toggle('smartTriggerDisk')}
            <input type="number" value={s.diskFreePctBelow} min={5} max={50}
              onChange={e => setS(p => ({ ...p, diskFreePctBelow: parseInt(e.target.value) || 15 }))}
              style={{ width: 60, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', textAlign: 'center' }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%</span>
          </div>
        )}

        {s.autoScan && row('Smart Trigger: High RAM', 'Auto-scan when memory usage exceeds this %',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {toggle('smartTriggerMemory')}
            <input type="number" value={s.memoryPctAbove} min={50} max={95}
              onChange={e => setS(p => ({ ...p, memoryPctAbove: parseInt(e.target.value) || 85 }))}
              style={{ width: 60, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', textAlign: 'center' }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>%</span>
          </div>
        )}

        {row('Advanced Mode', 'Reveals registry tools, disk health, and Review/Advanced-tier cleanup',
          toggle('advancedMode')
        )}

        {row('Large File Threshold', 'Files bigger than this appear in the Large Files scan',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={s.largeFileThreshold} min={10} max={5000}
              onChange={e => setS(p => ({ ...p, largeFileThreshold: parseInt(e.target.value) || 100 }))}
              style={{ width: 70, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', textAlign: 'center' }} />
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>MB</span>
          </div>
        )}

        {row('Scan Depth', 'How deep to recurse into subdirectories',
          <select value={s.scanDepth} onChange={e => setS(p => ({ ...p, scanDepth: parseInt(e.target.value) }))}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)' }}>
            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} levels</option>)}
          </select>
        )}

        {row('Delete Mode', 'Move to Trash (recoverable) or permanently delete',
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ val: true, label: 'Trash' }, { val: false, label: 'Permanent' }].map(opt => (
              <button key={String(opt.val)} onClick={() => setS(p => ({ ...p, trashMode: opt.val }))} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                background: s.trashMode === opt.val ? 'var(--primary)' : 'var(--border)',
                color: s.trashMode === opt.val ? '#fff' : 'var(--muted)',
              }}>{opt.label}</button>
            ))}
          </div>
        )}

        {row('Exclude Paths', 'Comma-separated paths to skip during scan',
          <textarea value={s.excludePaths} onChange={e => setS(p => ({ ...p, excludePaths: e.target.value }))}
            placeholder="~/Projects, ~/Work"
            style={{ width: 240, height: 60, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', resize: 'none', fontSize: '0.82rem' }} />
        )}

        <div style={{ paddingTop: 18 }} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={save}>Save Settings</button>
        {saved && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Saved</span>}
        <button className="btn btn-ghost" onClick={() => setS(DEFAULT)}>Reset Defaults</button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>About PCFixScan</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.7 }}>
          <div>Version 1.0.0 · {window.electronAPI?.platform === 'darwin' ? 'macOS' : 'Windows'}</div>
          <div style={{ marginTop: 8 }}>
            Scans for junk files, browser cache, duplicates, large files, and suspicious executables.
            Includes startup manager, app uninstaller with leftover cleanup, and cleaning history.
          </div>
          <div style={{ marginTop: 10 }}>
            <span
              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.electronAPI?.openURL('https://pcfixscan.com')}
            >
              pcfixscan.com
            </span>
            {' '}·{' '}
            <span
              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.electronAPI?.openURL('https://pcfixscan.com/support')}
            >
              Support
            </span>
            {' '}·{' '}
            <span
              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.electronAPI ? window.electronAPI.openURL('https://pcfixscan.com/buy') : (window.location.href = '/buy')}
            >
              Purchase License
            </span>
          </div>
          <div style={{ marginTop: 8, color: 'var(--warning)', fontSize: '0.78rem' }}>
            Malware detection is heuristic-based — not a replacement for dedicated antivirus software.
          </div>
        </div>
      </div>
    </div>
  );
}
