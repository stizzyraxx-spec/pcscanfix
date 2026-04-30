import { MemoryRouter, BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopNav from './components/TopNav.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scanner from './pages/Scanner.jsx';
import Results from './pages/Results.jsx';
import StartupManager from './pages/StartupManager.jsx';
import History from './pages/History.jsx';
import Uninstaller from './pages/Uninstaller.jsx';
import Settings from './pages/Settings.jsx';
import Performance from './pages/Performance.jsx';
import PrivacyCleaner from './pages/PrivacyCleaner.jsx';
import RegistryCleaner from './pages/RegistryCleaner.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Buy from './pages/Buy.jsx';
import BuySuccess from './pages/BuySuccess.jsx';
import LicenseGate from './pages/LicenseGate.jsx';
import Download from './pages/Download.jsx';
import Support from './pages/Support.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Signup from './pages/Signup.jsx';
import CustomerLogin from './pages/CustomerLogin.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Account from './pages/Account.jsx';
import Home from './pages/Home.jsx';
import { logEvent } from './utils/analytics.js';
import { checkAccess, signOutEverywhere } from './utils/license.js';

const isElectron = !!window.electronAPI;
const Router = isElectron ? MemoryRouter : BrowserRouter;

function AppInner({ scanResults, setScanResults, access, refreshAccess }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const path = location.pathname;
  const STANDALONE = [
    '/login', '/buy', '/buy/success', '/download', '/support', '/privacy', '/terms',
    '/signup', '/forgot-password', '/reset-password', '/verify-email', '/account',
  ];
  // On web, `/` is the public landing page. In Electron, `/` redirects to /dashboard.
  const isHomeOnWeb = !isElectron && path === '/';
  const isStandaloneRoute = path.startsWith('/admin') || STANDALONE.includes(path) || isHomeOnWeb;

  useEffect(() => {
    const cleanup = window.electronAPI?.onNavigate((route) => navigate(route));
    return () => cleanup?.();
  }, [navigate]);

  useEffect(() => {
    if (!isStandaloneRoute) logEvent('page_view', { path });
  }, [path, isStandaloneRoute]);

  if (isStandaloneRoute) {
    return (
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/login"           element={<CustomerLogin />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/account"         element={<Account />} />
        <Route path="/admin"           element={<AdminLogin destination="/admin/dashboard" />} />
        <Route path="/admin/dashboard" element={<AdminPanel />} />
        <Route path="/buy"             element={<Buy />} />
        <Route path="/buy/success"     element={<BuySuccess />} />
        <Route path="/download"        element={<Download />} />
        <Route path="/support"         element={<Support />} />
        <Route path="/privacy"         element={<Privacy />} />
        <Route path="/terms"           element={<Terms />} />
      </Routes>
    );
  }

  // Only prompt for a license on first launch (no license) or when the license
  // has expired and needs renewal. Transient/non-explicit states (network_error,
  // revoked, wrong_device, invalid, not_found) don't block the user.
  // Why: prompting on every recheck or network blip annoys legitimate users.
  const PROMPT_REASONS = new Set(['no_license', 'expired', 'past_due_expired']);
  if (access && !access.unlocked && PROMPT_REASONS.has(access.reason)) {
    return <LicenseGate reason={access.reason} message={access.message} onUnlock={refreshAccess} />;
  }

  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Routes>
          <Route path="/"            element={<Navigate to={isElectron ? '/dashboard' : '/'} replace />} />
          <Route path="/dashboard"   element={<Dashboard scanResults={scanResults} access={access} />} />
          <Route path="/scanner"     element={<Scanner onScanComplete={setScanResults} />} />
          <Route path="/results"     element={<Results scanResults={scanResults} />} />
          <Route path="/startup"     element={<StartupManager />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/privacy-cleaner" element={<PrivacyCleaner />} />
          <Route path="/registry"    element={<RegistryCleaner />} />
          <Route path="/history"     element={<History />} />
          <Route path="/uninstaller" element={<Uninstaller />} />
          <Route path="/settings"    element={<Settings />} />
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [scanResults, setScanResults] = useState(null);
  const [access, setAccess] = useState(null);

  async function refreshAccess() {
    setAccess(await checkAccess());
  }

  useEffect(() => {
    refreshAccess();
    logEvent('app_launch', { platform: window.electronAPI?.platform || 'web' });

    // Re-validate license every hour. On expiry/revoke, force sign-out + native notification.
    const interval = setInterval(async () => {
      const next = await checkAccess();
      if (!next.unlocked && ['expired', 'past_due_expired'].includes(next.reason)) {
        await signOutEverywhere();
        // Native desktop notification
        if (window.electronAPI?.notifyExpired) {
          window.electronAPI.notifyExpired(next.reason);
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('PCFixScan subscription ended', {
            body: 'Your subscription has expired. Renew at pcfixscan.com to continue.',
          });
        }
      }
      setAccess(next);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scanResults) return;
    const bytes = [...(scanResults.junk || []), ...(scanResults.browsers || [])]
      .reduce((s, f) => s + (f.size || 0), 0);
    logEvent('scan_complete', {
      junk_count: scanResults.junk?.length || 0,
      bytes_found: bytes,
      threats: scanResults.malware?.length || 0,
    });
  }, [scanResults]);

  return (
    <Router>
      <AppInner
        scanResults={scanResults}
        setScanResults={setScanResults}
        access={access}
        refreshAccess={refreshAccess}
      />
    </Router>
  );
}
