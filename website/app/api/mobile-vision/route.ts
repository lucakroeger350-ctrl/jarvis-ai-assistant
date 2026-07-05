import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

// Vision-Modus ("Jarvis, was ist das?" / "Jarvis, übersetze das"): gleicher sicherer
// Proxy-Ansatz wie gemini-proxy/mobile-transcribe, nur mit Bild- statt Audio-Input.
// Kein Credit-Verbrauch, siehe Begründung in mobile-transcribe/route.ts.
const PROMPTS: Record<string, string> = {
  describe: 'Beschreibe kurz und präzise auf Deutsch, was auf diesem Foto zu sehen ist (maximal 2-3 Sätze, wie eine gesprochene Antwort eines Assistenten). Keine Einleitung wie "Auf dem Bild ist zu sehen", antworte direkt mit dem Inhalt.',
  translate: 'Lies jeglichen Text auf diesem Foto und übersetze ihn ins Deutsche. Antworte AUSSCHLIESSLICH mit der Übersetzung. Falls kein Text erkennbar ist, beschreibe stattdessen kurz auf Deutsch, was zu sehen ist.',
};

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
  const { data: profile } = await admin.from('profiles').select('is_vip, has_mobile_addon').eq('id', user.id).maybeSingle();
  if (!profile?.is_vip || !profile?.has_mobile_addon) {
    return NextResponse.json({ error: 'Jarvis Mobile Command erfordert VIP + Mobile-Add-on.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { imageBase64, mimeType, mode } = body;
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ error: 'Keine Bilddaten übermittelt.' }, { status: 400 });
  }
  const prompt = PROMPTS[mode] || PROMPTS.describe;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
    ]);

    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Unbekannter Fehler bei der Bildanalyse.';
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
