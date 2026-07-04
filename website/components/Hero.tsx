'use client';
import ParticleNet from './ParticleNet';
import { useLang } from '@/lib/i18n';

export default function Hero() {
  const { t } = useLang();
  return (
    <section id="download" className="relative overflow-hidden px-6 pb-28 pt-24 text-center">
      <ParticleNet />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 45%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="relative mx-auto max-w-4xl">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 border border-amber/40 bg-amber/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-amber">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_8px_#ff5722]" />
          {t('hero.badge')}
        </div>

        <h1 className="font-orbitron text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
          {t('hero.title1')}{' '}
          <span className="text-amber [text-shadow:0_0_30px_rgba(255,87,34,0.6)]">{t('hero.title2')}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-white/50">
          {t('hero.desc')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#" className="w-full border border-amber bg-amber px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_rgba(255,87,34,0.5)] transition hover:shadow-[0_0_45px_rgba(255,87,34,0.7)] sm:w-auto">
            {t('hero.download')}
          </a>
          <a href="#pricing" className="w-full border border-white/20 px-8 py-4 font-mono text-sm uppercase tracking-widest text-white/70 hover:border-amber/50 hover:text-amber sm:w-auto">
            {t('hero.pricing')}
          </a>
        </div>
        <div className="mt-4 font-mono text-[11px] text-white/30">{t('hero.free')}</div>
      </div>
    </section>
  );
}
