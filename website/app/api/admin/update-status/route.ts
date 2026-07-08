import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_TABLES = ['bug_reports', 'feature_requests'] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

// Setzt den Status eines Bug-Reports/Feature-Wunsches (z.B. "fixed"/"planned") - eigene,
// enge Allowlist statt einer generischen "beliebige Tabelle updaten"-Route, damit dieser
// Endpunkt nicht zur beliebigen Datenbank-Schreib-Hintertür wird.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer /, '') ?? null;
  const user = await verifyUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('is_master').eq('id', user.id).maybeSingle();
  if (!profile?.is_master) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { table, id, status } = body;
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Unbekannte Tabelle.' }, { status: 400 });
  }
  if (typeof id !== 'string' || typeof status !== 'string') {
    return NextResponse.json({ error: 'id/status fehlen.' }, { status: 400 });
  }

  const { error } = await admin.from(table as AllowedTable).update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
