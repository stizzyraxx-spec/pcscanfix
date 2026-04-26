const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  platform: process.platform,

  // Scan
  startScan: (opts) => ipcRenderer.invoke('scan:start', opts),
  onScanProgress: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('scan:progress', h);
    return () => ipcRenderer.removeListener('scan:progress', h);
  },

  // Clean
  cleanFiles: (paths, bytesFreed) => ipcRenderer.invoke('clean:files', { paths, bytesFreed }),

  // Startup
  getStartupItems: () => ipcRenderer.invoke('startup:list'),
  toggleStartupItem: (item, enabled) => ipcRenderer.invoke('startup:toggle', { item, enabled }),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  getHistoryStats: () => ipcRenderer.invoke('history:stats'),

  // Uninstaller
  getInstalledApps: () => ipcRenderer.invoke('uninstall:list'),
  getAppLeftovers: (app) => ipcRenderer.invoke('uninstall:leftovers', app),
  getAppSize: (appPath) => ipcRenderer.invoke('uninstall:size', appPath),
  uninstallApp: (appInfo, leftoverPaths) => ipcRenderer.invoke('uninstall:remove', { appInfo, leftoverPaths }),

  // Settings (synced to main process for auto-scan)
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // Shell
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  openURL: (url) => ipcRenderer.invoke('shell:openURL', url),

  // Navigation from main process (tray quick-scan, notifications)
  onNavigate: (cb) => {
    const h = (_, route) => cb(route);
    ipcRenderer.on('navigate', h);
    return () => ipcRenderer.removeListener('navigate', h);
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
});
