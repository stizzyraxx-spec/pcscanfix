const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { shell } = require('electron');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || '';
const ROAMING = process.env.APPDATA || '';

// Each browser has a profile dir; within it, distinct files map to privacy categories.
// These are file/dir names *relative to* the profile dir.
const CATEGORY_FILES = {
  history:    ['History', 'History-journal', 'History Provider Cache', 'Top Sites', 'Visited Links'],
  cookies:    ['Cookies', 'Cookies-journal', 'Network/Cookies', 'Network/Cookies-journal'],
  sessions:   ['Current Session', 'Current Tabs', 'Last Session', 'Last Tabs', 'Sessions'],
  downloads:  ['DownloadMetadata'],
  formdata:   ['Web Data', 'Web Data-journal'],
  cache:      ['Cache', 'Code Cache', 'GPUCache', 'Service Worker'],
};

function chromiumProfiles(rootDir) {
  // List "Default" + "Profile *" subdirs that look like Chromium profiles
  if (!fs.existsSync(rootDir)) return [];
  try {
    return fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && (e.name === 'Default' || e.name.startsWith('Profile ')))
      .map(e => path.join(rootDir, e.name));
  } catch { return []; }
}

function buildBrowsers() {
  const list = [];
  if (process.platform === 'win32') {
    list.push({ browser: 'Chrome', engine: 'chromium',
      profiles: chromiumProfiles(path.join(LOCAL, 'Google', 'Chrome', 'User Data')) });
    list.push({ browser: 'Edge', engine: 'chromium',
      profiles: chromiumProfiles(path.join(LOCAL, 'Microsoft', 'Edge', 'User Data')) });
    list.push({ browser: 'Brave', engine: 'chromium',
      profiles: chromiumProfiles(path.join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data')) });
    list.push({ browser: 'Opera', engine: 'chromium',
      profiles: fs.existsSync(path.join(ROAMING, 'Opera Software', 'Opera Stable'))
        ? [path.join(ROAMING, 'Opera Software', 'Opera Stable')] : [] });
    list.push({ browser: 'Firefox', engine: 'firefox',
      profiles: firefoxProfiles(path.join(ROAMING, 'Mozilla', 'Firefox', 'Profiles')) });
  } else {
    list.push({ browser: 'Chrome', engine: 'chromium',
      profiles: chromiumProfiles(path.join(HOME, 'Library', 'Application Support', 'Google', 'Chrome')) });
    list.push({ browser: 'Edge', engine: 'chromium',
      profiles: chromiumProfiles(path.join(HOME, 'Library', 'Application Support', 'Microsoft Edge')) });
    list.push({ browser: 'Brave', engine: 'chromium',
      profiles: chromiumProfiles(path.join(HOME, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser')) });
    list.push({ browser: 'Opera', engine: 'chromium',
      profiles: chromiumProfiles(path.join(HOME, 'Library', 'Application Support', 'com.operasoftware.Opera')) });
    list.push({ browser: 'Firefox', engine: 'firefox',
      profiles: firefoxProfiles(path.join(HOME, 'Library', 'Application Support', 'Firefox', 'Profiles')) });
    list.push({ browser: 'Safari', engine: 'safari',
      profiles: fs.existsSync(path.join(HOME, 'Library', 'Safari'))
        ? [path.join(HOME, 'Library', 'Safari')] : [] });
  }
  return list.filter(b => b.profiles.length > 0);
}

function firefoxProfiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  try {
    return fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(rootDir, e.name));
  } catch { return []; }
}

const FIREFOX_FILES = {
  history:   ['places.sqlite', 'places.sqlite-wal', 'places.sqlite-shm', 'favicons.sqlite'],
  cookies:   ['cookies.sqlite', 'cookies.sqlite-wal', 'cookies.sqlite-shm'],
  sessions:  ['sessionstore.jsonlz4', 'sessionstore-backups'],
  formdata:  ['formhistory.sqlite'],
  cache:     ['cache2', 'startupCache', 'thumbnails'],
  downloads: ['downloads.json'],
};

const SAFARI_FILES = {
  history:   ['History.db', 'History.db-wal', 'History.db-shm'],
  cookies:   [], // Safari cookies are in ~/Library/Cookies
  sessions:  ['LastSession.plist'],
  cache:     [],
  downloads: ['Downloads.plist'],
};

function targetsForProfile(engine, profileDir, categories) {
  const targets = [];
  const map = engine === 'firefox' ? FIREFOX_FILES
            : engine === 'safari'  ? SAFARI_FILES
            : CATEGORY_FILES;
  for (const cat of categories) {
    const names = map[cat] || [];
    for (const n of names) {
      targets.push({ category: cat, path: path.join(profileDir, n) });
    }
  }
  // Safari cookies live outside the profile dir
  if (engine === 'safari' && categories.includes('cookies')) {
    targets.push({ category: 'cookies', path: path.join(HOME, 'Library', 'Cookies', 'Cookies.binarycookies') });
  }
  return targets;
}

function pathSize(p) {
  try {
    const st = fs.statSync(p);
    if (st.isFile()) return st.size;
    if (st.isDirectory()) {
      let total = 0;
      const entries = fs.readdirSync(p, { withFileTypes: true });
      for (const e of entries) total += pathSize(path.join(p, e.name));
      return total;
    }
  } catch {}
  return 0;
}

async function scanPrivacy() {
  const browsers = buildBrowsers();
  const out = [];
  const allCats = Object.keys(CATEGORY_FILES);
  for (const b of browsers) {
    for (const profile of b.profiles) {
      const targets = targetsForProfile(b.engine, profile, allCats);
      const byCategory = {};
      for (const t of targets) {
        if (!fs.existsSync(t.path)) continue;
        if (!byCategory[t.category]) byCategory[t.category] = { size: 0, paths: [] };
        byCategory[t.category].size += pathSize(t.path);
        byCategory[t.category].paths.push(t.path);
      }
      out.push({
        browser: b.browser,
        engine: b.engine,
        profile: path.basename(profile),
        profileDir: profile,
        categories: byCategory,
      });
    }
  }
  return out;
}

async function clearPrivacy({ browser, profileDir, engine, categories }) {
  const targets = targetsForProfile(engine, profileDir, categories || []);
  const result = { success: 0, failed: 0, freed: 0, errors: [] };
  for (const t of targets) {
    if (!fs.existsSync(t.path)) continue;
    const sz = pathSize(t.path);
    try {
      await shell.trashItem(t.path);
      result.success++;
      result.freed += sz;
    } catch (err) {
      result.failed++;
      result.errors.push({ path: t.path, error: err.message });
    }
  }
  return result;
}

module.exports = { scanPrivacy, clearPrivacy };
