const memory = require('./memory');
let skills = require('./skills');
const account = require('./account');
const aiClient = require('./ai-client');
const visualizerBridge = require('./visualizer-bridge');
const { checkCreatorQuestion, checkIronManQuestion } = require('./easter-eggs');

// Defensive Selbstheilung: falls "skills" durch irgendeinen Umstand (z.B. ein Require-
// Problem an anderer Stelle) nicht das erwartete Modul-Objekt ist, wird es hier frisch
// aus dem Cache neu geladen, statt den Chat für den Rest der Sitzung komplett zu blockieren.
function ensureSkillsModule() {
  if (typeof skills.getToolDefinitions !== 'function' || typeof skills.runSkill !== 'function') {
    console.warn('[JARVIS] "skills"-Modul war unerwartet ungültig - lade es neu.');
    try {
      delete require.cache[require.resolve('./skills')];
    } catch { /* ignore */ }
    skills = require('./skills');
  }
  return skills;
}

function buildSystemPrompt(settings) {
  const memoryContext = memory.getMemoryContextString();
  const learned = memory.getLearnedSkills().skills;
  const learnedContext = learned.length
    ? '\nVom Nutzer beigebrachte Kommandos:\n' + learned.map((s) => `- "${s.trigger}" → ${s.action}`).join('\n')
    : '';

  return [
    settings.personality,
    'Du kannst Werkzeuge (Tools) benutzen, um Aktionen auf dem PC des Nutzers auszuführen, den Bildschirm zu sehen, dir Dinge zu merken und dazuzulernen.',
    'Wenn du nicht weißt, wie man etwas Angefragtes tut (z.B. ein unbekanntes Programm öffnen), nutze web_search und web_fetch, um es herauszufinden, und speichere das Ergebnis danach mit remember_fact oder learn_skill, damit du es dir für künftige Anfragen merkst. Tu dies nur, wenn der Nutzer aktiv etwas angefragt hat - surfe niemals unaufgefordert im Hintergrund.',
    'Für PC-steuernde Aktionen mit größerer Tragweite (z.B. shutdown_pc) MUSST du das Tool bei JEDER solchen Anfrage tatsächlich aufrufen (beim ersten Mal informativ mit confirmed=false) - antworte NIEMALS nur in Textform mit einer Rückfrage wie "Soll ich wirklich herunterfahren?", ohne das Tool aufzurufen. Sagt der Nutzer explizit "herunterfahren"/"ausschalten"/"PC aus" o.ä., rufe shutdown_pc SOFORT mit confirmed=false auf (das Tool selbst liefert dir dann den Bestätigungstext). Bestätigt der Nutzer danach in einer neuen Nachricht (z.B. "ja"), rufe es erneut mit confirmed=true auf.',
    'WICHTIG: Verwechsle keine Tools mit unterschiedlicher Funktion (z.B. shutdown_pc niemals anstelle von toggle_gaming_mode oder umgekehrt) - such dir bei eindeutigen Anfragen aber IMMER das best passende vorhandene Tool und rufe es auch tatsächlich auf, anstatt nur zu behaupten, etwas getan zu haben. Gibt es wirklich kein passendes Werkzeug, sage das ehrlich. Der Nutzer drückt "Abbrechen" auf viele Arten aus - erkenne all diese als dieselbe Absicht: "abbrechen", "abschalten", "stopp", "halt", "lass es", "nicht mehr", "vergiss es", "mach das rückgängig", "nein doch nicht". Bei jeder dieser Formulierungen zu einer zuvor gestarteten Aktion rufe IMMER das passende Abbruch-/Deaktivierungs-Tool auf (z.B. cancel_shutdown, oder das jeweilige toggle_*-Tool mit enabled=false).',
    'Wenn ein Werkzeug fehlschlägt oder du eine Aktion (z.B. ein bestimmtes Fenster minimieren/schließen) nicht ausführen kannst, sage das ehrlich und bitte den Nutzer aktiv um Hilfe: er soll dir entweder in Worten erklären, wie es geht, oder es einmal selbst tun und dir danach kurz beschreiben, was er gemacht hat (z.B. genauer Fenstertitel, genauer Programmname). Speichere seine Erklärung sofort mit learn_skill oder remember_fact, damit du es beim nächsten Mal selbst kannst. WICHTIG: Du kannst NICHT tatsächlich zusehen, wie der Nutzer etwas am PC tut (kein Bildschirm-Live-Tracking) - du bist nur auf seine Beschreibung in Worten angewiesen, das ehrlich so kommunizieren, niemals so tun, als würdest du seine Mausbewegungen beobachten.',
    'Antworte kurz, natürlich und sprechbar (dein Text wird laut vorgelesen) - keine Markdown-Formatierung, keine Aufzählungszeichen.',
    settings.adhsMode
      ? 'ADHS-MODUS AKTIV: Fasse dich extrem kurz und direkt - maximal 1-2 Sätze, komm sofort zum Punkt, keine Nebensätze oder Höflichkeitsfloskeln. Bei mehrschrittigen Aufgaben nenne nur den nächsten konkreten Schritt, nicht die ganze Liste auf einmal.'
      : null,
    settings.confirmCriticalActions === false
      ? 'Der Nutzer hat in den Einstellungen explizite Bestätigungen vor kritischen Aktionen (PC herunterfahren, Dateien löschen usw.) DEAKTIVIERT - führe solche Tools bei eindeutigen Anfragen direkt aus (confirmed=true im ersten Aufruf), frage nicht extra nach.'
      : 'Hole vor kritischen, schwer rückgängig zu machenden Aktionen (PC herunterfahren, Dateien/Datenmüll löschen usw.) IMMER eine explizite Bestätigung des Nutzers ein, bevor du sie endgültig ausführst (confirmed=true).',
    memoryContext,
    learnedContext,
  ].filter(Boolean).join('\n\n');
}

