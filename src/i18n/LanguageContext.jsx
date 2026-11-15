import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './translations/en';
import he from './translations/he';
import dashboardEn from './translations/dashboardEn';
import dashboardHe from './translations/dashboardHe';

const STORAGE_KEY = 'goodlink:lang';
// v2: ignore older sticky prefs so IP detection can work again after VPN / location changes
const PREF_KEY = 'goodlink:lang_pref_v2';
const OLD_PREF_KEY = 'goodlink:lang_pref';
const dictionaries = {
  en: { ...en, ...dashboardEn },
  he: { ...he, ...dashboardHe },
};

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

function removeStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getManualPreference() {
  const pref = readStored(PREF_KEY);
  if (pref === 'he' || pref === 'en') return pref;
  return null;
}

function getInitialLanguage() {
  // Manual footer choice wins
  const pref = getManualPreference();
  if (pref) return pref;

  // Auto mode: do NOT restore cached Hebrew/English from a previous IP.
  // Start English, then apply IP detection on mount.
  return 'en';
}

async function detectCountryCode() {
  const fetchWithTimeout = async (url, parse) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`geo_failed:${res.status}`);
      return parse(res);
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    return await fetchWithTimeout('https://api.country.is/', async (res) => {
      const data = await res.json();
      return String(data?.country || '').toUpperCase();
    });
  } catch {
    try {
      return await fetchWithTimeout('https://ipapi.co/country_code/', async (res) => {
        return (await res.text()).trim().toUpperCase();
      });
    } catch {
      try {
        return await fetchWithTimeout('https://ipwho.is/', async (res) => {
          const data = await res.json();
          return String(data?.country_code || '').toUpperCase();
        });
      } catch {
        return null;
      }
    }
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    // Drop legacy sticky preference so old EN/HE header choices don't lock language forever
    removeStored(OLD_PREF_KEY);
  }, []);

  useEffect(() => {
    applyDocumentDirection(language);
    writeStored(STORAGE_KEY, language);
  }, [language]);

  // Auto language by IP only when the user has not chosen manually in the footer
  useEffect(() => {
    if (getManualPreference()) return;

    let cancelled = false;
    (async () => {
      const country = await detectCountryCode();
      if (cancelled) return;
      if (getManualPreference()) return;

      // If geo failed, keep current (default English)
      if (!country) return;

      setLanguageState(country === 'IL' ? 'he' : 'en');
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

// Safe stub for Vite Fast Refresh: when LanguageContext.jsx hot-reloads, a new
// createContext() identity is created while consumers can briefly still sit under
// the previous Provider — useContext then returns null. Avoid crashing / Sentry noise.
const HMR_FALLBACK = {
  language: 'en',
  dir: 'ltr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    if (import.meta.hot) {
      return HMR_FALLBACK;
    }
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
