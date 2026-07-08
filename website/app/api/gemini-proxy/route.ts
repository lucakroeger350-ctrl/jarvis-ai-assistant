import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

// Gewichtung Ausgabe- vs. Eingabe-Tokens: Ausgabe-Tokens sind hier 5x "teurer" -
// entspricht ungefähr dem realen Input/Output-Preisverhältnis von Anthropics eigenen
// Claude-Modellen (z.B. Sonnet: $3 Input / $15 Output pro Mio. Tokens = exakt 5x),
// da genau das der Vergleichsmaßstab des Nutzers war ("fair wie bei dir/Claude").
const OUTPUT_TOKEN_WEIGHT = 5;

// Kalibrierungskonstante: wie viele gewichtete Token-Einheiten einem Credit entsprechen.
// Startwert geschätzt so, dass eine einfache Ein-Turn-Frage (System-Prompt + alle
// ~45 Tool-Definitionen + kurze Antwort, siehe core/brain.js/skills.js) weiterhin ca.
// 1 Credit kostet, mehrstufige Tool-Aufruf-Ketten (die pro Runde den kompletten
// Verlauf+Tools erneut mitschicken) aber spürbar mehr - OHNE echte Produktions-
// Nutzungsdaten nicht exakt kalibrierbar. Nach dem Deployment im Google AI Studio/
// Gemini-API-Dashboard die tatsächlichen Token-Zahlen ein paar Tage beobachten und
// diesen Wert bei Bedarf nachjustieren.
const UNITS_PER_CREDIT = 5000;

function computeCreditCost(promptTokens: number, candidatesTokens: number): number {
  const units = promptTokens + candidatesTokens * OUTPUT_TOKEN_WEIGHT;
  return units / UNITS_PER_CREDIT;
}

// Sicherer KI-Proxy: Der Gemini-API-Key lebt AUSSCHLIESSLICH hier auf dem Server
// (GEMINI_API_KEY-Umgebungsvariable) und wird niemals an den Client (die JARVIS-
// Electron-App) übertragen. Jede Anfrage wird zuerst über den Supabase-Access-Token
// des Nutzers verifiziert, dann gegen VIP-Status/Credits geprüft.
export async function POST(req: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'Server nicht konfiguriert (GEMINI_API_KEY fehlt).' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer /, '') ?? null;
  const user = await verifyUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('is_vip, ai_credits').eq('id', user.id).maybeSingle();

  if (!profile) return NextResponse.json({ error: 'Kein Profil gefunden.' }, { status: 404 });
  if (!profile.is_vip && profile.ai_credits <= 0) {
    return NextResponse.json({ error: 'Keine KI-Antworteinheiten mehr übrig.', code: 'no_credits' }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const { model, systemInstruction, tools, history, message } = body;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const genModel = genAI.getGenerativeModel({
      model: model || 'gemini-2.5-flash',
      systemInstruction,
      tools: tools ? [{ functionDeclarations: tools }] : undefined,
    });

    const chat = genModel.startChat({ history: history || [] });
    const result = await chat.sendMessage(message);
    const response = result.response;

    // Fairer Verbrauch: statt pauschal 1 Credit pro fertiger Antwort wird JEDE einzelne
    // Gemini-Anfrage (auch interne Tool-Aufruf-Runden innerhalb derselben Nutzerfrage,
    // siehe core/brain.js MAX_TURNS-Schleife) sofort mit ihren tatsächlichen Tokens
    // abgerechnet - genau wie bei echten KI-APIs üblich. VIP bleibt komplett unbegrenzt.
    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const candidatesTokens = usage?.candidatesTokenCount ?? 0;
    let creditsSpent = 0;
    if (!profile.is_vip && (promptTokens > 0 || candidatesTokens > 0)) {
      creditsSpent = computeCreditCost(promptTokens, candidatesTokens);
      try {
        await admin.rpc('consume_credit', { uid: user.id, amount: creditsSpent });
      } catch {
        // ein einzelner fehlgeschlagener Abzug ist unkritisch - das nächste Gating
        // (ai_credits <= 0-Check oben) greift beim nächsten Aufruf ohnehin wieder
      }
    }

    // "content" ist das rohe Antwort-Objekt (role+parts) des Modells - der Client braucht
    // es unverändert, um bei der nächsten Anfrage (nach lokaler Tool-Ausführung) den
    // Gesprächsverlauf für Gemini korrekt fortzusetzen (der Proxy selbst ist zustandslos).
    return NextResponse.json({
      text: response.text() || '',
      functionCalls: response.functionCalls() || [],
      content: response.candidates?.[0]?.content || null,
      usage: { promptTokens, candidatesTokens, creditsSpent },
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage.';
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
