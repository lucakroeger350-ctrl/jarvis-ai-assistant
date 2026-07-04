'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        // emailRedirectTo explizit setzen - ohne das nutzt Supabase die im Dashboard
        // hinterlegte "Site URL", die bei einem neuen Projekt standardmäßig auf
        // localhost steht (Ursache für den "Verbindung abgelehnt"-Fehler im Bestätigungslink).
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dossier` },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ type: 'info', text: 'Bestätigungs-Link wurde an deine E-Mail-Adresse gesendet. Bitte E-Mails prüfen und den Link anklicken, danach anmelden.' });
        } else {
          window.location.href = '/dossier';
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dossier';
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unbekannter Fehler.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dossier` },
    });
    if (error) setMessage({ type: 'error', text: error.message });
  }

  return (
    <>
      <Nav />
      <section className="mx-auto max-w-md px-6 py-20">
        <div className="panel p-8">
          <div className="mb-6 flex gap-2 font-mono text-xs uppercase tracking-widest">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 border px-4 py-2 ${mode === 'login' ? 'border-amber bg-amber/10 text-amber' : 'border-white/10 text-white/40'}`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 border px-4 py-2 ${mode === 'register' ? 'border-amber bg-amber/10 text-amber' : 'border-white/10 text-white/40'}`}
            >
              Registrieren
            </button>
          </div>

          <button
            onClick={handleGoogle}
            type="button"
            className="mb-5 w-full border border-white/20 bg-white/5 px-4 py-3 font-mono text-xs uppercase tracking-widest text-white/80 hover:border-white/40"
          >
            Mit Google fortfahren
          </button>
          <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-white/30">
            <div className="h-px flex-1 bg-white/10" /> oder <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-white/40">E-Mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-amber/30 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-white/40">Passwort</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-amber/30 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-amber"
              />
            </div>
            {message && (
              <div className={`font-mono text-xs ${message.type === 'error' ? 'text-red' : 'text-green'}`}>{message.text}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full border border-amber bg-amber px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_24px_rgba(255,87,34,0.4)] disabled:opacity-50"
            >
              {loading ? 'Lädt…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}
