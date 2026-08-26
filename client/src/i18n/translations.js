import en from "./locales/en.json";
import ur from "./locales/ur.json";

export const resources = { en, ur };
export const supportedLanguages = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
];

export function getTranslation(language, section, key, params = {}) {
  const fallback =
    resources.en[section]?.[key] || resources.en.common[key] || key;
  const value =
    resources[language]?.[section]?.[key] ||
    resources[language]?.common?.[key] ||
    fallback;

  return Object.entries(params).reduce(
    (result, [paramKey, paramValue]) =>
      result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
    value,
  );
}

export function getText(language, key, params = {}) {
  return getTranslation(language, "common", key, params);
}
