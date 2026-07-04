'use client';
import { useLang } from '@/lib/i18n';

const FEATURES = [
  { title: 'Multi-Agenten-Kern', desc: 'Lokale Sprach-KI mit Whisper-Erkennung, Tool-Aufrufen und Gedächtnis über Sitzungen hinweg.' },
  { title: 'Cyber-Security', desc: 'Gesichtserkennungs-Wächter, AES-256-Passwort-Tresor, PIN-geschützte Sperrbildschirme.' },
  { title: 'Gaming-Optimization', desc: 'Erkennt laufende Spiele, schließt RAM-Fresser, drosselt Hintergrund-Traffic bei Ping-Spitzen.' },
  { title: 'Multi-Monitor-HUD', desc: 'Cinematische Boot-/Shutdown-Projektion und Status-Kugel auf dem Zweitmonitor.' },
  { title: 'Musik & Recherche', desc: 'Spotify-Steuerung, Web-Recherche-Drohne, Zwischenablage-Zusammenfasser.' },
  { title: 'VIP-Automationen', desc: 'Night Protocol, Ghost Protocol, Boss-Key-Tarnmodus und mehr auf Sprachbefehl.' },
  { title: 'Netzwerk-Sniper', desc: 'Priorisiert dein Spiel automatisch bei Ping-Spitzen gegenüber Hintergrund-Downloads.' },
  { title: 'Bug-Reports & Lernen', desc: 'Meldet Fehler direkt an die Entwickler und lernt aus deinen Erklärungen dazu.' },
  { title: 'Individuelles Design', desc: 'Mehrere Akzentfarben, Multi-Monitor-Layouts, eigene Tastenkombinationen.' },
];

export default function FeatureMatrix() {
  const { t } = useLang();
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">{t('features.badge')}</div>
        <h2 className="mt-2 font-orbitron text-2xl font-bold text-white sm:text-3xl">{t('features.title1')}</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel p-6">
            <div className="mb-3 h-2 w-2 bg-amber shadow-[0_0_8px_#ff5722]" />
            <h3 className="font-orbitron text-sm font-bold uppercase tracking-wider text-amber">{f.title}</h3>
            <p className="mt-2 font-mono text-[13px] leading-relaxed text-white/50">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center font-mono text-xs uppercase tracking-widest text-white/30">{t('features.more')}</div>
    </section>
  );
}
