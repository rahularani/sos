import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { adminTranslations } from './locales';
import { DEFAULT_LANGUAGE, STORAGE_KEY } from './languages';

const resources: Record<string, any> = {};
Object.keys(adminTranslations).forEach((lang) => {
  resources[lang] = {
    common: adminTranslations[lang].common,
    admin: adminTranslations[lang].admin,
  };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'admin',
    ns: ['common', 'admin'],
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
