import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

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

    // "content" ist das rohe Antwort-Objekt (role+parts) des Modells - der Client braucht
    // es unverändert, um bei der nächsten Anfrage (nach lokaler Tool-Ausführung) den
    // Gesprächsverlauf für Gemini korrekt fortzusetzen (der Proxy selbst ist zustandslos).
    return NextResponse.json({
      text: response.text() || '',
      functionCalls: response.functionCalls() || [],
      content: response.candidates?.[0]?.content || null,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage.';
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
