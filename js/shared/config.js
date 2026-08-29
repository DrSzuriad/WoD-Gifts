export const APP_VERSION = "v1.0.4";

export const SETTINGS_STORAGE_KEY =
  "garou-gifts-settings";

export const SUPPORTED_LANGUAGES = [
  "en",
  "pl"
];

export function applyAppVersion(
  root = document
) {

  root
    .querySelectorAll("[data-app-version]")
    .forEach(element => {
      element.textContent = APP_VERSION;
    });
}
