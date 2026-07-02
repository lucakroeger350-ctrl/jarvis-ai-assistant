// Internet-Speedtest über Cloudflares öffentlichen, kostenlosen Speedtest-Endpunkt
// (derselbe, den speed.cloudflare.com selbst benutzt - kein API-Key nötig).

async function measurePing() {
  const start = Date.now();
  await fetch('https://speed.cloudflare.com/__down?bytes=0', { signal: AbortSignal.timeout(5000) });
  return Date.now() - start;
}

async function measureDownloadMbps(bytes = 10_000_000) {
  const start = Date.now();
  const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, { signal: AbortSignal.timeout(15000) });
  await res.arrayBuffer();
  const seconds = (Date.now() - start) / 1000;
  const mbps = (bytes * 8) / seconds / 1_000_000;
  return Math.round(mbps * 10) / 10;
}

async function runSpeedtest() {
  const ping = await measurePing();
  const downloadMbps = await measureDownloadMbps();
  return { pingMs: ping, downloadMbps };
}

module.exports = { runSpeedtest, measurePing };
