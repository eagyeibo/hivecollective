// ─────────────────────────────────────────────────────────────
// src/i18n/index.js
// i18next setup — 8 languages with RTL support for Arabic
// ─────────────────────────────────────────────────────────────
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import sw from './sw.json';
import ha from './ha.json';
import ar from './ar.json';
import pt from './pt.json';
import ak from './ak.json';

const RTL_LANGS = ['ar'];

function applyDirection(lng) {
  const dir = RTL_LANGS.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

const savedLang = localStorage.getItem('hc_lang') || 'en';
applyDirection(savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      sw: { translation: sw },
      ha: { translation: ha },
      ar: { translation: ar },
      pt: { translation: pt },
      ak: { translation: ak },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', applyDirection);

export default i18n;
