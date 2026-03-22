import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import it from './it.json';
import en from './en.json';

const LANGUAGES = { it, en };
const STORAGE_KEY = 'ai-adventure-lang';
const DEFAULT_LANG = 'it';

const I18nContext = createContext(null);

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES[stored]) return stored;
    return DEFAULT_LANG;
  });

  const setLang = useCallback((newLang) => {
    if (LANGUAGES[newLang]) {
      setLangState(newLang);
      localStorage.setItem(STORAGE_KEY, newLang);
    }
  }, []);

  // t('admin.title') => translated string
  // t('admin.questionOf', { current: 1, total: 5 }) => interpolation
  const t = useCallback((key, params) => {
    const val = getNestedValue(LANGUAGES[lang], key)
      || getNestedValue(LANGUAGES[DEFAULT_LANG], key)
      || key;
    if (!params) return val;
    return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
  }, [lang]);

  const availableLanguages = useMemo(() => Object.keys(LANGUAGES), []);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
