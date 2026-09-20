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
  getLanguage,
  getLocalizedText,
  setLanguage,
  translate,
  updateInterfaceLanguage
} from "../shared/i18n.js";
import {
  loadStoredObject,
  saveStoredObject
} from "../shared/storage.js";
import {
  createLocalizedSelect
} from "../shared/select.js";
import {
  renderContent
} from "../shared/content-renderer.js";

const MISSING_VALUE = "__missing__";

const TYPE_ORDER = [
  "Fetish",
  "Talen"
];

const REQUIREMENT_TYPE_ORDER = [
  "Tribe",
  "Auspice"
];

let items = [];

let typeChoices;
let levelChoices;
let gnosisChoices;
let requirementTypeChoices;
let requirementValueChoices;
let bookChoices;

let filterValues = {
  types: [],
  levels: [],
  gnosis: [],
  requirementTypes: [],
  books: []
};

async function initializePage() {
  try {
    const [itemData, dictionary] =
      await Promise.all([
        loadJson("./data/fetishes.json?v=1.0.5"),
        loadJson("./data/translations.json?v=1.0.5")
      ]);

    if (!Array.isArray(itemData)) {
      throw new Error(
        "fetishes.json must contain an array."
      );
    }

    items = itemData;

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

    document.getElementById(
      "languageSelect"
    ).value = language;

    updateInterfaceLanguage();
    initializeBrowser(settings.fetishes || {});

    console.log(
      `Loaded ${items.length} fetishes and talens.`
    );
  } catch (error) {
    console.error("initializePage()", error);

    renderLoadError(
      document.getElementById("fetishList"),
      translate("Failed to load page data"),
      error
    );
  }
}

function initializeBrowser(settings) {
  const requirements = items
    .map(item => item.requirement)
    .filter(Boolean);

  const levels = uniqueValues(
    items.flatMap(item =>
      item.versions.map(version =>
        filterValue(version.level)
      )
    )
  );

  const gnosis = uniqueValues(
    items.flatMap(item =>
      item.versions.map(version =>
        filterValue(version.gnosis)
      )
    )
  );

  filterValues = {
    types: uniqueValues(
      items.map(item => item.type)
    ),
    levels,
    gnosis,
    requirementTypes: uniqueValues(
      requirements.map(requirement =>
        requirement.type
      )
    ),
    books: uniqueValues(
      items.flatMap(item =>
        item.versions.map(version =>
          version.book
        )
      )
    )
  };

  document.getElementById(
    "requirementFilters"
  ).hidden = requirements.length === 0;

  createFilterChoices(settings);
  bindFilterEvents();
  bindLanguageEvent();
  filterItems();
}

function createFilterChoices(settings) {
  const missingLabels = {
    [MISSING_VALUE]: "Not specified"
  };

  typeChoices = createLocalizedSelect({
    elementId: "fetishTypeSelect",
    values: filterValues.types,
    placeholder: "Type",
    selectedValues: settings.type || [],
    preferredOrder: TYPE_ORDER
  });

  levelChoices = createLocalizedSelect({
    elementId: "fetishLevelSelect",
    values: filterValues.levels,
    placeholder: "Level",
    selectedValues: settings.level || [],
    labelKeys: missingLabels,
    preferredOrder: numericOrder(
      filterValues.levels
    )
  });

  gnosisChoices = createLocalizedSelect({
    elementId: "fetishGnosisSelect",
    values: filterValues.gnosis,
    placeholder: "Gnosis",
    selectedValues: settings.gnosis || [],
    labelKeys: missingLabels,
    preferredOrder: numericOrder(
      filterValues.gnosis
    )
  });

  requirementTypeChoices =
    createLocalizedSelect({
      elementId: "requirementTypeSelect",
      values: filterValues.requirementTypes,
      placeholder: "Requirement",
      selectedValues:
        settings.requirementType || [],
      preferredOrder: REQUIREMENT_TYPE_ORDER
    });

  updateRequirementValueOptions(
    settings.requirementValue || []
  );

  bookChoices = createLocalizedSelect({
    elementId: "fetishBookSelect",
    values: filterValues.books,
    placeholder: "Sourcebook",
    selectedValues: settings.book || []
  });
}

function bindFilterEvents() {
  [
    "fetishTypeSelect",
    "fetishLevelSelect",
    "fetishGnosisSelect",
    "requirementValueSelect",
    "fetishBookSelect"
  ].forEach(elementId => {
    document
      .getElementById(elementId)
      .addEventListener("change", () => {
        saveSettings();
        filterItems();
      });
  });

  document
    .getElementById("requirementTypeSelect")
    .addEventListener("change", () => {
      updateRequirementValueOptions();
      saveSettings();
      filterItems();
    });
}

function bindLanguageEvent() {
  document
    .getElementById("languageSelect")
    .addEventListener("change", event => {
      const selections = getCurrentSelections();

      setLanguage(event.target.value);
      updateInterfaceLanguage();
      rebuildFilterChoices(selections);
      saveSettings();
      filterItems();
    });
}

function updateRequirementValueOptions(
  selectedValues = []
) {
  const selectedTypes =
    requirementTypeChoices.getValue(true);

  const values = uniqueValues(
    items
      .map(item => item.requirement)
      .filter(requirement =>
        requirement &&
        (
          selectedTypes.length === 0 ||
          selectedTypes.includes(
            requirement.type
          )
        )
      )
      .map(requirement => requirement.value)
  );

  if (requirementValueChoices) {
    requirementValueChoices.destroy();
  }

  requirementValueChoices =
    createLocalizedSelect({
      elementId: "requirementValueSelect",
      values,
      placeholder: "Requirement value",
      selectedValues
    });
}

