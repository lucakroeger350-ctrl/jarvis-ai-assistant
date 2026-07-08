// Dünner Client für den sicheren KI-Proxy auf der Website (website/app/api/gemini-proxy).
// Der eigentliche API-Schlüssel liegt NUR dort auf dem Server - hier wird nichts
// direkt bei Google aufgerufen, alles läuft über den Proxy + Supabase-Anmeldung.
const auth = require('./auth');

const WEBSITE_URL = 'https://website-three-pied-22.vercel.app';

async function authHeaders() {
  const session = await auth.getFullSession();
  if (!session) throw new Error('Nicht angemeldet. Bitte zuerst bei JARVIS anmelden.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` };
}

// Ein Gesprächs-Turn mit Tool-Unterstützung - wird vom Tool-Loop in core/brain.js wiederholt
// aufgerufen (einmal pro Runde: Modell antwortet, ruft ggf. Tools auf, wir schicken das
// Ergebnis zurück). Wirft bei fehlenden Credits einen Error mit .code = 'no_credits'.
// Der Proxy zieht pro Aufruf sofort die tatsächlich verbrauchten, gewichteten Tokens ab
// (siehe website/app/api/gemini-proxy/route.ts) - kein separater Abrechnungsschritt hier
// mehr nötig, "usage" wird nur zu Diagnosezwecken durchgereicht.
async function chatTurn({ model, systemInstruction, tools, history, message }) {
  const headers = await authHeaders();
  const res = await fetch(`${WEBSITE_URL}/api/gemini-proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, systemInstruction, tools, history, message }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 402) {
    const err = new Error(data.error || 'Keine KI-Antworteinheiten mehr übrig.');
    err.code = 'no_credits';
    throw err;
  }
  if (!res.ok) throw new Error(data.error || `KI-Anfrage fehlgeschlagen (${res.status}).`);

  return { text: data.text || '', functionCalls: data.functionCalls || [], content: data.content || null, usage: data.usage || null };
}

// Einfache Ein-Text-Vervollständigung ohne Tools/Verlauf (z.B. für Zusammenfassungen).
async function complete(prompt, model) {
  const { text } = await chatTurn({ model, history: [], message: prompt });
  return text;
}

module.exports = { chatTurn, complete, WEBSITE_URL };
