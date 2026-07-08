import { NextResponse } from 'next/server';
import { verifyUser, supabaseAdmin } from '@/lib/supabase-admin';

// Master-Admin-Panel: liefert Bug-Reports, Feature-Wünsche, das Umsatz-Log und ein paar
// grobe Kennzahlen. is_master wird HIER serverseitig neu geprüft (niemals nur clientseitig
// vertrauen) - exakt dasselbe Muster wie bei gemini-proxy/mobile-transcribe.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace(/^Bearer /, '') ?? null;
  const user = await verifyUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('is_master').eq('id', user.id).maybeSingle();
  if (!profile?.is_master) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [bugReports, featureRequests, revenueLog, monthRevenue, userCounts] = await Promise.all([
    admin.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('feature_requests').select('*').order('created_at', { ascending: false }).limit(200),
    admin.from('revenue_log').select('*').order('created_at', { ascending: false }).limit(100),
    admin.from('revenue_log').select('amount_cents').gte('created_at', startOfMonth.toISOString()),
    admin.from('profiles').select('is_vip'),
  ]);

  const monthRevenueCents = (monthRevenue.data || []).reduce((sum, row) => sum + (row.amount_cents || 0), 0);
  const totalUsers = userCounts.data?.length ?? 0;
  const vipUsers = (userCounts.data || []).filter((row) => row.is_vip).length;

  return NextResponse.json({
    bugReports: bugReports.data || [],
    featureRequests: featureRequests.data || [],
    revenueLog: revenueLog.data || [],
    monthRevenueCents,
    stats: { totalUsers, vipUsers },
  });
}
