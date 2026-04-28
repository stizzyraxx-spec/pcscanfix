const KEY = 'pcsf_events';
const MAX = 2000;

export function logEvent(type, metadata = {}) {
  try {
    const events = _read();
    events.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, created_at: new Date().toISOString(), metadata });
    if (events.length > MAX) events.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {}
}

export function getEvents() { return _read(); }

export function getStats() {
  const events = _read();
  const today = new Date().toDateString();
  const launches   = events.filter(e => e.type === 'app_launch').length;
  const scans      = events.filter(e => e.type === 'scan_complete').length;
  const bytesFound = events.filter(e => e.type === 'scan_complete').reduce((s, e) => s + (e.metadata?.bytes_found || 0), 0);
  const todayCount = events.filter(e => new Date(e.created_at).toDateString() === today).length;
  const byType = {};
  events.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });
  return { launches, scans, bytesFound, todayCount, byType, recent: events.slice(0, 10), total: events.length };
}

function _read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
