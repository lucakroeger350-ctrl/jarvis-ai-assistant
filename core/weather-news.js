// Daily Briefing: Wetter (Open-Meteo, kostenlos/keylos) + Standort (ip-api.com, kostenlos/keylos)
// + Top-Schlagzeilen (Tagesschau-RSS, öffentlich, keylos).

async function getLocation() {
  const res = await fetch('http://ip-api.com/json/?fields=status,lat,lon,city', { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  if (data.status !== 'success') throw new Error('Standort konnte nicht ermittelt werden.');
  return { lat: data.lat, lon: data.lon, city: data.city };
}

async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return { temperature: Math.round(data.current.temperature_2m) };
}

async function getHeadlines(limit = 3) {
  const res = await fetch('https://www.tagesschau.de/xml/rss2/', { signal: AbortSignal.timeout(5000) });
  const xml = await res.text();
  const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)]
    .map((m) => m[1].trim())
    .filter((t) => t && !t.toLowerCase().includes('tagesschau.de'));
  return titles.slice(0, limit);
}

async function buildDailyBriefing() {
  const location = await getLocation();
  const weather = await getWeather(location.lat, location.lon);
  const headlines = await getHeadlines(3);

  const headlineText = headlines.length
    ? 'Die wichtigsten Schlagzeilen: ' + headlines.join('. ') + '.'
    : '';

  const text = `Guten Morgen, Sir. In ${location.city} sind es aktuell ${weather.temperature} Grad. ${headlineText}`;
  return { text, headlines, temperature: weather.temperature, city: location.city };
}

module.exports = { buildDailyBriefing };
