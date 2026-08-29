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
  hasTranslation,
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
import {
  initializeDeveloperModeToggle
} from "../shared/developer-mode.js";

const BREED_ORDER = [
  "Homid",
  "Metis",
  "Lupus"
];

const AUSPICE_ORDER = [
  "Ragabash",
  "Theurge",
  "Philodox",
  "Galliard",
  "Ahroun"
];

let gifts = [];
let displayedGifts = [];

let breedChoices;
let auspiceChoices;
let tribeChoices;
let factionChoices;
let rankChoices;

let filterValues = {
  breeds: [],
  auspices: [],
  tribes: [],
  ranks: []
};

let isDeveloperModeEnabled =
  () => false;

async function initializePage() {

  try {
    const [giftData, dictionary] =
      await Promise.all([
        loadJson("./data/gifts.json"),
        loadJson("./data/translations.json")
      ]);

    gifts = giftData;

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

    isDeveloperModeEnabled =
      initializeDeveloperModeToggle();

    initializeGiftBrowser(settings);

    console.log(
      `Loaded ${gifts.length} gifts.`
    );
  } catch (error) {
    console.error("initializePage()", error);

    renderLoadError(
      document.getElementById("giftList"),
      translate("Failed to load gifts.json"),
      error
    );
  }
}

function initializeGiftBrowser(settings) {

  const garouGifts = gifts.filter(gift =>
    gift.requirements.some(requirement =>
      requirement.race === "Garou"
    )
  );

  const breeds = [...new Set(
    garouGifts.flatMap(gift =>
      gift.requirements
        .filter(requirement =>
          requirement.type === "Breed"
        )
        .map(requirement =>
          requirement.value
        )
    )
  )];

  const auspices = [...new Set(
    garouGifts.flatMap(gift =>
      gift.requirements
        .filter(requirement =>
          requirement.type === "Auspice"
        )
        .map(requirement =>
          requirement.value
        )
    )
  )];

  const tribes = [...new Set(
    garouGifts.flatMap(gift =>
      gift.requirements
        .filter(requirement =>
          requirement.type === "Tribe"
        )
        .map(requirement =>
          requirement.value
        )
    )
  )];

  const ranks = [1, 2, 3, 4, 5, 6];

  filterValues = {
    breeds,
    auspices,
    tribes,
    ranks
  };

  breedChoices = createLocalizedSelect({
    elementId: "breedSelect",
    values: breeds,
    placeholder: "Breed",
    selectedValues: settings.breed || [],
    preferredOrder: BREED_ORDER
  });

  auspiceChoices = createLocalizedSelect({
    elementId: "auspiceSelect",
    values: auspices,
    placeholder: "Auspice",
    selectedValues: settings.auspice || [],
    preferredOrder: AUSPICE_ORDER
  });

  tribeChoices = createLocalizedSelect({
    elementId: "tribeSelect",
    values: tribes,
    placeholder: "Tribe",
    selectedValues: settings.tribe || []
  });

  updateFactionOptions(
    settings.faction || []
  );

  rankChoices = createLocalizedSelect({
    elementId: "rankSelect",
    values: ranks,
    placeholder: "Rank",
    selectedValues: settings.rank || []
  });

  bindFilterEvents();
  bindLanguageEvent();
  filterGifts();
}

function bindFilterEvents() {

  document
    .getElementById("breedSelect")
    .addEventListener("change", () => {
      saveSettings();
      filterGifts();
    });

  document
    .getElementById("auspiceSelect")
    .addEventListener("change", () => {
      saveSettings();
      filterGifts();
    });

  document
    .getElementById("tribeSelect")
    .addEventListener("change", () => {
      updateFactionOptions();
      saveSettings();
      filterGifts();
    });

  document
    .getElementById("otherSelect")
    .addEventListener("change", () => {
      saveSettings();
      filterGifts();
    });

  document
    .getElementById("rankSelect")
    .addEventListener("change", () => {
      saveSettings();
      filterGifts();
    });
}

