'use client';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

interface BugReport {
  id: string;
  created_at: string;
  description: string;
  app_version: string | null;
  os_info: string | null;
  user_email: string | null;
  status: string;
}

interface FeatureRequest {
  id: string;
  created_at: string;
  description: string;
  user_email: string | null;
  status: string;
}

interface RevenueEntry {
  id: string;
  created_at: string;
  event_type: string;
  amount_cents: number;
  currency: string;
}

interface AdminData {
  bugReports: BugReport[];
  featureRequests: FeatureRequest[];
  revenueLog: RevenueEntry[];
  monthRevenueCents: number;
  stats: { totalUsers: number; vipUsers: number };
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

const BUG_STATUSES = ['open', 'in_progress', 'fixed'];
const FEATURE_STATUSES = ['open', 'planned', 'done', 'declined'];

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isMaster, setIsMaster] = useState<boolean | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
    if (!sessionData.session) { setIsMaster(false); return; }

    const res = await fetch('/api/admin', {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    if (res.status === 403 || res.status === 401) { setIsMaster(false); return; }
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Fehler beim Laden.'); return; }
    setIsMaster(true);
    setData(json);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(table: 'bug_reports' | 'feature_requests', id: string, status: string) {
    if (!session) return;
    await fetch('/api/admin/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ table, id, status }),
    });
    load();
  }

  if (isMaster === null) {
    return (
      <>
        <Nav />
        <section className="mx-auto max-w-5xl px-6 py-24 text-center font-mono text-sm text-white/40">Lädt…</section>
        <Footer />
      </>
    );
  }

  if (!isMaster) {
    return (
      <>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">Admin</div>
          <h1 className="mt-2 font-orbitron text-2xl font-bold text-white">Zugriff verweigert</h1>
          <div className="panel mt-8 p-8 font-mono text-sm text-white/50">
            Dieser Bereich ist ausschließlich dem Master-Account vorbehalten.
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">Master Admin Panel</div>
        <h1 className="mt-2 font-orbitron text-2xl font-bold text-white">Command Center</h1>

        {error && <div className="mt-4 border border-red/40 bg-red/10 px-4 py-2 font-mono text-xs text-red">{error}</div>}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="panel p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Umsatz diesen Monat</div>
            <div className="mt-1 font-mono text-2xl font-bold text-green">
              {data ? formatMoney(data.monthRevenueCents, 'eur') : '--'}
            </div>
            <div className="mt-1 text-[10px] text-white/30">Setzt sich am 1. jedes Monats automatisch neu zusammen (Verlauf bleibt erhalten)</div>
          </div>
          <div className="panel p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Nutzer gesamt</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white">{data?.stats.totalUsers ?? '--'}</div>
          </div>
          <div className="panel p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Davon VIP</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber">{data?.stats.vipUsers ?? '--'}</div>
          </div>
        </div>

        <div className="mt-10 font-mono text-xs uppercase tracking-widest text-white/40">Live-Umsatz-Feed</div>
        <div className="panel mt-2 max-h-64 overflow-y-auto p-4">
          {!data?.revenueLog.length && <div className="font-mono text-xs text-white/30">Noch keine Zahlungen erfasst.</div>}
          {data?.revenueLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-white/5 py-2 font-mono text-xs last:border-0">
              <span className="text-white/70">{entry.event_type}</span>
              <span className="text-white/30">{new Date(entry.created_at).toLocaleString('de-DE')}</span>
              <span className="text-green">{formatMoney(entry.amount_cents, entry.currency)}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 font-mono text-xs uppercase tracking-widest text-white/40">Bug-Reports ({data?.bugReports.length ?? 0})</div>
        <div className="mt-2 flex flex-col gap-2">
          {data?.bugReports.map((bug) => (
            <div key={bug.id} className="panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-white/80">{bug.description}</div>
                <select
                  value={bug.status}
                  onChange={(e) => updateStatus('bug_reports', bug.id, e.target.value)}
                  className="border border-amber/30 bg-black/40 px-2 py-1 font-mono text-xs text-white"
                >
                  {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mt-2 font-mono text-[10px] text-white/30">
                {bug.user_email || 'anonym'} · {bug.app_version || '?'} · {bug.os_info || '?'} · {new Date(bug.created_at).toLocaleString('de-DE')}
              </div>
            </div>
          ))}
          {!data?.bugReports.length && <div className="panel p-4 font-mono text-xs text-white/30">Keine Bug-Reports.</div>}
        </div>

        <div className="mt-10 font-mono text-xs uppercase tracking-widest text-white/40">Feature-Wünsche ({data?.featureRequests.length ?? 0})</div>
        <div className="mt-2 flex flex-col gap-2">
          {data?.featureRequests.map((req) => (
            <div key={req.id} className="panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-white/80">{req.description}</div>
                <select
                  value={req.status}
                  onChange={(e) => updateStatus('feature_requests', req.id, e.target.value)}
                  className="border border-amber/30 bg-black/40 px-2 py-1 font-mono text-xs text-white"
                >
                  {FEATURE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mt-2 font-mono text-[10px] text-white/30">
                {req.user_email || 'anonym'} · {new Date(req.created_at).toLocaleString('de-DE')}
              </div>
            </div>
          ))}
          {!data?.featureRequests.length && <div className="panel p-4 font-mono text-xs text-white/30">Keine Feature-Wünsche.</div>}
        </div>
      </section>
      <Footer />
    </>
  );
}
