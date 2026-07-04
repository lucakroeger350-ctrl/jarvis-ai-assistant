'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const DLCS = [
  { name: 'Cyber-Blau UI-Skin', desc: 'Komplettes Hologramm-Blau-Farbschema für das Command Center.' },
  { name: 'Britische Piper-Stimme Pack', desc: 'Zusätzliche hochwertige TTS-Stimme (männlich, britischer Akzent).' },
  { name: 'Neon-Grün UI-Skin', desc: 'Alternative Matrix-artige Farbwelt für das gesamte HUD.' },
];

export default function MarketplacePage() {
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
    <>
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">Marketplace</div>
          <h1 className="mt-2 font-orbitron text-3xl font-bold text-white">Abos &amp; DLCs</h1>
          <p className="mx-auto mt-4 max-w-xl font-mono text-sm text-white/50">
            Alles, was du für JARVIS abonnieren oder dazukaufen kannst - an einem Ort.
          </p>
        </div>

        <div className="panel mb-6 p-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-amber">Abo</div>
              <h2 className="font-orbitron text-xl font-bold text-white">VIP-Command</h2>
              <p className="mt-2 max-w-md font-mono text-[13px] text-white/50">
                Unbegrenzte KI-Antworten, alle Sicherheits- und Gaming-Module, keine Werbung.
              </p>
            </div>
            <div className="text-center">
              <div className="font-orbitron text-3xl font-black text-white">19,99€<span className="text-sm font-normal text-white/40">/Monat</span></div>
              <button
                onClick={() => startCheckout('subscription')}
                disabled={loading !== null}
                className="mt-3 border border-amber bg-amber px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_24px_rgba(255,87,34,0.4)] disabled:opacity-50"
              >
                {loading === 'subscription' ? 'Lädt…' : 'Abonnieren'}
              </button>
            </div>
          </div>
        </div>

        <div className="panel mb-6 p-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-amber">Pay-as-you-go</div>
              <h2 className="font-orbitron text-xl font-bold text-white">+500 Credits</h2>
              <p className="mt-2 max-w-md font-mono text-[13px] text-white/50">
                Kein Abo nötig - 500 KI-Antworten einmalig aufladen, beliebig oft wiederholbar.
              </p>
            </div>
            <div className="text-center">
              <div className="font-orbitron text-3xl font-black text-white">3,50€<span className="text-sm font-normal text-white/40"> einmalig</span></div>
              <button
                onClick={() => startCheckout('refill')}
                disabled={loading !== null}
                className="mt-3 border border-amber/60 bg-amber/10 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-amber hover:bg-amber/20 disabled:opacity-50"
              >
                {loading === 'refill' ? 'Lädt…' : 'Aufladen'}
              </button>
            </div>
          </div>
          {error && <div className="mt-4 font-mono text-xs text-red">{error}</div>}
        </div>

        <div className="panel mb-6 p-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-amber">DLC</div>
              <h2 className="font-orbitron text-xl font-bold text-white">HUD Customizer &amp; Shape-Shifter</h2>
              <p className="mt-2 max-w-md font-mono text-[13px] text-white/50">
                Bearbeitungsmodus fürs HUD: Widgets per Drag &amp; Drop verschieben, alternatives Strahl-Design freischalten.
              </p>
            </div>
            <div className="text-center">
              <div className="font-orbitron text-3xl font-black text-white">25€<span className="text-sm font-normal text-white/40"> einmalig</span></div>
              <button disabled className="mt-3 cursor-not-allowed border border-white/10 px-6 py-3 font-mono text-xs uppercase tracking-widest text-white/30">
                Bald verfügbar
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-white/40">Weitere DLCs</div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {DLCS.map((d) => (
            <div key={d.name} className="panel flex flex-col p-6">
              <h3 className="font-orbitron text-sm font-bold uppercase tracking-wide text-white">{d.name}</h3>
              <p className="mt-2 flex-1 font-mono text-[13px] leading-relaxed text-white/50">{d.desc}</p>
              <button disabled className="mt-4 cursor-not-allowed border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white/30">
                In Vorbereitung
              </button>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