function bindLanguageEvent() {

  document
    .getElementById("languageSelect")
    .addEventListener("change", event => {
      setLanguage(event.target.value);

      const selections =
        getCurrentSelections();

      updateInterfaceLanguage();
      rebuildFilterChoices(selections);
      saveSettings();

      if (isDeveloperModeEnabled()) {
        renderGifts(displayedGifts);
      } else {
        filterGifts();
      }
    });
}

function filterGifts() {

  const selectedBreeds =
    breedChoices.getValue(true);

  const selectedAuspices =
    auspiceChoices.getValue(true);

  const selectedTribes =
    tribeChoices.getValue(true);

  const selectedFactions =
    factionChoices.getValue(true);

  const selectedRanks =
    rankChoices.getValue(true);

  const activeTypes = [];

  if (selectedBreeds.length > 0) {
    activeTypes.push("Breed");
  }

  if (selectedAuspices.length > 0) {
    activeTypes.push("Auspice");
  }

  if (selectedTribes.length > 0) {
    activeTypes.push("Tribe");
  }

  const filtered = gifts.filter(gift => {

    if (activeTypes.length === 0) {
      if (selectedRanks.length > 0) {
        return gift.requirements.some(
          requirement =>
            selectedRanks.includes(
              String(requirement.rank)
            )
        );
      }

      return true;
    }

    for (const requirement of gift.requirements) {
      if (
        selectedRanks.length > 0 &&
        !selectedRanks.includes(
          String(requirement.rank)
        )
      ) {
        continue;
      }

      if (!activeTypes.includes(requirement.type)) {
        continue;
      }

      if (
        requirement.type === "Breed" &&
        selectedBreeds.includes(requirement.value)
      ) {
        return true;
      }

      if (
        requirement.type === "Auspice" &&
        selectedAuspices.includes(requirement.value)
      ) {
        return true;
      }

      if (
        requirement.type === "Tribe" &&
        selectedTribes.includes(requirement.value)
      ) {
        if (selectedFactions.length > 0) {
          if (selectedFactions.includes("All")) {
            if (requirement.faction_type !== "All") {
              continue;
            }
          } else {
            if (requirement.faction_type === "All") {
              continue;
            }

            if (
              !selectedFactions.includes(
                requirement.faction_value
              )
            ) {
              continue;
            }
          }
        }

        return true;
      }
    }

    return false;
  });

  sortGifts(filtered);
  displayedGifts = filtered;
  renderGifts(displayedGifts);
}

function getFactionTranslationKey(requirement) {

  const contextualKey =
    `${requirement.faction_value} ` +
    requirement.faction_type;

  return hasTranslation(contextualKey)
    ? contextualKey
    : requirement.faction_value;
}

function getFactionMetadataText(requirement) {
  return (
    `${translate(requirement.faction_type)}: ` +
    translate(requirement.faction_value)
  );
}

function updateFactionOptions(
  selectedValues = []
) {

  const selectedTribes =
    tribeChoices.getValue(true);

  if (factionChoices) {
    factionChoices.destroy();
  }

  let factionValues = [];
  const factionLabelKeys = {};

  if (selectedTribes.length > 0) {
    gifts.forEach(gift => {
      gift.requirements
        .filter(requirement =>
          requirement.type === "Tribe" &&
          selectedTribes.includes(
            requirement.value
          ) &&
          requirement.faction_type !== "All"
        )
        .forEach(requirement => {
          factionValues.push(
            requirement.faction_value
          );

          factionLabelKeys[
            requirement.faction_value
          ] = getFactionTranslationKey(
            requirement
          );
        });
    });

    factionValues = [
      ...new Set(factionValues)
    ];
  }

  factionValues = [
    "All",
    ...factionValues
  ];

  factionChoices = createLocalizedSelect({
    elementId: "otherSelect",
    values: factionValues,
    placeholder: "Faction",
    selectedValues,
    labelKeys: factionLabelKeys
  });
}

