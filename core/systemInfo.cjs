const os = require('os');
const { execSync } = require('child_process');

function getDiskInfo() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'wmic logicaldisk where "DeviceID=\'C:\'" get size,freespace /value',
        { encoding: 'utf8', timeout: 8000 }
      );
      const free = parseInt((out.match(/FreeSpace=(\d+)/) || [])[1] || '0');
      const total = parseInt((out.match(/Size=(\d+)/) || [])[1] || '0');
      return { total, free, used: total - free };
    } else {
      const out = execSync("df -k / | tail -1 | awk '{print $2, $4}'", {
        encoding: 'utf8', timeout: 5000,
      }).trim();
      const [total, avail] = out.split(' ').map(n => parseInt(n) * 1024);
      return { total, free: avail, used: total - avail };
    }
  } catch {
    return { total: 0, free: 0, used: 0 };
  }
}

function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  return {
    disk: getDiskInfo(),
    memory: { total: totalMem, free: freeMem, used: totalMem - freeMem },
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
    },
    platform: process.platform,
    hostname: os.hostname(),
    uptime: os.uptime(),
    homeDir: os.homedir(),
  };
}

module.exports = { getSystemInfo };
