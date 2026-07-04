'use client';
import { useLang } from '@/lib/i18n';

const GROUPS = [
  {
    title: 'Dein Sprach-Assistent',
    icon: '01',
    items: [
      'Hört per Knopfdruck zu, versteht dich lokal per KI-Spracherkennung - keine Cloud-Verzögerung.',
      'Merkt sich Fakten über dich und lernt neue Kommandos, die du ihm beibringst.',
      'Beantwortet Fragen, öffnet Programme, sucht im Web, recherchiert ganze Themen für dich.',
    ],
  },
  {
    title: 'Sicherheit auf Militär-Niveau',
    icon: '02',
    items: [
      'Gesichtserkennungs-Wächter: sperrt den PC automatisch, wenn ein Unbekannter vor der Kamera erscheint.',
      'AES-256-verschlüsselter Passwort-Tresor - Passwörter werden per PIN sicher eingetippt, nie in die Zwischenablage kopiert.',
      'Boss-Key/Tarnmodus: ein Tastendruck, und alles verschwindet unauffällig.',
    ],
  },
  {
    title: 'Gaming-Optimierung',
    icon: '03',
    items: [
      'Erkennt automatisch, wenn du ein Spiel startest, und fragt, ob er sich minimieren soll.',
      'Schließt RAM-Fresser im Hintergrund und drosselt Bandbreite bei Ping-Spitzen.',
      'Minimiert sich zu einer kleinen Kugel am Bildschirmrand - immer erreichbar, nie im Weg.',
    ],
  },
  {
    title: 'Automatisierung & Protokolle',
    icon: '04',
    items: [
      'Night Protocol: cinematischer Shutdown mit Verabschiedung, wenn du Feierabend machst.',
      'Ghost Protocol: Mikro, Ton und Kamera in einem Befehl stummschalten.',
      'Systemdiagnose, Datenträger-Bereinigung und Zwischenablage-Zusammenfassung auf Zuruf.',
    ],
  },
];

export default function Capabilities() {
  const { t } = useLang();
  return (
    <section id="capabilities" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-14 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-amber/80">{t('capabilities.badge')}</div>
        <h2 className="mt-2 font-orbitron text-3xl font-bold text-white sm:text-4xl">
          {t('capabilities.title1')} <span className="text-amber">{t('capabilities.title2')}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-mono text-sm text-white/50">
          {t('capabilities.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title} className="panel p-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-orbitron text-3xl font-black text-amber/30">{g.icon}</span>
              <h3 className="font-orbitron text-lg font-bold uppercase tracking-wide text-white">{g.title}</h3>
            </div>
            <ul className="space-y-2.5">
              {g.items.map((item) => (
                <li key={item} className="flex gap-3 font-mono text-[13px] leading-relaxed text-white/55">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-amber" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
