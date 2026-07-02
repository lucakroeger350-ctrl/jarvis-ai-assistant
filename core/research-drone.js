const fs = require('fs');
const path = require('path');
const os = require('os');
const brain = require('./brain');

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Kein offizieller, kostenloser Such-API-Key vorhanden - nutzt daher die simple HTML-Version
// von DuckDuckGo (lite.duckduckgo.com), wie es viele keyless Recherche-Tools tun. Das ist ein
// Heuristik-Scrape, kein stabiler API-Vertrag - kann brechen, falls DuckDuckGo das HTML ändert.
async function searchLinks(topic, limit = 4) {
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(topic)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (JARVIS Assistant)' },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const matches = [...html.matchAll(/<a[^>]+class="result-link"[^>]+href="([^"]+)"/g)];
  const urls = matches
    .map((m) => m[1])
    .filter((u) => u.startsWith('http') && !u.includes('duckduckgo.com'));
  return [...new Set(urls)].slice(0, limit);
}

async function fetchPageText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (JARVIS Assistant)' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const html = await res.text();
    return stripHtml(html).slice(0, 4000);
  } catch {
    return null;
  }
}

async function researchTopic(topic) {
  const urls = await searchLinks(topic);
  const pages = [];
  for (const url of urls) {
    const text = await fetchPageText(url);
    if (text) pages.push({ url, text });
  }
  if (!pages.length) throw new Error(`Keine auswertbaren Quellen zu "${topic}" gefunden.`);

  const combined = pages.map((p, i) => `Quelle ${i + 1} (${p.url}):\n${p.text}`).join('\n\n');
  const prompt = `Fasse die folgenden Web-Quellen zum Thema "${topic}" strukturiert auf Deutsch zusammen. Gliedere in kurze Abschnitte mit Zwischenüberschriften, nenne die wichtigsten Fakten, keine Wiederholungen, maximal 400 Wörter.\n\n${combined}`;
  const summary = await brain.summarizeText(prompt);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTopic = topic.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
  const filePath = path.join(os.homedir(), 'Desktop', `Recherche-${safeTopic}-${timestamp}.txt`);

  const fileContent = [
    `JARVIS Recherche: ${topic}`,
    `Erstellt: ${new Date().toLocaleString('de-DE')}`,
    '',
    'Quellen:',
    ...pages.map((p, i) => `  ${i + 1}. ${p.url}`),
    '',
    '--- Zusammenfassung ---',
    summary,
  ].join('\n');

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  return { filePath, summary, sourceCount: pages.length };
}

module.exports = { researchTopic };