function rebuildFilterChoices(selections) {
  [
    typeChoices,
    levelChoices,
    gnosisChoices,
    requirementTypeChoices,
    requirementValueChoices,
    bookChoices
  ].forEach(instance => {
    if (instance) {
      instance.destroy();
    }
  });

  requirementValueChoices = null;
  createFilterChoices(selections);
}

function filterItems() {
  const selections = getCurrentSelections();

  const filtered = items.filter(item => {
    if (
      selections.type.length > 0 &&
      !selections.type.includes(item.type)
    ) {
      return false;
    }

    if (
      selections.requirementType.length > 0 &&
      (
        !item.requirement ||
        !selections.requirementType.includes(
          item.requirement.type
        )
      )
    ) {
      return false;
    }

    if (
      selections.requirementValue.length > 0 &&
      (
        !item.requirement ||
        !selections.requirementValue.includes(
          item.requirement.value
        )
      )
    ) {
      return false;
    }

    return item.versions.some(version =>
      versionMatches(version, selections)
    );
  });

  sortItems(filtered);
  renderItems(filtered, selections);
}

function versionMatches(version, selections) {
  return (
    (
      selections.level.length === 0 ||
      selections.level.includes(
        filterValue(version.level)
      )
    ) &&
    (
      selections.gnosis.length === 0 ||
      selections.gnosis.includes(
        filterValue(version.gnosis)
      )
    ) &&
    (
      selections.book.length === 0 ||
      selections.book.includes(version.book)
    )
  );
}

function renderItems(filteredItems, selections) {
  const container =
    document.getElementById("fetishList");

  container.innerHTML = "";

  if (filteredItems.length === 0) {
    const message = document.createElement("div");
    message.className = "empty-message";
    message.textContent = translate(
      "No items found"
    );
    container.appendChild(message);
    return;
  }

  filteredItems.forEach((item, itemIndex) => {
    let versionIndex = item.versions.findIndex(
      version => versionMatches(
        version,
        selections
      )
    );

    if (versionIndex === -1) {
      versionIndex = 0;
    }

    const card =
      document.createElement("article");

    card.className = "fetish-card";

    const selectId =
      `fetish-version-${itemIndex}`;

    const metadataId =
      `fetish-metadata-${itemIndex}`;

    const descriptionId =
      `fetish-description-${itemIndex}`;

    const selectedVersion =
      item.versions[versionIndex];

    card.innerHTML = `
      <div class="fetish-title">
        ${getLocalizedText(item.names)}
      </div>

      <div
        id="${metadataId}"
        class="fetish-meta">
        ${renderMetadata(item, selectedVersion)}
      </div>

      <select id="${selectId}">
        ${item.versions.map((version, index) => `
          <option
            value="${index}"
            ${index === versionIndex
              ? "selected"
              : ""}>
            ${version.book}
            ${version.edition
              ? ` (${translate(version.edition)})`
              : ""}
          </option>
        `).join("")}
      </select>

      <div id="${descriptionId}">
        ${renderContent(selectedVersion)}
      </div>
    `;

    container.appendChild(card);

    document
      .getElementById(selectId)
      .addEventListener("change", event => {
        const version = item.versions[
          Number(event.target.value)
        ];

        document.getElementById(
          metadataId
        ).innerHTML = renderMetadata(
          item,
          version
        );

        document.getElementById(
          descriptionId
        ).innerHTML = renderContent(version);
      });
  });
}

function renderMetadata(item, version) {
  const parts = [
    translate(item.type),
    `${translate("Level")}: ` +
      displayValue(version.level),
    `${translate("Gnosis")}: ` +
      displayValue(version.gnosis)
  ];

  if (item.requirement) {
    parts.push(
      `${translate(item.requirement.type)}: ` +
      translate(item.requirement.value)
    );
  }

  return parts.join(" | ");
}

function displayValue(value) {
  return value === null || value === undefined
    ? translate("Not specified")
    : value;
}

function filterValue(value) {
  return value === null || value === undefined
    ? MISSING_VALUE
    : String(value);
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function numericOrder(values) {
  return values
    .filter(value => value !== MISSING_VALUE)
    .sort((a, b) => Number(a) - Number(b))
    .concat(
      values.includes(MISSING_VALUE)
        ? [MISSING_VALUE]
        : []
    );
}

function sortItems(itemsToSort) {
  return itemsToSort.sort((a, b) => {
    const levelA = Math.min(
      ...a.versions
        .map(version => version.level)
        .filter(level => level !== null)
    );

    const levelB = Math.min(
      ...b.versions
        .map(version => version.level)
        .filter(level => level !== null)
    );

    if (levelA !== levelB) {
      return levelA - levelB;
    }

    return getLocalizedText(a.names).localeCompare(
      getLocalizedText(b.names),
      getLanguage()
    );
  });
}

function getCurrentSelections() {
  return {
    type: typeChoices.getValue(true),
    level: levelChoices.getValue(true),
    gnosis: gnosisChoices.getValue(true),
    requirementType:
      requirementTypeChoices.getValue(true),
    requirementValue:
      requirementValueChoices.getValue(true),
    book: bookChoices.getValue(true)
  };
}

function saveSettings() {
  const currentSettings = loadStoredObject(
    SETTINGS_STORAGE_KEY,
    {}
  );

  saveStoredObject(
    SETTINGS_STORAGE_KEY,
    {
      ...currentSettings,
      language: getLanguage(),
      fetishes: getCurrentSelections()
    }
  );
}

initializePage();
