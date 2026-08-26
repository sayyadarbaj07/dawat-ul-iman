export {
  resources,
  supportedLanguages,
  getText,
  getTranslation,
} from "./translations";

export function createI18nContext() {
  return {
    resources: require("./translations").resources,
    supportedLanguages: require("./translations").supportedLanguages,
    getText: require("./translations").getText,
    getTranslation: require("./translations").getTranslation,
  };
}
