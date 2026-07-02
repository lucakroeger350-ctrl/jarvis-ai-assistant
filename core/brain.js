const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const memory = require('./memory');
const skills = require('./skills');
const account = require('./account');
const visualizerBridge = require('./visualizer-bridge');
const { checkCreatorQuestion, checkIronManQuestion } = require('./easter-eggs');

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
    'Für PC-steuernde Aktionen mit größerer Tragweite (z.B. shutdown_pc) frage IMMER erst explizit nach Bestätigung, bevor du sie ausführst - rufe das Tool beim ersten Mal nur informativ auf (confirmed=false) und erst nach ausdrücklicher Zustimmung des Nutzers in einer neuen Nachricht mit confirmed=true.',
    'Antworte kurz, natürlich und sprechbar (dein Text wird laut vorgelesen) - keine Markdown-Formatierung, keine Aufzählungszeichen.',
    memoryContext,
    learnedContext,
  ].filter(Boolean).join('\n\n');
}

// Prüft VIP-Sperren/Coins vor jedem Skill-Aufruf, egal welcher KI-Provider ihn anfordert.
async function runGatedSkill(name, input, context) {
  const gate = account.canUseSkill(name);
  if (!gate.allowed) return { error: gate.reason };
  const result = await skills.runSkill(name, input, context);
  if (gate.cost) account.spendCoins(gate.cost);
  return result;
}

async function chat(userMessage) {
  // Hart codiertes Easter Egg: umgeht die KI-API komplett, kein API-Aufruf, keine Kosten.
  const creatorEasterEgg = checkCreatorQuestion(userMessage);
  if (creatorEasterEgg) return creatorEasterEgg;

  // Iron-Man-Easter-Egg ist ein VIP-Bonus - für Gast/kostenlos fällt es durch zur normalen Antwort.
  if (checkIronManQuestion(userMessage) && account.getAccountState().tier === account.TIERS.VIP) {
    visualizerBridge.send('reactor:flash', {});
    return { text: 'For you sir, always.' };
  }

  const messageCheck = account.canSendMessage();
  if (!messageCheck.allowed) return { text: messageCheck.reason };
  account.recordMessage();

  const settings = memory.getSettings();
  if (!settings.apiKey) {
    const providerLabel = settings.provider === 'anthropic' ? 'Anthropic' : 'Google Gemini';
    return { text: `Es ist noch kein ${providerLabel}-API-Schlüssel hinterlegt. Bitte trage ihn in den Einstellungen unter "KI" ein.` };
  }

  if (settings.provider === 'anthropic') {
    return chatAnthropic(userMessage, settings);
  }
  return chatGemini(userMessage, settings);
}

// ---------- Anthropic Claude (kostenpflichtig) ----------

async function chatAnthropic(userMessage, settings) {
  const client = new Anthropic({ apiKey: settings.apiKey });
  const context = { permissions: settings.permissions };

  const messages = [{ role: 'user', content: userMessage }];
  const tools = skills.getToolDefinitions();

  let finalText = '';
  const MAX_TURNS = 6;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response;
    try {
      response = await client.messages.create({
        model: settings.model,
        max_tokens: 1024,
        system: buildSystemPrompt(settings),
        tools,
        messages,
      });
    } catch (err) {
      return { text: `Entschuldigung, es gab ein Problem mit der KI: ${err.message}` };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    const textBlocks = response.content.filter((b) => b.type === 'text');
    finalText = textBlocks.map((b) => b.text).join('\n');

    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    const toolResults = [];
    for (const toolUse of toolUses) {
      const result = await runGatedSkill(toolUse.name, toolUse.input, context);
      let content;
      if (result && result.image) {
        content = [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: result.image } },
          { type: 'text', text: 'Bildschirmfoto anbei.' },
        ];
      } else if (result && result.error) {
        content = `Fehler: ${result.error}`;
      } else {
        content = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
      }
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return { text: finalText || 'Verstanden.' };
}

// ---------- Google Gemini (kostenlos) ----------

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
  return skills.getToolDefinitions().map((t) => ({
    name: t.name,
    description: t.description,
    parameters: uppercaseSchemaTypes(t.input_schema),
  }));
}

async function chatGemini(userMessage, settings) {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const context = { permissions: settings.permissions };

  let model;
  try {
    model = genAI.getGenerativeModel({
      model: settings.model || 'gemini-2.5-flash',
      systemInstruction: buildSystemPrompt(settings),
      tools: [{ functionDeclarations: toGeminiTools() }],
    });
  } catch (err) {
    return { text: `Entschuldigung, es gab ein Problem beim Initialisieren von Gemini: ${err.message}` };
  }

  const chatSession = model.startChat({ history: [] });

  let finalText = '';
  const MAX_TURNS = 6;
  let nextInput = userMessage;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let result;
    try {
      result = await chatSession.sendMessage(nextInput);
    } catch (err) {
      return { text: `Entschuldigung, es gab ein Problem mit Gemini: ${err.message}` };
    }

    const response = result.response;
    const functionCalls = response.functionCalls() || [];
    finalText = response.text() || finalText;

    if (functionCalls.length === 0) break;

    const parts = [];
    for (const call of functionCalls) {
      const skillResult = await runGatedSkill(call.name, call.args || {}, context);
      if (skillResult && skillResult.image) {
        parts.push({ functionResponse: { name: call.name, response: { result: 'Screenshot wurde bereitgestellt und ist als Bild angehängt.' } } });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: skillResult.image } });
      } else if (skillResult && skillResult.error) {
        parts.push({ functionResponse: { name: call.name, response: { error: skillResult.error } } });
      } else {
        const value = typeof skillResult.result === 'string' ? skillResult.result : skillResult.result;
        parts.push({ functionResponse: { name: call.name, response: { result: value } } });
      }
    }
    nextInput = parts;
  }

  return { text: finalText || 'Verstanden.' };
}

// Einfache Ein-Text-Vervollständigung ohne Tools/Chat-Verlauf - genutzt von Skills,
// die selbst schon eine KI-Auswertung brauchen (z.B. die Recherche-Drohne).
async function summarizeText(prompt) {
  const settings = memory.getSettings();
  if (!settings.apiKey) throw new Error('Kein API-Schlüssel hinterlegt.');

  if (settings.provider === 'anthropic') {
    const client = new Anthropic({ apiKey: settings.apiKey });
    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  }

  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const model = genAI.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { chat, summarizeText };
