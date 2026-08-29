let translations = {};
let currentLanguage = "en";

export function configureI18n(
  dictionary,
  language = "en"
) {

  translations = dictionary || {};
  currentLanguage = language;
}

export function setLanguage(language) {
  currentLanguage = language;
}

export function getLanguage() {
  return currentLanguage;
}

export function hasTranslation(value) {
  return Object.prototype.hasOwnProperty.call(
    translations,
    String(value ?? "")
  );
}

export function translate(value) {

  const key = String(value ?? "");
  const entry = translations[key];

  if (!entry) {
    return key;
  }

  return (
    entry[currentLanguage] ||
    entry.en ||
    key
  );
}

export function getLocalizedText(value) {

  if (!value) {
    return "";
  }

  return (
    value[currentLanguage] ||
    value.en ||
    ""
  );
}

export function getLocalizedArray(value) {

  if (!value) {
    return [];
  }

  const localized =
    Array.isArray(value[currentLanguage])
      ? value[currentLanguage]
      : [];

  const english =
    Array.isArray(value.en)
      ? value.en
      : [];

  const length = Math.max(
    localized.length,
    english.length
  );

  return Array.from(
    { length },
    (_, index) => {

      const item = localized[index];

      return String(item ?? "").trim() !== ""
        ? item
        : (english[index] ?? "");
    }
  );
}

export function updateInterfaceLanguage(
  root = document
) {

  document.documentElement.lang =
    currentLanguage;

  root
    .querySelectorAll("[data-i18n]")
    .forEach(element => {
      element.textContent =
        translate(element.dataset.i18n);
    });
}
