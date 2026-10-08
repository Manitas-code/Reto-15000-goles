import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createTranslator, type Language } from './translation';

function initialLanguage(): Language {
  const browser = (
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    ''
  )
    .toLowerCase()
    .slice(0, 2);
  const fallback = /^(es|ca|gl|eu)$/.test(browser) ? 'es' : 'en';
  try {
    return (localStorage.getItem('fg_lang') || fallback) === 'en' ? 'en' : 'es';
  } catch {
    return fallback;
  }
}
const LanguageContext = createContext<{
  lang: Language;
  t: (text: string) => string;
  setLanguage: (lang: Language) => void;
} | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(initialLanguage);
  const [title] = useState(() => document.title);
  const t = useMemo(() => createTranslator(lang), [lang]);
  const value = useMemo(
    () => ({
      lang,
      t,
      setLanguage: (next: Language) => {
        try {
          localStorage.setItem('fg_lang', next);
        } catch {
          /* Storage is optional. */
        }
        setLang(next);
      },
    }),
    [lang, t],
  );
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(title);
  }, [lang, t, title]);
  useLayoutEffect(() => {
    const api = {
      tr: t,
      get: () => lang,
      set: (next: string) => value.setLanguage(next === 'en' ? 'en' : 'es'),
    };
    window.FG_LANG = api;
    return () => {
      if (window.FG_LANG === api) delete (window as Partial<Window>).FG_LANG;
    };
  }, [lang, t, value]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required');
  return value;
}
