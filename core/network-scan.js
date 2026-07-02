const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const profiles = require('./profiles');

function knownDevicesFile() {
  return path.join(profiles.getActiveProfileDir(), 'known-devices.json');
}

function getKnownDevices() {
  const file = knownDevicesFile();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveKnownDevices(macs) {
  fs.writeFileSync(knownDevicesFile(), JSON.stringify(macs, null, 2), 'utf-8');
}

function getLocalSubnetPrefix() {
  const interfaces = os.networkInterfaces();
  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        return parts.slice(0, 3).join('.');
      }
    }
  }
  return null;
}

function pingHost(ip) {
  return new Promise((resolve) => {
    exec(`ping -n 1 -w 300 ${ip}`, () => resolve());
  });
}

async function pingSweep(prefix) {
  const CONCURRENCY = 32;
  const ips = Array.from({ length: 254 }, (_, i) => `${prefix}.${i + 1}`);
  for (let i = 0; i < ips.length; i += CONCURRENCY) {
    await Promise.all(ips.slice(i, i + CONCURRENCY).map(pingHost));
  }
}

function getArpTable() {
  return new Promise((resolve, reject) => {
    exec('arp -a', (err, stdout) => {
      if (err) return reject(err);
      const devices = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+(\w+)/);
        if (match) {
          devices.push({ ip: match[1], mac: match[2].toLowerCase() });
        }
      }
      resolve(devices);
    });
  });
}

async function scanNetwork() {
  const prefix = getLocalSubnetPrefix();
  if (!prefix) throw new Error('Kein lokales Netzwerk gefunden.');

  await pingSweep(prefix);
  const devices = await getArpTable();
  const localDevices = devices.filter((d) => d.ip.startsWith(prefix + '.'));

  const known = getKnownDevices();
  const newDevices = localDevices.filter((d) => !known.includes(d.mac));

  const allMacs = Array.from(new Set([...known, ...localDevices.map((d) => d.mac)]));
  saveKnownDevices(allMacs);

  return { devices: localDevices, newDevices, isFirstScan: known.length === 0 };
}

module.exports = { scanNetwork };
