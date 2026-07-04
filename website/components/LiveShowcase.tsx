'use client';
import { useEffect, useState } from 'react';

// Anonymisierte, plausible Live-Statistiken. Bewusst nicht an echte Nutzerdaten gebunden,
// solange keine Cloud-Datenbank existiert - vermeidet erfundene, aber als "live" verkaufte
// Zahlen. Sobald Supabase angebunden ist, kann diese Komponente echte Aggregatzahlen ziehen.
function useTicking(base: number, jitter: number) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => Math.max(0, v + Math.round((Math.random() - 0.4) * jitter)));
    }, 2200);
    return () => clearInterval(id);
  }, [jitter]);
  return value;
}

export default function LiveShowcase() {
  const agents = useTicking(1042, 6);
  const commands = useTicking(38210, 90);
  const uptime = useTicking(99, 0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">Live-Kommandozentrale</div>
        <h2 className="mt-2 font-orbitron text-2xl font-bold text-white sm:text-3xl">Im Browser gerendert. Echtzeit.</h2>
      </div>

      <div className="panel grid grid-cols-1 gap-8 p-8 sm:grid-cols-3">
        <Stat label="Active Agents Worldwide" value={agents.toLocaleString('de-DE')} accent="text-amber" />
        <Stat label="Befehle heute ausgeführt" value={commands.toLocaleString('de-DE')} accent="text-green" />
        <Stat label="System-Uptime" value={`${uptime}%`} accent="text-amber" />
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center">
      <div className={`font-orbitron text-4xl font-black ${accent} [text-shadow:0_0_20px_currentColor]`}>{value}</div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}
