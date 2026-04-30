const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { getSystemInfo } = require('./systemInfo.cjs');

// Real-time monitor: a single tick returns the snapshot and is called repeatedly by the renderer
// (via electronAPI.getPerformanceSnapshot). We don't run a persistent timer in main — the
// renderer drives cadence so closing the window stops the work.

let prevCpu = null;

function readCpu() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (const c of cpus) {
    user += c.times.user;
    nice += c.times.nice;
    sys  += c.times.sys;
    idle += c.times.idle;
    irq  += c.times.irq;
  }
  return { user, nice, sys, idle, irq, total: user + nice + sys + idle + irq };
}

function cpuPercent() {
  const cur = readCpu();
  if (!prevCpu) { prevCpu = cur; return 0; }
  const totalDelta = cur.total - prevCpu.total;
  const idleDelta  = cur.idle  - prevCpu.idle;
  prevCpu = cur;
  if (totalDelta <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function execAsync(cmd, args, timeout = 4000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      resolve(err ? '' : stdout);
    });
  });
}

async function topProcessesUnix(limit = 8) {
  // ps output: PID %CPU %MEM COMMAND  — sorted by CPU desc
  const out = await execAsync('/bin/ps', ['-Aco', 'pid,%cpu,%mem,comm', '-r']);
  const lines = out.split('\n').slice(1).filter(Boolean).slice(0, limit);
  return lines.map(line => {
    const m = line.trim().match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (!m) return null;
    return {
      pid: parseInt(m[1], 10),
      cpu: parseFloat(m[2]),
      mem: parseFloat(m[3]),
      name: path.basename(m[4]),
    };
  }).filter(Boolean);
}

async function topProcessesWindows(limit = 8) {
  // tasklist gives memory but not %CPU. Use PowerShell for combined view.
  const ps = `Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First ${limit} Id,ProcessName,CPU,WorkingSet | ConvertTo-Json -Compress`;
  const out = await execAsync('powershell.exe', ['-NoProfile', '-Command', ps], 8000);
  if (!out) return [];
  try {
    const parsed = JSON.parse(out);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(p => ({
      pid: p.Id,
      cpu: typeof p.CPU === 'number' ? Math.round(p.CPU * 10) / 10 : 0,
      mem: p.WorkingSet ? Math.round((p.WorkingSet / os.totalmem()) * 1000) / 10 : 0,
      name: p.ProcessName,
    }));
  } catch { return []; }
}

async function getTopProcesses(limit = 8) {
  return process.platform === 'win32'
    ? topProcessesWindows(limit)
    : topProcessesUnix(limit);
}

function buildSuggestions({ cpu, memPct, processes }) {
  const out = [];
  if (cpu > 85) out.push({ severity: 'high', text: `CPU is at ${cpu}% — close heavy apps to recover responsiveness.` });
  if (memPct > 85) out.push({ severity: 'high', text: `Memory is at ${memPct}% — restart memory-heavy apps to free RAM.` });
  // Pick out specific high-CPU processes
  const noisy = processes.filter(p => p.cpu > 30).slice(0, 3);
  for (const p of noisy) {
    out.push({
      severity: p.cpu > 60 ? 'high' : 'medium',
      text: `Close ${p.name} (PID ${p.pid}) to save ~${Math.round(p.cpu)}% CPU.`,
      pid: p.pid,
    });
  }
  return out;
}

async function getSnapshot() {
  const cpu = cpuPercent();
  const sys = getSystemInfo();
  const memPct = sys.memory.total ? Math.round((sys.memory.used / sys.memory.total) * 100) : 0;
  const diskPct = sys.disk.total ? Math.round((sys.disk.used / sys.disk.total) * 100) : 0;

  const processes = await getTopProcesses(8);
  const suggestions = buildSuggestions({ cpu, memPct, processes });

  return {
    timestamp: Date.now(),
    cpu,
    memory: { ...sys.memory, percent: memPct },
    disk:   { ...sys.disk,   percent: diskPct },
    processCount: processes.length,
    processes,
    suggestions,
  };
}

// Best-effort terminate. On macOS unsigned/sandboxed builds this may fail for system procs.
async function killProcess(pid) {
  if (!pid || typeof pid !== 'number') throw new Error('Invalid PID');
  try {
    process.kill(pid, 'SIGTERM');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getSnapshot, killProcess, getTopProcesses };
