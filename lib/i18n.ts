
import i18nOriginal from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './locales';

// Handle ESM default export quirk
const i18n = (i18nOriginal as any).default ? (i18nOriginal as any).default : i18nOriginal;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    load: 'languageOnly', // transforms en-US -> en
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Re-enable browser detection (navigator) and prioritize it after localStorage
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
