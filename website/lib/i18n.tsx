'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'de' | 'en';

const DICT: Record<Lang, Record<string, string>> = {
  de: {
    'nav.capabilities': 'Was kann JARVIS',
    'nav.features': 'Features',
    'nav.pricing': 'Preise',
    'nav.marketplace': 'Marketplace',
    'nav.dossier': 'VIP-Dossier',
    'nav.login': 'Login',
    'nav.download': 'Download',
    'hero.badge': 'System Online // v2.0',
    'hero.title1': 'Transformiere deinen PC in die',
    'hero.title2': 'ultimative Sci-Fi-Kommandozentrale.',
    'hero.desc': 'JARVIS ist dein persönlicher KI-Assistent im Tony-Stark-Stil: Sprachsteuerung, Gaming-Optimierung, Sicherheits-Protokolle und ein komplettes Taktik-HUD auf deinem Desktop.',
    'hero.download': 'Download für Windows 10/11',
    'hero.pricing': 'Preise ansehen',
    'hero.free': 'Kostenlos starten - kein Zahlungsmittel nötig',
    'capabilities.badge': 'Was kann JARVIS',
    'capabilities.title1': 'Nicht nur ein Chatbot.',
    'capabilities.title2': 'Ein System.',
    'capabilities.desc': 'JARVIS läuft direkt auf deinem PC - er sieht, hört und handelt in Echtzeit. Kein Browser-Tab, kein Warten auf eine Antwort im Chat-Fenster: JARVIS steuert dein System wirklich.',
    'features.badge': 'Feature-Matrix',
    'features.title1': 'Alles, was ein Kommandozentrale braucht.',
    'features.more': 'Und vieles mehr - JARVIS wächst mit jedem Update um weitere Fähigkeiten.',
    'pricing.badge': 'Preise',
    'pricing.title': 'Free-User vs. VIP-Command',
    'pricing.desc': 'Free reicht zum Reinschnuppern. VIP-Command ist für alle, die JARVIS wirklich als Kommandozentrale nutzen wollen.',
  },
  en: {
    'nav.capabilities': 'What JARVIS Can Do',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.marketplace': 'Marketplace',
    'nav.dossier': 'VIP Dossier',
    'nav.login': 'Login',
    'nav.download': 'Download',
    'hero.badge': 'System Online // v2.0',
    'hero.title1': 'Transform your PC into the',
    'hero.title2': 'ultimate Sci-Fi command center.',
    'hero.desc': 'JARVIS is your personal Tony-Stark-style AI assistant: voice control, gaming optimization, security protocols, and a complete tactical HUD on your desktop.',
    'hero.download': 'Download for Windows 10/11',
    'hero.pricing': 'View pricing',
    'hero.free': 'Start for free - no payment method required',
    'capabilities.badge': 'What JARVIS Can Do',
    'capabilities.title1': 'Not just a chatbot.',
    'capabilities.title2': 'A system.',
    'capabilities.desc': 'JARVIS runs directly on your PC - it sees, hears, and acts in real time. No browser tab, no waiting for a chat reply: JARVIS actually controls your system.',
    'features.badge': 'Feature Matrix',
    'features.title1': 'Everything a command center needs.',
    'features.more': 'And much more - JARVIS grows new capabilities with every update.',
    'pricing.badge': 'Pricing',
    'pricing.title': 'Free User vs. VIP Command',
    'pricing.desc': 'Free is enough to get a taste. VIP Command is for anyone who wants to really use JARVIS as a command center.',
  },
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }>({
  lang: 'de',
  setLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('jarvis-lang') as Lang | null) : null;
    if (saved === 'de' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('jarvis-lang', l);
  }

  function t(key: string) {
    return DICT[lang][key] || DICT.de[key] || key;
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