// Prüft VIP-Sperren/Coins vor jedem Skill-Aufruf (lokales Skill-Coin-System, unabhängig
// vom Cloud-Credit-System für reine Chat-Antworten - siehe core/account.js).
async function runGatedSkill(name, input, context) {
  const gate = account.canUseSkill(name);
  if (!gate.allowed) return { error: gate.reason };
  const result = await ensureSkillsModule().runSkill(name, input, context);
  if (gate.cost) account.spendCoins(gate.cost);
  return result;
}

function uppercaseSchemaTypes(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const out = { ...schema };
  if (typeof out.type === 'string') out.type = out.type.toUpperCase();
  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([key, val]) => [key, uppercaseSchemaTypes(val)])
    );
  }
  if (out.items) out.items = uppercaseSchemaTypes(out.items);
  return out;
}

function toGeminiTools() {
  return ensureSkillsModule().getToolDefinitions().map((t) => ({
    name: t.name,
    description: t.description,
    parameters: uppercaseSchemaTypes(t.input_schema),
  }));
}

async function chat(userMessage) {
  // Hart codiertes Easter Egg: umgeht die KI-API komplett, kein API-Aufruf, keine Kosten.
  const creatorEasterEgg = checkCreatorQuestion(userMessage);
  if (creatorEasterEgg) return creatorEasterEgg;

  // Gäste haben keine Cloud-Anmeldung und können den KI-Proxy daher grundsätzlich nicht
  // nutzen (der Proxy prüft zwingend einen echten Supabase-Zugangstoken).
  if (account.isGuestSession()) {
    return { text: 'Als Gast kann ich derzeit nicht mit der KI sprechen, Sir - bitte melden Sie sich an, um zu chatten.' };
  }

  // Iron-Man-Easter-Egg ist ein VIP-Bonus - für Gast/kostenlos fällt es durch zur normalen Antwort.
  if (checkIronManQuestion(userMessage) && account.getAccountState().tier === account.TIERS.VIP) {
    visualizerBridge.send('reactor:flash', {});
    return { text: 'For you sir, always.' };
  }

  const settings = memory.getSettings();
  const context = { permissions: settings.permissions };
  const tools = toGeminiTools();

  let history = [];
  let nextMessage = userMessage;
  let finalText = '';
  const MAX_TURNS = 6;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let result;
    try {
      result = await aiClient.chatTurn({
        model: settings.model,
        systemInstruction: buildSystemPrompt(settings),
        tools,
        history,
        message: nextMessage,
      });
    } catch (err) {
      if (err.code === 'no_credits') {
        visualizerBridge.send('credits:locked', {});
        return { text: err.message, isSystemError: true };
      }
      return { text: `Entschuldigung, es gab ein Problem mit der KI: ${err.message}`, isSystemError: true };
    }

    // Verlauf für den nächsten Turn nachführen (Proxy selbst ist zustandslos).
    history.push({ role: 'user', parts: Array.isArray(nextMessage) ? nextMessage : [{ text: nextMessage }] });
    history.push(result.content || { role: 'model', parts: [{ text: result.text }] });
    finalText = result.text || finalText;

    if (!result.functionCalls.length) break;

    const parts = [];
    for (const call of result.functionCalls) {
      const skillResult = await runGatedSkill(call.name, call.args || {}, context);
      if (skillResult && skillResult.image) {
        parts.push({ functionResponse: { name: call.name, response: { result: 'Screenshot wurde bereitgestellt und ist als Bild angehängt.' } } });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: skillResult.image } });
      } else if (skillResult && skillResult.error) {
        parts.push({ functionResponse: { name: call.name, response: { error: skillResult.error } } });
      } else {
        parts.push({ functionResponse: { name: call.name, response: { result: skillResult.result } } });
      }
    }
    nextMessage = parts;
  }

  // Kein separater Abrechnungsschritt mehr nötig - jede einzelne Proxy-Runde in der
  // Schleife oben hat sich bereits selbst mit ihren tatsächlichen Tokens abgerechnet
  // (siehe website/app/api/gemini-proxy/route.ts). VIP bleibt dort unbegrenzt.
  return { text: finalText || 'Verstanden.' };
}

// Einfache Ein-Text-Vervollständigung ohne Tools/Chat-Verlauf - genutzt von Skills,
// die selbst schon eine KI-Auswertung brauchen (z.B. die Recherche-Drohne).
async function summarizeText(prompt) {
  return aiClient.complete(prompt);
}

module.exports = { chat, summarizeText };
