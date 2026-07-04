'use client';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import Logo from './Logo';

export default function Nav() {
  const { lang, setLang, t } = useLang();

  return (
    <header className="sticky top-0 z-50 border-b border-amber/30 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-orbitron text-lg font-extrabold tracking-widest text-amber">
          <Logo size={26} />
          JARVIS <span className="text-xs font-medium tracking-[0.3em] text-white/40">by Cortex // Command Center</span>
        </Link>
        <nav className="hidden gap-8 font-mono text-xs uppercase tracking-widest text-white/60 md:flex">
          {/* Bug-Fix: waren vorher reine "#anchor"-Links - funktionierten nur auf der Startseite
              selbst, auf jeder anderen Seite (z.B. /dossier) passierte beim Klick gar nichts. */}
          <Link href="/#capabilities" className="hover:text-amber">{t('nav.capabilities')}</Link>
          <Link href="/#features" className="hover:text-amber">{t('nav.features')}</Link>
          <Link href="/#pricing" className="hover:text-amber">{t('nav.pricing')}</Link>
          <Link href="/marketplace" className="hover:text-amber">{t('nav.marketplace')}</Link>
          <Link href="/dossier" className="hover:text-amber">{t('nav.dossier')}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="border border-white/20 px-3 py-2 font-mono text-xs uppercase tracking-widest text-white/60 hover:border-white/40"
            title="Sprache wechseln / switch language"
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <Link
            href="/login"
            className="border border-amber/60 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber shadow-[0_0_14px_rgba(255,87,34,0.25)] hover:bg-amber/20"
          >
            {t('nav.login')}
          </Link>
          <Link
            href="/#download"
            className="border border-amber/60 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber shadow-[0_0_14px_rgba(255,87,34,0.25)] hover:bg-amber/20"
          >
            {t('nav.download')}
          </Link>
        </div>
      </div>
    </header>
  );
}
