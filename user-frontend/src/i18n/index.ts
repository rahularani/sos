import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from './locales';
import { DEFAULT_LANGUAGE, STORAGE_KEY } from './languages';

const resources: Record<string, any> = {};
Object.keys(translations).forEach((lang) => {
  resources[lang] = {
    common: translations[lang].common,
    emergency: translations[lang].emergency,
    auth: translations[lang].auth,
  };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    ns: ['common', 'emergency', 'auth'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });


i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
    document.documentElement.setAttribute('lang', lng);
  }
});

export default i18n;
