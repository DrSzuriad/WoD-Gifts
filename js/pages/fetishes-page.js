import {
  SETTINGS_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  applyAppVersion
} from "../shared/config.js";
import {
  loadJson,
  renderLoadError
} from "../shared/data-loader.js";
import {
  configureI18n,
  setLanguage,
  translate,
  updateInterfaceLanguage
} from "../shared/i18n.js";
import {
  loadStoredObject,
  saveStoredObject
} from "../shared/storage.js";

async function initializePage() {

  try {
    const dictionary = await loadJson(
      "./data/translations.json"
    );

    const settings = loadStoredObject(
      SETTINGS_STORAGE_KEY,
      {}
    );

    const language =
      SUPPORTED_LANGUAGES.includes(
        settings.language
      )
        ? settings.language
        : "en";

    configureI18n(dictionary, language);
    applyAppVersion();

    const languageSelect =
      document.getElementById("languageSelect");

    languageSelect.value = language;
    updateInterfaceLanguage();

    languageSelect.addEventListener(
      "change",
      event => {
        setLanguage(event.target.value);
        updateInterfaceLanguage();

        const currentSettings =
          loadStoredObject(
            SETTINGS_STORAGE_KEY,
            {}
          );

        saveStoredObject(
          SETTINGS_STORAGE_KEY,
          {
            ...currentSettings,
            language: event.target.value
          }
        );
      }
    );
  } catch (error) {
    console.error("initializePage()", error);

    renderLoadError(
      document.getElementById("fetishesContent"),
      translate("Failed to load page data"),
      error
    );
  }
}

initializePage();
