'use client';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

interface ProfileRow {
  email: string;
  display_name: string | null;
  account: { tier?: string; coins?: number };
  is_master: boolean;
}

export default function DossierPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) fetchProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as ProfileRow | null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return (
      <>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-24 text-center font-mono text-sm text-white/40">Lädt…</section>
        <Footer />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">VIP-Dossier</div>
          <h1 className="mt-2 font-orbitron text-2xl font-bold text-white">Zugriff gesperrt</h1>
          <div className="panel mt-8 p-8 font-mono text-sm text-white/50">
            Bitte zuerst <a href="/login" className="text-amber underline">anmelden</a>.
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const tier = profile?.account?.tier || 'free';

  return (
    <>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">VIP-Dossier</div>
          <h1 className="mt-2 font-orbitron text-2xl font-bold text-white">{session.user.email}</h1>
        </div>

        <div className="panel mt-8 p-8">
          <div className="grid grid-cols-2 gap-6 font-mono text-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">Konto-Stufe</div>
              <div className={`mt-1 text-xl font-bold ${tier === 'vip' ? 'text-green' : 'text-white/70'}`}>
                {tier.toUpperCase()} {profile?.is_master && '👑'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">Coins</div>
              <div className="mt-1 text-xl font-bold text-white/70">{profile?.account?.coins ?? 0}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-8 w-full border border-red/40 bg-red/10 px-6 py-3 font-mono text-xs uppercase tracking-widest text-red hover:bg-red/20"
          >
            Abmelden
          </button>
        </div>
      </section>
      <Footer />
    </>
  );
}
