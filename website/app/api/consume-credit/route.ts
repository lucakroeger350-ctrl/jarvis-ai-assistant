import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

// Wird von JARVIS genau einmal pro abgeschlossener Antwort aufgerufen (nicht pro
// internem Tool-Aufruf innerhalb derselben Antwort) - zieht atomar 1 Credit ab.
// VIP-Nutzer rufen dies gar nicht erst auf (unbegrenzt, siehe Electron-Seite).
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer /, '') ?? null;
  const user = await verifyUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: remaining, error } = await admin.rpc('consume_credit', { uid: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ remaining });
}
