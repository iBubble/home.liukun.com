import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import it from './locales/it.json';

// 检测浏览器语言
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('it')) return 'it';
  return 'en';
};

// 从 localStorage 获取保存的语言偏好
const getSavedLanguage = (): string => {
  return localStorage.getItem('language') || getBrowserLanguage();
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en': { translation: en },
      'it': { translation: it },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

// 保存语言偏好到 localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
