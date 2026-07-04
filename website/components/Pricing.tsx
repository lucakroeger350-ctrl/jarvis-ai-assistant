'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';

const ROWS = [
  { label: 'KI-Antworteinheiten', free: '150 Startguthaben, aufladbar', vip: 'Unbegrenzt' },
  { label: 'KI-Modell', free: 'Gemini Flash', vip: 'Gemini Pro' },
  { label: 'Design', free: 'Standard-HUD', vip: 'Alle Styles' },
  { label: 'Multi-Monitor-Projektion', free: '—', vip: '✓' },
  { label: 'FBI-Sperrbildschirm', free: '—', vip: '✓' },
  { label: 'Gesichtserkennungs-Wächter', free: '—', vip: '✓' },
  { label: 'Gaming Mode & Netzwerk-Sniper', free: '—', vip: '✓' },
  { label: 'Passwort-Tresor & Boss-Key', free: '—', vip: '✓' },
  { label: 'Werbung', free: 'Ja', vip: 'Keine' },
];

export default function Pricing() {
  const { t } = useLang();
  const [loading, setLoading] = useState<'subscription' | 'refill' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(type: 'subscription' | 'refill') {
    setLoading(type);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = '/login';
        return;
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userId: sessionData.session.user.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Checkout konnte nicht gestartet werden.');
    } catch {
      setError('Checkout konnte nicht gestartet werden.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mb-4 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">{t('pricing.badge')}</div>
        <h2 className="mt-2 font-orbitron text-2xl font-bold text-white sm:text-3xl">{t('pricing.title')}</h2>
        <p className="mx-auto mt-4 max-w-xl font-mono text-sm text-white/50">{t('pricing.desc')}</p>
      </div>

      <div className="panel mt-10 overflow-hidden">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-amber/20 text-left">
              <th className="p-4 font-normal uppercase tracking-widest text-white/40">Funktion</th>
              <th className="p-4 font-normal uppercase tracking-widest text-white/70">Free</th>
              <th className="p-4 font-normal uppercase tracking-widest text-amber">VIP-Command</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b border-white/5">
                <td className="p-4 text-white/60">{r.label}</td>
                <td className="p-4 text-white/40">{r.free}</td>
                <td className="p-4 font-bold text-green">{r.vip}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col items-center gap-4 border-t border-amber/20 p-8 text-center">
          <div className="font-orbitron text-4xl font-black text-white">
            19,99€ <span className="text-sm font-normal text-white/40">/ Monat, zzgl. MwSt.</span>
          </div>
          <div className="font-mono text-xs text-white/40">Jederzeit kündbar. Keine Einrichtungsgebühr.</div>
          <button
            onClick={() => startCheckout('subscription')}
            disabled={loading !== null}
            className="mt-2 w-full max-w-xs border border-amber bg-amber px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_rgba(255,87,34,0.5)] transition hover:shadow-[0_0_45px_rgba(255,87,34,0.7)] disabled:opacity-50"
          >
            {loading === 'subscription' ? 'Lädt…' : 'Jetzt VIP werden'}
          </button>
        </div>
      </div>

      {/* Pay-as-you-go für Gelegenheitsnutzer - kein Abo nötig */}
      <div className="panel mt-8 flex flex-col items-center gap-3 p-8 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">Für Gelegenheitsnutzer</div>
        <h3 className="font-orbitron text-lg font-bold text-white">Kein Abo-Typ? Laden Sie Ihr Konto flexibel auf.</h3>
        <p className="max-w-md font-mono text-sm text-white/50">500 Antworten für nur 3,50€ einmalig - beliebig oft nachladbar, ohne monatliche Bindung.</p>
        <button
          onClick={() => startCheckout('refill')}
          disabled={loading !== null}
          className="mt-2 border border-amber/60 bg-amber/10 px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-amber hover:bg-amber/20 disabled:opacity-50"
        >
          {loading === 'refill' ? 'Lädt…' : '+500 Credits für 3,50€'}
        </button>
      </div>

      {error && <div className="mt-4 text-center font-mono text-xs text-red">{error}</div>}
    </section>
  );
}
