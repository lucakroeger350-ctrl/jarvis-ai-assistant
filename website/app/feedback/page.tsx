'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

type Kind = 'bug' | 'wish';

export default function FeedbackPage() {
  const [kind, setKind] = useState<Kind>('bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setStatus('sending');

    const table = kind === 'bug' ? 'bug_reports' : 'feature_requests';
    const payload: Record<string, string> = { description: description.trim() };
    if (email.trim()) payload.user_email = email.trim();

    const { error } = await supabase.from(table).insert(payload);
    if (error) { setStatus('error'); return; }

    setDescription('');
    setStatus('sent');
  }

  return (
    <>
      <Nav />
      <section className="mx-auto max-w-2xl px-6 py-24">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">Feedback</div>
          <h1 className="mt-2 font-orbitron text-2xl font-bold text-white">Bug melden oder Feature wünschen</h1>
          <p className="mt-3 font-mono text-sm text-white/50">
            Landet direkt bei den Entwicklern - E-Mail ist optional, nur falls wir bei Rückfragen antworten sollen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel mt-10 p-8">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind('bug')}
              className={`flex-1 border px-4 py-2 font-mono text-xs uppercase tracking-widest ${kind === 'bug' ? 'border-amber bg-amber/10 text-amber' : 'border-white/20 text-white/50'}`}
            >
              🐞 Bug melden
            </button>
            <button
              type="button"
              onClick={() => setKind('wish')}
              className={`flex-1 border px-4 py-2 font-mono text-xs uppercase tracking-widest ${kind === 'wish' ? 'border-amber bg-amber/10 text-amber' : 'border-white/20 text-white/50'}`}
            >
              ✨ Feature wünschen
            </button>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            placeholder={kind === 'bug' ? 'Was ist passiert? Was hast du erwartet?' : 'Was fehlt dir? Was soll JARVIS können?'}
            className="mt-6 w-full border border-white/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-amber/60"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail (optional)"
            className="mt-3 w-full border border-white/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-amber/60"
          />

          {status === 'sent' && (
            <div className="mt-4 border border-green/40 bg-green/10 px-3 py-2 font-mono text-xs text-green">
              Danke! Ist angekommen.
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 border border-red/40 bg-red/10 px-3 py-2 font-mono text-xs text-red">
              Konnte nicht gesendet werden - bitte später erneut versuchen.
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending' || !description.trim()}
            className="mt-6 w-full border border-amber/60 bg-amber/10 px-6 py-3 text-xs uppercase tracking-widest text-amber hover:bg-amber/20 disabled:opacity-50"
          >
            {status === 'sending' ? 'Sende…' : 'Absenden'}
          </button>
        </form>
      </section>
      <Footer />
    </>
  );
}
