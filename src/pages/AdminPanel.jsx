import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart2, ScrollText, Download, CreditCard, LogOut, RefreshCw,
         Activity, Monitor, Trash2, ChevronLeft, ChevronRight, Filter, Search,
         AlertCircle, CheckCircle, Package, TrendingUp, Users, Zap } from 'lucide-react';
import { getStats, getEvents } from '../utils/analytics.js';
import { supabase } from '../lib/supabase.js';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function adminFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${FN_URL}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res.json();
}

function fmt(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const EVENT_META = {
  app_launch:     { label: 'App Launch',      bg: '#e5f1fb', color: '#0078d4' },
  page_view:      { label: 'Page View',       bg: '#f3f3f3', color: '#767676' },
  scan_start:     { label: 'Scan Started',    bg: '#fff4e0', color: '#ca5010' },
  scan_complete:  { label: 'Scan Complete',   bg: '#e6f1e6', color: '#107c10' },
  clean_complete: { label: 'Files Cleaned',   bg: '#e6f1e6', color: '#107c10' },
  startup_toggle: { label: 'Startup Toggle',  bg: '#e5f1fb', color: '#0078d4' },
  app_uninstall:  { label: 'App Uninstalled', bg: '#fde7e9', color: '#d13438' },
  settings_save:  { label: 'Settings Saved',  bg: '#f3f3f3', color: '#5c2d91' },
};

function EventBadge({ type }) {
  const m = EVENT_META[type] || { label: type, bg: '#f3f3f3', color: '#767676' };
  return (
    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: '0.7rem', fontWeight: 600,
      background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2, padding: '14px 16px',
      borderTop: `3px solid ${accent || '#0078d4'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#767676', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
        <Icon size={15} color={accent || '#0078d4'} />
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1b1b1b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#767676', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const TABS = [
  { id: 'overview',  label: 'Overview',  Icon: BarChart2 },
  { id: 'users',     label: 'Users',     Icon: Users },
  { id: 'purchases', label: 'Licenses',  Icon: CreditCard },
  { id: 'activity',  label: 'Activity',  Icon: Activity },
  { id: 'logs',      label: 'Local Logs',Icon: ScrollText },
  { id: 'downloads', label: 'Downloads', Icon: Download },
];

const EVENT_TYPE_META = {
  'purchase.completed':         { label: 'Purchase',          bg: '#e6f1e6', color: '#107c10' },
  'license.validated':          { label: 'License validated', bg: '#e5f1fb', color: '#0078d4' },
  'license.revoked':            { label: 'License revoked',   bg: '#fde7e9', color: '#d13438' },
  'license.reactivated':        { label: 'License reactivated', bg: '#fff4e0', color: '#ca5010' },
  'auth.signup':                { label: 'Signup',            bg: '#e5f1fb', color: '#0078d4' },
  'auth.login':                 { label: 'Login',             bg: '#f3f3f3', color: '#767676' },
  'auth.password_reset':        { label: 'Password reset',    bg: '#fff4e0', color: '#ca5010' },
};

/* ── Platform Activity Tab (server-backed) ──────────────────────────────────── */
function ActivityTab() {
  const [events, setEvents] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setEvents(null);
    const params = new URLSearchParams({ resource: 'events' });
    if (filter) params.set('filter', filter);
    if (search) params.set('search', search);
    const data = await adminFetch(`/admin-data?${params}`).catch(() => ({ events: [] }));
    setEvents(data.events || []);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  if (events === null) return <div style={{ color: '#767676' }}>Loading…</div>;

  const allTypes = Array.from(new Set(events.map(e => e.type))).sort();

  return (
    <div>
      <div style={s.sectionTitle}>Platform Activity</div>
      <div style={s.sectionSub}>{events.length} events · server-side audit log</div>

      <div style={{ marginTop: 20, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2 }}>
        <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #d1d1d1' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ ...s.input, minWidth: 180 }}>
            <option value="">All event types</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...s.input, flex: 1 }} />
          <button onClick={load} style={{ ...s.input, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <table style={s.table}>
          <thead style={s.thead}>
            <tr>
              <th style={s.th}>Type</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Metadata</th>
              <th style={s.th}>IP</th>
              <th style={s.th}>When</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#999', padding: 24 }}>No events</td></tr>
            )}
            {events.map(ev => {
              const m = EVENT_TYPE_META[ev.type] || { label: ev.type, bg: '#f3f3f3', color: '#767676' };
              return (
                <tr key={ev.id} style={s.tr}>
                  <td style={s.td}>
                    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: '0.7rem', fontWeight: 600, background: m.bg, color: m.color }}>
                      {m.label}
                    </span>
                  </td>
                  <td style={s.td}>{ev.email || '—'}</td>
                  <td style={{ ...s.td, fontFamily: 'SF Mono, Menlo, monospace', fontSize: '0.72rem', color: '#555' }}>
                    {ev.metadata ? JSON.stringify(ev.metadata).slice(0, 60) : '—'}
                  </td>
                  <td style={{ ...s.td, color: '#999', fontSize: '0.78rem' }}>{ev.ip || '—'}</td>
                  <td style={{ ...s.td, color: '#777', fontSize: '0.78rem' }}>{timeAgo(ev.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Activity Logs Tab ──────────────────────────────────────────────────────── */
function LogsTab() {
  const [events, setEvents]   = useState([]);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const LIMIT = 50;

  const load = useCallback(() => {
    let all = getEvents();
    if (filter) all = all.filter(e => e.type === filter);
    if (search) all = all.filter(e =>
      JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
    );
    setEvents(all);
    setPage(0);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const paged     = events.slice(page * LIMIT, (page + 1) * LIMIT);
  const totalPages = Math.ceil(events.length / LIMIT);

  const clearLogs = () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    localStorage.removeItem('pcsf_events');
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={s.sectionTitle}>Activity Logs</div>
          <div style={s.sectionSub}>{events.length.toLocaleString()} events recorded</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost" style={{ height: 30 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={clearLogs} className="btn btn-danger" style={{ height: 30 }}>
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#ababab' }} />
          <input placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...s.input, paddingLeft: 28, width: '100%' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#ababab' }} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...s.input, paddingLeft: 28, minWidth: 160 }}>
            <option value="">All event types</option>
            {Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>Timestamp</th>
              <th style={s.th}>Event</th>
              <th style={s.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#ababab', fontSize: '0.875rem' }}>
                No events found.
              </td></tr>
            )}
            {paged.map(e => (
              <tr key={e.id} style={s.tr}>
                <td style={{ ...s.td, color: '#767676', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {fmtDate(e.created_at)}<br />
                  <span style={{ color: '#ababab', fontSize: '0.7rem' }}>{timeAgo(e.created_at)}</span>
                </td>
                <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                  <EventBadge type={e.type} />
                </td>
                <td style={{ ...s.td, fontSize: '0.78rem', color: '#444', fontFamily: 'monospace', maxWidth: 340 }}>
                  {e.metadata && Object.keys(e.metadata).length > 0
                    ? Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join('  ·  ')
                    : <span style={{ color: '#ababab' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '0.8rem', color: '#767676' }}>
          <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, events.length)} of {events.length}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn btn-ghost" style={{ height: 26, padding: '0 8px' }}>
              <ChevronLeft size={13} />
            </button>
            <span style={{ padding: '0 8px' }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn btn-ghost" style={{ height: 26, padding: '0 8px' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Downloads Tab ──────────────────────────────────────────────────────────── */
function DownloadsTab() {
  return (
    <div>
      <div style={s.sectionTitle}>Downloads Tracking</div>
      <div style={s.sectionSub}>Connect a download counter to track installs across platforms</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
        {[
          { label: 'Mac (.dmg)', value: '—', icon: Monitor, accent: '#5c2d91', note: 'Mac App Store or direct' },
          { label: 'Windows (.exe)', value: '—', icon: Monitor, accent: '#0078d4', note: 'Direct download' },
          { label: 'Total Installs', value: '—', icon: Package, accent: '#107c10', note: 'All platforms combined' },
          { label: 'This Month', value: '—', icon: TrendingUp, accent: '#ca5010', note: 'New installs MTD' },
        ].map(c => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} sub={c.note} accent={c.accent} />
        ))}
      </div>

      <div style={{ ...s.infoBox, marginTop: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.875rem' }}>To enable download tracking:</div>
        <ol style={{ paddingLeft: 18, fontSize: '0.8rem', lineHeight: 1.9, color: '#444' }}>
          <li>Host your DMG/EXE on a server or GitHub Releases</li>
          <li>Add a simple counter endpoint (Cloudflare Worker, Vercel function, or Firebase)</li>
          <li>Call <code style={{ background: '#f3f3f3', padding: '1px 5px', borderRadius: 2 }}>logEvent('download', {'{ platform, version }'})</code> from your download page</li>
          <li>Re-open this panel — stats will populate automatically</li>
        </ol>
      </div>
    </div>
  );
}

/* ── Purchases Tab ──────────────────────────────────────────────────────────── */
function PurchasesTab() {
  const [licenses, setLicenses] = useState(null);
  const [stats, setStats]       = useState(null);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    const [licRes, statRes] = await Promise.all([
      adminFetch('/admin-data?resource=licenses').catch(() => ({ licenses: [] })),
      adminFetch('/admin-data?resource=stats').catch(() => null),
    ]);
    setLicenses(licRes.licenses || []);
    setStats(statRes);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(key, currentStatus) {
    const next = currentStatus === 'active' ? 'revoked' : 'active';
    if (!window.confirm(`${next === 'revoked' ? 'Revoke' : 'Reactivate'} license ${key}?`)) return;
    const r = await adminFetch('/admin-revoke-license', {
      method: 'POST',
      body: JSON.stringify({ key, status: next }),
    });
    if (r.ok) load();
    else alert(`Failed: ${r.error || 'unknown error'}`);
  }

  if (!licenses) return <div style={{ color: '#767676' }}>Loading…</div>;

  const filtered = search
    ? licenses.filter(l => l.key.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase()))
    : licenses;

  return (
    <div>
      <div style={s.sectionTitle}>Licenses</div>
      <div style={s.sectionSub}>{licenses.length} total · {stats?.last30Days || 0} sold in last 30 days</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20 }}>
        <StatCard icon={CreditCard}   label="Total Licenses"  value={licenses.length} accent="#107c10" />
        <StatCard icon={CheckCircle}  label="Active"          value={stats?.activeLicenses ?? '—'} accent="#0078d4" />
        <StatCard icon={AlertCircle}  label="Revoked"         value={stats?.revokedLicenses ?? '—'} accent="#d13438" />
        <StatCard icon={TrendingUp}   label="Last 30 days"    value={stats?.last30Days ?? '—'} sub="new licenses" accent="#ca5010" />
      </div>

      <div style={{ marginTop: 20, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2 }}>
        <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #d1d1d1' }}>
          <input placeholder="Search by key or email…" value={search} onChange={e => setSearch(e.target.value)}
                 style={{ ...s.input, flex: 1 }} />
          <button onClick={load} style={{ ...s.input, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <table style={s.table}>
          <thead style={s.thead}>
            <tr>
              <th style={s.th}>Key</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Created</th>
              <th style={s.th}>Last validated</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#999', padding: 24 }}>No licenses</td></tr>
            )}
            {filtered.map(l => (
              <tr key={l.key} style={s.tr}>
                <td style={{ ...s.td, fontFamily: 'SF Mono, Menlo, monospace', fontSize: '0.78rem' }}>{l.key}</td>
                <td style={s.td}>{l.email}</td>
                <td style={s.td}>
                  <span style={{ padding: '2px 8px', borderRadius: 2, fontSize: '0.7rem', fontWeight: 600,
                    background: l.status === 'active' ? '#e6f1e6' : '#fde7e9',
                    color: l.status === 'active' ? '#107c10' : '#d13438' }}>
                    {l.status}
                  </span>
                </td>
                <td style={s.td}>{fmtDate(l.created_at)}</td>
                <td style={s.td}>{l.last_validated_at ? timeAgo(l.last_validated_at) : '—'}</td>
                <td style={s.td}>
                  <button onClick={() => toggleStatus(l.key, l.status)}
                    style={{ background: 'none', border: '1px solid #c8c8c8', padding: '3px 10px', borderRadius: 2, fontSize: '0.72rem', cursor: 'pointer' }}>
                    {l.status === 'active' ? 'Revoke' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Users Tab ──────────────────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminFetch('/admin-data?resource=users')
      .then(d => setUsers(d.users || []))
      .catch(() => setUsers([]));
  }, []);

  if (!users) return <div style={{ color: '#767676' }}>Loading…</div>;

  const filtered = search
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div>
      <div style={s.sectionTitle}>Users</div>
      <div style={s.sectionSub}>{users.length} registered · email-verified shown in green</div>

      <div style={{ marginTop: 20, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2 }}>
        <div style={{ padding: 12, borderBottom: '1px solid #d1d1d1' }}>
          <input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)}
                 style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <table style={s.table}>
          <thead style={s.thead}>
            <tr>
              <th style={s.th}>Email</th>
              <th style={s.th}>Verified</th>
              <th style={s.th}>Licenses</th>
              <th style={s.th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#999', padding: 24 }}>No users</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={s.tr}>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}>
                  <span style={{ padding: '2px 8px', borderRadius: 2, fontSize: '0.7rem', fontWeight: 600,
                    background: u.email_verified ? '#e6f1e6' : '#fff4e0',
                    color: u.email_verified ? '#107c10' : '#ca5010' }}>
                    {u.email_verified ? 'verified' : 'pending'}
                  </span>
                </td>
                <td style={s.td}>{u.license_count}</td>
                <td style={s.td}>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────────────────────── */
function OverviewTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => { setStats(getStats()); }, []);

  if (!stats) return null;

  const topPages = Object.entries(stats.byType)
    .filter(([k]) => k === 'page_view')
    .map(() => {
      const events = getEvents().filter(e => e.type === 'page_view');
      const byPath = {};
      events.forEach(e => { const p = e.metadata?.path || '—'; byPath[p] = (byPath[p] || 0) + 1; });
      return Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 6);
    })[0] || [];

  const maxPV = topPages[0]?.[1] || 1;

  return (
    <div>
      {/* Live pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#107c10', display: 'inline-block', animation: 'pulse 1.5s ease infinite' }} />
        <span style={{ fontSize: '0.72rem', color: '#767676', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Live data — local session tracking</span>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={Zap}      label="App Launches"    value={stats.launches}                  sub="Total opens"          accent="#0078d4" />
        <StatCard icon={Activity} label="Scans Run"       value={stats.scans}                     sub="Completed scans"      accent="#107c10" />
        <StatCard icon={Package}  label="Junk Found"      value={fmt(stats.bytesFound)}            sub="Across all scans"     accent="#ca5010" />
        <StatCard icon={Users}    label="Events Today"    value={stats.todayCount}                sub="All activity"         accent="#5c2d91" />
      </div>

      {/* Feature usage */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={s.sectionTitle}>Event Breakdown</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const m = EVENT_META[type] || { label: type, color: '#767676' };
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                    <span style={{ color: '#444' }}>{m.label}</span>
                    <span style={{ color: '#767676' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: '#e0e0e0', borderRadius: 0, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
            {stats.total === 0 && <div style={{ color: '#ababab', fontSize: '0.8rem' }}>No events yet. Use the app to generate data.</div>}
          </div>
        </div>

        <div className="card">
          <div style={s.sectionTitle}>Top Pages</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPages.length === 0 && <div style={{ color: '#ababab', fontSize: '0.8rem' }}>No page view data yet.</div>}
            {topPages.map(([path, count]) => {
              const pct = Math.round((count / maxPV) * 100);
              return (
                <div key={path}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                    <span style={{ color: '#444', fontFamily: 'monospace' }}>{path}</span>
                    <span style={{ color: '#767676' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: '#e0e0e0', borderRadius: 0, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#0078d4', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div style={{ ...s.sectionTitle, marginBottom: 12 }}>Recent Activity</div>
        {stats.recent.length === 0 && <div style={{ color: '#ababab', fontSize: '0.8rem' }}>No events yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stats.recent.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem' }}>
              <span style={{ color: '#ababab', fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap', minWidth: 100 }}>{timeAgo(e.created_at)}</span>
              <EventBadge type={e.type} />
              {e.metadata && Object.keys(e.metadata).length > 0 && (
                <span style={{ color: '#767676', fontFamily: 'monospace', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join('  ·  ')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Panel ───────────────────────────────────────────────────────── */
export default function AdminPanel() {
  const navigate  = useNavigate();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!sessionStorage.getItem('pcf_admin')) navigate('/admin');
  }, [navigate]);

  const logout = async () => {
    sessionStorage.removeItem('pcf_admin');
    try { await supabase.auth.signOut(); } catch {}
    navigate('/admin');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f3f3', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={16} color="#0078d4" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>PCFixScan — Admin Panel</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>admin@pcfixscan.com</span>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontFamily: 'inherit' }}>
          <LogOut size={13} /> Logout
        </button>
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...s.tabBtn, ...(tab === id ? s.tabActive : {}) }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'purchases' && <PurchasesTab />}
        {tab === 'activity'  && <ActivityTab />}
        {tab === 'logs'      && <LogsTab />}
        {tab === 'downloads' && <DownloadsTab />}
      </div>
    </div>
  );
}

const s = {
  topBar:       { height: 40, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, color: '#fff' },
  tabBar:       { height: 36, background: '#f3f3f3', borderBottom: '1px solid #d1d1d1', display: 'flex', alignItems: 'stretch', padding: '0 4px', flexShrink: 0 },
  tabBtn:       { display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 400, fontFamily: 'inherit', color: '#1b1b1b', transition: 'background 0.1s' },
  tabActive:    { color: '#0078d4', borderBottom: '3px solid #0078d4', background: '#e5f1fb', fontWeight: 600 },
  sectionTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1b1b1b' },
  sectionSub:   { fontSize: '0.8rem', color: '#767676', marginTop: 2 },
  tableWrap:    { background: '#fff', border: '1px solid #d1d1d1', borderRadius: 2, overflow: 'hidden' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  thead:        { background: '#f3f3f3' },
  th:           { padding: '8px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#767676', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #d1d1d1' },
  tr:           { borderBottom: '1px solid #f0f0f0' },
  td:           { padding: '8px 14px', verticalAlign: 'top' },
  input:        { height: 32, padding: '0 10px', fontSize: '0.875rem', border: '1px solid #ababab', borderRadius: 2, fontFamily: 'inherit', outline: 'none', background: '#fff' },
  infoBox:      { background: '#e5f1fb', border: '1px solid #9dc8eb', borderLeft: '4px solid #0078d4', borderRadius: 2, padding: 16 },
};
