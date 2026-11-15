import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './translations/en';
import he from './translations/he';

const STORAGE_KEY = 'goodlink:lang';
const PREF_KEY = 'goodlink:lang_pref'; // only set when user picks from footer
const dictionaries = { en, he };

const LanguageContext = createContext(null);

function applyDocumentDirection(lang) {
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getInitialLanguage() {
  const pref = readStored(PREF_KEY);
  if (pref === 'he' || pref === 'en') return pref;

  const cached = readStored(STORAGE_KEY);
  if (cached === 'he' || cached === 'en') return cached;

  return 'en';
}

async function detectIsIsrael() {
  const fetchWithTimeout = async (url, parse) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`geo_failed:${res.status}`);
      return parse(res);
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    const country = await fetchWithTimeout('https://api.country.is/', async (res) => {
      const data = await res.json();
      return String(data?.country || '').toUpperCase();
    });
    return country === 'IL';
  } catch {
    try {
      const country = await fetchWithTimeout('https://ipapi.co/country_code/', async (res) => {
        return (await res.text()).trim().toUpperCase();
      });
      return country === 'IL';
    } catch {
      return false;
    }
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    applyDocumentDirection(language);
    writeStored(STORAGE_KEY, language);
  }, [language]);

  // Auto language by IP only when the user has not chosen manually in the footer
  useEffect(() => {
    const pref = readStored(PREF_KEY);
    if (pref === 'he' || pref === 'en') return;

    let cancelled = false;
    (async () => {
      const isIsrael = await detectIsIsrael();
      if (cancelled) return;
      // Re-check preference in case user clicked while geo was loading
      const latestPref = readStored(PREF_KEY);
      if (latestPref === 'he' || latestPref === 'en') return;
      setLanguageState(isIsrael ? 'he' : 'en');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next) => {
    if (next !== 'en' && next !== 'he') return;
    writeStored(PREF_KEY, next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'he' ? 'en' : 'he';
      writeStored(PREF_KEY, next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key) => {
      const dict = dictionaries[language] || en;
      return dict[key] ?? en[key] ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      isRtl: language === 'he',
      dir: language === 'he' ? 'rtl' : 'ltr',
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
