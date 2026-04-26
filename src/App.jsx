import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopNav from './components/TopNav.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scanner from './pages/Scanner.jsx';
import Results from './pages/Results.jsx';
import StartupManager from './pages/StartupManager.jsx';
import History from './pages/History.jsx';
import Uninstaller from './pages/Uninstaller.jsx';
import Settings from './pages/Settings.jsx';

function NavigationHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const cleanup = window.electronAPI?.onNavigate((route) => navigate(route));
    return () => cleanup?.();
  }, [navigate]);
  return null;
}

export default function App() {
  const [scanResults, setScanResults] = useState(null);

  return (
    <MemoryRouter>
      <NavigationHandler />
      <div className="app-shell">
        <TopNav />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard scanResults={scanResults} />} />
            <Route path="/scanner" element={<Scanner onScanComplete={setScanResults} />} />
            <Route path="/results" element={<Results scanResults={scanResults} />} />
            <Route path="/startup" element={<StartupManager />} />
            <Route path="/history" element={<History />} />
            <Route path="/uninstaller" element={<Uninstaller />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  );
}
