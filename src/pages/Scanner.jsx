import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'junk', label: 'Junk & Temp Files', desc: 'Temp files, system logs, trash' },
  { id: 'browsers', label: 'Browser Cache', desc: 'Chrome, Firefox, Safari, Edge' },
  { id: 'duplicates', label: 'Duplicate Files', desc: 'Hash-based duplicate detection' },
  { id: 'largeFiles', label: 'Large Files', desc: 'Files over 100 MB' },
  { id: 'malware', label: 'Malware & Threats', desc: 'Suspicious files and executables' },
];

const SCAN_STEPS = [
  { category: 'junk', label: 'Scanning temp & junk files...', pct: 20 },
  { category: 'browsers', label: 'Scanning browser caches...', pct: 40 },
  { category: 'duplicates', label: 'Finding duplicate files...', pct: 65 },
  { category: 'largeFiles', label: 'Locating large files...', pct: 85 },
  { category: 'malware', label: 'Checking for threats...', pct: 100 },
];

export default function Scanner({ onScanComplete }) {
  const [selected, setSelected] = useState(new Set(CATEGORIES.map(c => c.id)));
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const navigate = useNavigate();
  const cleanup = useRef(null);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function startScan() {
    setScanning(true);
    setProgress(0);
    setCurrentStep('Initializing scan...');

    cleanup.current = window.electronAPI?.onScanProgress(({ category, progress: p }) => {
      const step = SCAN_STEPS.find(s => s.category === category);
      if (step) setCurrentStep(step.label);
      setProgress(p);
    });

    try {
      const results = await window.electronAPI?.startScan({ categories: [...selected] });
      onScanComplete(results);
      setProgress(100);
      setCurrentStep('Scan complete');
      setTimeout(() => navigate('/results'), 800);
    } catch (err) {
      console.error(err);
      setCurrentStep('Scan failed.');
      setScanning(false);
    } finally {
      cleanup.current?.();
    }
  }

  if (scanning) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, background: 'var(--primary-light)', borderRadius: 16,
          margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} className="pulse">
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8 }} />
        </div>
        <h2 style={{ marginBottom: 8 }}>Scanning your system...</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32 }}>{currentStep}</p>
        <div className="card" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{progress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCAN_STEPS.map(s => (
              <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: progress >= s.pct ? 'var(--success)' : 'var(--border)',
                  display: 'inline-block',
                }} />
                <span style={{ color: progress >= s.pct ? 'var(--text)' : 'var(--muted)' }}>
                  {CATEGORIES.find(c => c.id === s.category)?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">System Scanner</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Select what you want to scan, then start. Deep scan covers all categories.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat.id}
            onClick={() => toggle(cat.id)}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              border: selected.has(cat.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: selected.has(cat.id) ? 'rgba(79,70,229,0.04)' : 'var(--card)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: selected.has(cat.id) ? 'var(--primary-light)' : 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: selected.has(cat.id) ? 'var(--primary)' : 'var(--border)',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{cat.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>{cat.desc}</div>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${selected.has(cat.id) ? 'var(--primary)' : 'var(--border)'}`,
              background: selected.has(cat.id) ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s',
            }}>
              {selected.has(cat.id) && '+'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary"
          onClick={startScan}
          disabled={selected.size === 0}
          style={{ fontSize: '1rem', padding: '12px 32px' }}
        >
          Start Scan ({selected.size} categories)
        </button>
        <button className="btn btn-ghost" onClick={() => setSelected(new Set(CATEGORIES.map(c => c.id)))}>
          Select All
        </button>
        <button className="btn btn-ghost" onClick={() => setSelected(new Set())}>
          Clear
        </button>
      </div>
    </div>
  );
}
