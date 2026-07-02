const si = require('systeminformation');

const CPU_LOAD_THRESHOLD = 90; // %
const RAM_THRESHOLD = 90; // %

async function checkSystem() {
  const [load, mem, temp] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
  ]);

  const ramPercent = (mem.active / mem.total) * 100;

  return {
    cpuLoad: Math.round(load.currentLoad),
    ramPercent: Math.round(ramPercent),
    cpuTemp: temp.main, // kann null sein, falls Hardware/Treiber das nicht bereitstellen
    critical: load.currentLoad >= CPU_LOAD_THRESHOLD || ramPercent >= RAM_THRESHOLD,
  };
}

module.exports = { checkSystem, CPU_LOAD_THRESHOLD, RAM_THRESHOLD };