function renderGifts(filteredGifts) {

  const container =
    document.getElementById("giftList");

  container.innerHTML = "";

  filteredGifts.forEach((gift, index) => {
    const requirementsText =
      gift.requirements
        .map(requirement => {
          let text =
            `${translate(requirement.type)}: ` +
            translate(requirement.value);

          if (requirement.faction_type !== "All") {
            text +=
              ` (${getFactionMetadataText(requirement)})`;
          }

          text +=
            ` | ${translate("Rank")} ` +
            requirement.rank;

          return text;
        })
        .join("<br>");

    const card =
      document.createElement("article");

    card.className = "gift-card";

    const descriptionId =
      `gift-description-${index}`;

    const selectId =
      `gift-version-${index}`;

    card.innerHTML = `
      <div class="gift-title">
        ${[...new Set(
          gift.requirements.map(requirement =>
            getLocalizedText(requirement.names)
          )
        )].join(" / ")}
      </div>

      <div class="gift-meta">
        ${requirementsText}
      </div>

      <select id="${selectId}">
        ${gift.versions.map((version, versionIndex) => `
          <option value="${versionIndex}">
            ${version.book}
            ${version.edition
              ? ` (${translate(version.edition)})`
              : ""}
          </option>
        `).join("")}
      </select>

      <div id="${descriptionId}">
        ${renderContent(gift.versions[0])}
      </div>
    `;

    container.appendChild(card);

    document
      .getElementById(selectId)
      .addEventListener("change", event => {
        const version = gift.versions[
          Number(event.target.value)
        ];

        document.getElementById(
          descriptionId
        ).innerHTML = renderContent(version);
      });
  });
}

function getCurrentSelections() {
  return {
    breed: breedChoices.getValue(true),
    auspice: auspiceChoices.getValue(true),
    tribe: tribeChoices.getValue(true),
    faction: factionChoices.getValue(true),
    rank: rankChoices.getValue(true)
  };
}

function rebuildFilterChoices(selections) {

  [
    breedChoices,
    auspiceChoices,
    tribeChoices,
    factionChoices,
    rankChoices
  ].forEach(instance => {
    if (instance) {
      instance.destroy();
    }
  });

  breedChoices = createLocalizedSelect({
    elementId: "breedSelect",
    values: filterValues.breeds,
    placeholder: "Breed",
    selectedValues: selections.breed,
    preferredOrder: BREED_ORDER
  });

  auspiceChoices = createLocalizedSelect({
    elementId: "auspiceSelect",
    values: filterValues.auspices,
    placeholder: "Auspice",
    selectedValues: selections.auspice,
    preferredOrder: AUSPICE_ORDER
  });

  tribeChoices = createLocalizedSelect({
    elementId: "tribeSelect",
    values: filterValues.tribes,
    placeholder: "Tribe",
    selectedValues: selections.tribe
  });

  rankChoices = createLocalizedSelect({
    elementId: "rankSelect",
    values: filterValues.ranks,
    placeholder: "Rank",
    selectedValues: selections.rank
  });

  factionChoices = null;

  updateFactionOptions(
    selections.faction
  );
}

function sortGifts(giftsToSort) {

  return giftsToSort.sort((a, b) => {
    const rankA = Math.min(
      ...a.requirements.map(
        requirement => requirement.rank
      )
    );

    const rankB = Math.min(
      ...b.requirements.map(
        requirement => requirement.rank
      )
    );

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const nameA = [...new Set(
      a.requirements.map(requirement =>
        getLocalizedText(requirement.names)
      )
    )].join(" / ");

    const nameB = [...new Set(
      b.requirements.map(requirement =>
        getLocalizedText(requirement.names)
      )
    )].join(" / ");

    return nameA.localeCompare(
      nameB,
      getLanguage()
    );
  });
}

function saveSettings() {
  saveStoredObject(
    SETTINGS_STORAGE_KEY,
    {
      language: getLanguage(),
      breed: breedChoices.getValue(true),
      auspice: auspiceChoices.getValue(true),
      tribe: tribeChoices.getValue(true),
      faction: factionChoices.getValue(true),
      rank: rankChoices.getValue(true)
    }
  );
}

initializePage();
