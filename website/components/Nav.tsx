'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import Logo from './Logo';

export default function Nav() {
  const { lang, setLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/#capabilities', label: t('nav.capabilities') },
    { href: '/#features', label: t('nav.features') },
    { href: '/#pricing', label: t('nav.pricing') },
    { href: '/marketplace', label: t('nav.marketplace') },
    { href: '/activity', label: t('nav.activity') },
    { href: '/mobile', label: 'Mobile' },
    { href: '/feedback', label: 'Feedback' },
    { href: '/dossier', label: t('nav.dossier') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-amber/30 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-orbitron text-lg font-extrabold tracking-widest text-amber">
          <Logo size={26} />
          <span className="truncate">
            JARVIS <span className="hidden text-xs font-medium tracking-[0.3em] text-white/40 sm:inline">by Cortex // Command Center</span>
          </span>
        </Link>

        {/* Desktop-Nav: verlinkte Seiten - auf schmalen Bildschirmen ersetzt durch das
            Burger-Menü unten, damit keine Seite auf Mobile unerreichbar bleibt. */}
        <nav className="hidden gap-6 font-mono text-xs uppercase tracking-widest text-white/60 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-amber">{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="border border-white/20 px-2.5 py-2 font-mono text-xs uppercase tracking-widest text-white/60 hover:border-white/40 sm:px-3"
            title="Sprache wechseln / switch language"
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <Link
            href="/login"
            className="hidden border border-amber/60 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber shadow-[0_0_14px_rgba(255,87,34,0.25)] hover:bg-amber/20 lg:inline-block"
          >
            {t('nav.login')}
          </Link>
          <Link
            href="/#download"
            className="border border-amber/60 bg-amber/10 px-3 py-2 font-mono text-xs uppercase tracking-widest text-amber shadow-[0_0_14px_rgba(255,87,34,0.25)] hover:bg-amber/20 sm:px-4"
          >
            {t('nav.download')}
          </Link>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="border border-white/20 px-2.5 py-2 font-mono text-xs text-white/60 hover:border-white/40 lg:hidden"
            aria-label="Menü öffnen"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-amber/20 bg-black/95 px-4 py-3 font-mono text-xs uppercase tracking-widest text-white/70 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="rounded px-2 py-3 hover:bg-white/5 hover:text-amber">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded px-2 py-3 hover:bg-white/5 hover:text-amber">
            {t('nav.login')}
          </Link>
        </nav>
      )}
    </header>
  );
}
