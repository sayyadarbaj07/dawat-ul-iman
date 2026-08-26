import { createContext, useContext, useMemo, useState, useEffect } from "react";
import {
  getText,
  getTranslation,
  supportedLanguages,
} from "@/i18n/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-language") || "en";
    }
    return "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app-language", language);
    }
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = language === "ur" ? "ur" : "en";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: supportedLanguages,
      t: (key, params = {}) => getText(language, key, params),
      tr: (section, key, params = {}) =>
        getTranslation(language, section, key, params),
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
