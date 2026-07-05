import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

// Ersetzt Androids schwaches On-Device-Spracherkennungsmodell (häufige Fehlerkennungen
// bei Deutsch, siehe Nutzer-Feedback) durch Gemini's multimodale Audio-Transkription -
// gleicher sicherer Proxy-Ansatz wie gemini-proxy/route.ts (API-Key bleibt serverseitig).
// Kein Credit-Verbrauch: Jarvis Mobile Command setzt ohnehin zwingend VIP voraus
// (siehe hasMobileAccess in src/mobile/lib/supabase.ts), VIP-Nutzer haben auf der
// Desktop-Seite ebenfalls unbegrenzte KI-Nutzung.
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
  const { audioBase64, mimeType } = body;
  if (typeof audioBase64 !== 'string' || !audioBase64) {
    return NextResponse.json({ error: 'Keine Audiodaten übermittelt.' }, { status: 400 });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        text: 'Transkribiere die folgende Audioaufnahme wortwörtlich auf Deutsch. Antworte AUSSCHLIESSLICH mit dem transkribierten Text, ohne Anführungszeichen, ohne Kommentar, ohne Übersetzung. Falls keine verständliche Sprache enthalten ist, antworte mit einem leeren String.',
      },
      { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
    ]);

    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Unbekannter Fehler bei der Transkription.';
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
