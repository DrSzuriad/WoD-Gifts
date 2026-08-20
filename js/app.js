

  let gifts = [];
  let translations = {};
  let displayedGifts = [];

  let breedChoices;
  let auspiceChoices;
  let tribeChoices;
  let otherChoices;
  let rankChoices;

  let filterValues = {
    breeds: [],
    auspices: [],
    tribes: [],
    ranks: []
  };

  let currentLanguage = "en";
  let preserveGiftOrderOnLanguageChange = false;
  let titleClickCount = 0;
  let lastTitleClickTime = 0;

  const DEVELOPER_TOGGLE_CLICK_COUNT = 5;
  const DEVELOPER_TOGGLE_TIME_LIMIT = 2000;

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

  // =========================
  // ŁADOWANIE JSON
  // =========================

async function loadData() {

    try {

        console.log("Loading data...");

        const [giftsResponse, translationsResponse] =
          await Promise.all([
            fetch("./data/gifts.json"),
            fetch("./data/translations.json")
          ]);

        if (!giftsResponse.ok) {
            throw new Error(
                `gifts.json: HTTP ${giftsResponse.status} ${giftsResponse.statusText}`
            );
        }

        if (!translationsResponse.ok) {
            throw new Error(
                `translations.json: HTTP ${translationsResponse.status} ${translationsResponse.statusText}`
            );
        }

        [gifts, translations] = await Promise.all([
          giftsResponse.json(),
          translationsResponse.json()
        ]);

        console.log(`Loaded ${gifts.length} gifts.`);

        initializeApp();

    } catch (error) {

        console.error("loadData()", error);

        document.getElementById("giftList").innerHTML = `
            <div style="
                color:#ff8080;
                background:#220000;
                padding:20px;
                border-radius:12px;
            ">
                <b>${translate("Failed to load gifts.json")}</b><br><br>

                ${error.message}
            </div>
        `;
    }
}

  // =========================
  // INIT
  // =========================

function filterGifts() {

  const selectedBreeds =
    breedChoices.getValue(true);

  const selectedAuspices =
    auspiceChoices.getValue(true);

  const selectedTribes =
    tribeChoices.getValue(true);

  const selectedOthers =
    otherChoices.getValue(true);

  const selectedRanks =
    rankChoices.getValue(true);

  // aktywne typy filtrów
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

    // =========================
    // BRAK FILTRÓW TYPU
    // =========================

    if (activeTypes.length === 0) {

      // jeśli jest rank
      if (selectedRanks.length > 0) {

        return gift.requirements.some(r =>

          selectedRanks.includes(
            String(r.rank)
          )
        );
      }

      // brak filtrów = pokaż wszystko
      return true;
    }

    for (const r of gift.requirements) {

      // =========================
      // RANK (zawsze działa)
      // =========================

      if (
        selectedRanks.length > 0 &&
        !selectedRanks.includes(
          String(r.rank)
        )
      ) {
        continue;
      }

      // =========================
      // ignoruj nieaktywne typy
      // =========================

      if (
        activeTypes.length > 0 &&
        !activeTypes.includes(r.type)
      ) {
        continue;
      }

      // =========================
      // BREED
      // =========================

      if (
        r.type === "Breed" &&
        selectedBreeds.includes(r.value)
      ) {
        return true;
      }

      // =========================
      // AUSPICE
      // =========================

      if (
        r.type === "Auspice" &&
        selectedAuspices.includes(r.value)
      ) {
        return true;
      }

      // =========================
      // TRIBE
      // =========================

      if (
        r.type === "Tribe" &&
        selectedTribes.includes(r.value)
      ) {

        // faction filtering

        if (selectedOthers.length > 0) {

          // ONLY ALL

          if (
            selectedOthers.includes("All")
          ) {

            if (
              r.faction_type !== "All"
            ) {
              continue;
            }

          } else {

            // konkretne faction

            if (
              r.faction_type === "All"
            ) {
              continue;
            }

            if (
              !selectedOthers.includes(
                r.faction_value
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

  // SORT
  sortGifts(filtered);

  displayedGifts = filtered;

  renderGifts(displayedGifts);
}

  // =========================
  // RENDER
  // =========================


function getLocalizedText(obj) {

  if (!obj) {
    return "";
  }

  return (
    obj[currentLanguage] ||
    obj.en ||
    ""
  );
}

function translate(value) {

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

function getFactionTranslationKey(requirement) {

  const contextualKey =
    `${requirement.faction_value} ${requirement.faction_type}`;

  return translations[contextualKey]
    ? contextualKey
    : requirement.faction_value;
}

function getFactionMetadataText(requirement) {

  return (
    `${translate(requirement.faction_type)}: ` +
    translate(requirement.faction_value)
  );
}

function updateInterfaceLanguage() {

  document.documentElement.lang =
    currentLanguage;

  document
    .querySelectorAll("[data-i18n]")
    .forEach(element => {

      element.textContent =
        translate(element.dataset.i18n);
    });
}

function initializeDeveloperModeToggle() {

  document
    .getElementById("appTitle")
    .addEventListener("click", () => {

      const currentTime = Date.now();

      if (
        currentTime - lastTitleClickTime >
        DEVELOPER_TOGGLE_TIME_LIMIT
      ) {
        titleClickCount = 0;
      }

      titleClickCount += 1;
      lastTitleClickTime = currentTime;

      if (
        titleClickCount <
        DEVELOPER_TOGGLE_CLICK_COUNT
      ) {
        return;
      }

      preserveGiftOrderOnLanguageChange =
        !preserveGiftOrderOnLanguageChange;

      titleClickCount = 0;
      lastTitleClickTime = 0;

      window.alert(
        preserveGiftOrderOnLanguageChange
          ? "DEV MODE ON"
          : "DEV MODE OFF"
      );

      console.info(
        "Developer mode: gift order on language change " +
        (preserveGiftOrderOnLanguageChange
          ? "preserved."
          : "sorted normally.")
      );
    });
}

function getLocalizedArray(obj) {

  if (!obj) {
    return [];
  }

  const localized = Array.isArray(obj[currentLanguage])
    ? obj[currentLanguage]
    : [];

  const english = Array.isArray(obj.en)
    ? obj.en
    : [];

  const length = Math.max(
    localized.length,
    english.length
  );

  return Array.from({ length }, (_, index) => {

    const value = localized[index];

    return String(value ?? "").trim() !== ""
      ? value
      : (english[index] ?? "");
  });
}

function renderGifts(filteredGifts) {

  const container =
    document.getElementById("giftList");

  container.innerHTML = "";

  filteredGifts.forEach((gift, index) => {

    const requirementsText =
      gift.requirements.map(r => {

        let text =
          `${translate(r.type)}: ${translate(r.value)}`;

        if (r.faction_type !== "All") {

          text +=
            ` (${getFactionMetadataText(r)})`;
        }

        text += ` | ${translate("Rank")} ${r.rank}`;

        return text;

      }).join("<br>");

    const card =
      document.createElement("div");

    card.className = "gift-card";

    // unique ids
    const titleId =
      `gift-title-${index}`;

    const metaId =
      `gift-meta-${index}`;

    const descId =
      `gift-desc-${index}`;

    const selectId =
      `gift-version-${index}`;

	card.innerHTML = `

	  <div class="gift-title"
		   id="${titleId}">
		${[...new Set(

		  gift.requirements
			.map(r => getLocalizedText(r.names))

		)].join(" / ")}
	  </div>

	  <div class="gift-meta">
		${requirementsText}
	  </div>

	  <select id="${selectId}">
		${gift.versions.map((v, i) => `

		  <option value="${i}">
			${v.book}
			${v.edition
			  ? ` (${translate(v.edition)})`
			  : ""}
		  </option>

		`).join("")}
	  </select>

	  <div id="${descId}">
		${renderContent(gift.versions[0])}
	  </div>

	`;

	container.appendChild(card);

    // =========================
    // VERSION SWITCHING
    // =========================

    const select =
      document.getElementById(selectId);

    select.addEventListener("change", e => {

      const versionIndex =
        Number(e.target.value);

      const version =
        gift.versions[versionIndex];


	document.getElementById(descId)
	  .innerHTML =
		renderContent(version);
    });
  });
}

function updateFactionOptions(
  selectedValues = []
) {

  const selectedTribes =
    tribeChoices.getValue(true);

  const otherSelect =
    document.getElementById("otherSelect");

  // czyścimy select
  if (otherChoices) {
    otherChoices.destroy();
  }

  otherSelect.innerHTML = "";

  let factionValues = [];
  const factionLabelKeys = {};

  // jeśli wybrano tribe
  if (selectedTribes.length > 0) {

    gifts.forEach(gift => {

      gift.requirements
        .filter(r =>

          r.type === "Tribe" &&
          selectedTribes.includes(r.value) &&
          r.faction_type !== "All"

        )
        .forEach(r => {

          factionValues.push(
            r.faction_value
          );

          factionLabelKeys[r.faction_value] =
            getFactionTranslationKey(r);
        });
    });

    factionValues = [
      ...new Set(factionValues)
    ];

	} else {

	  // brak tribe = brak faction
	  factionValues = [];
	}

	factionValues = [
	  "All",
	  ...factionValues
	];

  otherChoices = fillSelect(
    "otherSelect",
    factionValues,
    "Faction",
    selectedValues,
    factionLabelKeys
  );
}

function initializeApp() {

  const settings = loadSettings();

  updateInterfaceLanguage();
  initializeDeveloperModeToggle();

  const garouGifts = gifts.filter(gift =>
    gift.requirements.some(r =>
      r.race === "Garou"
    )
  );

  // BREEDS
  const breeds = [...new Set(

    garouGifts.flatMap(gift =>

      gift.requirements
        .filter(r => r.type === "Breed")
        .map(r => r.value)

    )

  )].sort();

  // AUSPICES
  const auspices = [...new Set(

    garouGifts.flatMap(gift =>

      gift.requirements
        .filter(r => r.type === "Auspice")
        .map(r => r.value)

    )

  )].sort();

  // TRIBES
  const tribes = [...new Set(

    garouGifts.flatMap(gift =>

      gift.requirements
        .filter(r => r.type === "Tribe")
        .map(r => r.value)

    )

  )].sort();

  const ranks = [1,2,3,4,5,6];

  filterValues = {
    breeds,
    auspices,
    tribes,
    ranks
  };

  breedChoices =
    fillSelect(
      "breedSelect",
      breeds,
      "Breed",
      settings.breed,
      {},
      BREED_ORDER
    );

  auspiceChoices =
    fillSelect(
      "auspiceSelect",
      auspices,
      "Auspice",
      settings.auspice,
      {},
      AUSPICE_ORDER
    );

  tribeChoices =
    fillSelect(
      "tribeSelect",
      tribes,
      "Tribe",
      settings.tribe
    );

  updateFactionOptions(settings.faction);

  rankChoices =
    fillSelect(
      "rankSelect",
      ranks,
      "Rank",
      settings.rank
    );
	
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

	document
	  .getElementById("languageSelect")
	  .addEventListener("change", e => {

		currentLanguage = e.target.value;

		const selections =
		  getCurrentSelections();

		updateInterfaceLanguage();

		rebuildFilterChoices(selections);

		saveSettings();

		if (preserveGiftOrderOnLanguageChange) {
		  renderGifts(displayedGifts);
		} else {
		  filterGifts();
		}
	  });

  filterGifts();
}

function fillSelect(
  elementId,
  values,
  placeholder,
  selectedValues = [],
  labelKeys = {},
  preferredOrder = []
) {

  const element =
    document.getElementById(elementId);

  element.innerHTML = "";

  const selected = new Set(
    selectedValues.map(String)
  );

  const getLabel = value =>
    translate(labelKeys[value] || value);

  const sortedValues = [...values].sort(
    (a, b) => {

      const orderA =
        preferredOrder.indexOf(a);

      const orderB =
        preferredOrder.indexOf(b);

      if (orderA !== -1 || orderB !== -1) {
        return (
          (orderA === -1 ? Infinity : orderA) -
          (orderB === -1 ? Infinity : orderB)
        );
      }

      if (a === "All") {
        return -1;
      }

      if (b === "All") {
        return 1;
      }

      return getLabel(a).localeCompare(
        getLabel(b),
        currentLanguage
      );
    }
  );

  const choices =
    new Choices(element, {

      removeItemButton: true,

      searchEnabled: true,

      placeholder: true,

      placeholderValue: translate(placeholder),

      noResultsText: translate("No results found"),

      noChoicesText: translate("No choices to choose from"),

      itemSelectText: translate("Press to select"),

      uniqueItemText: translate(
        "Only unique values can be added"
      ),

      shouldSort: false
    });

  choices.setChoices(

    sortedValues.map(value => ({
      value: String(value),
      label: getLabel(value),
      selected: selected.has(String(value))
    })),

    "value",
    "label",
    false
  );

  return choices;
}

function getCurrentSelections() {

  return {
    breed: breedChoices.getValue(true),
    auspice: auspiceChoices.getValue(true),
    tribe: tribeChoices.getValue(true),
    faction: otherChoices.getValue(true),
    rank: rankChoices.getValue(true)
  };
}

function rebuildFilterChoices(selections) {

  const instances = [
    breedChoices,
    auspiceChoices,
    tribeChoices,
    otherChoices,
    rankChoices
  ];

  instances.forEach(instance => {
    if (instance) {
      instance.destroy();
    }
  });

  breedChoices = fillSelect(
    "breedSelect",
    filterValues.breeds,
    "Breed",
    selections.breed,
    {},
    BREED_ORDER
  );

  auspiceChoices = fillSelect(
    "auspiceSelect",
    filterValues.auspices,
    "Auspice",
    selections.auspice,
    {},
    AUSPICE_ORDER
  );

  tribeChoices = fillSelect(
    "tribeSelect",
    filterValues.tribes,
    "Tribe",
    selections.tribe
  );

  rankChoices = fillSelect(
    "rankSelect",
    filterValues.ranks,
    "Rank",
    selections.rank
  );

  otherChoices = null;

  updateFactionOptions(
    selections.faction
  );
}

function sortGifts(giftsArray) {

  return giftsArray.sort((a, b) => {

    const rankA =
      Math.min(
        ...a.requirements.map(r => r.rank)
      );

    const rankB =
      Math.min(
        ...b.requirements.map(r => r.rank)
      );

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const nameA =
      [...new Set(

        a.requirements
          .map(r => getLocalizedText(r.names))

      )].join(" / ");

    const nameB =
      [...new Set(

        b.requirements
          .map(r => getLocalizedText(r.names))

      )].join(" / ");

    return nameA.localeCompare(
      nameB,
      currentLanguage
    );
  });
}

function renderContent(version) {

  console.log(version);

    if (!Array.isArray(version.content)) {

        console.error("Invalid version:", version);

        throw new Error(
            `"${version.book}" has invalid content. Expected an array, got ${typeof version.content}.`
        );
    }


  let html = "";

  for (const block of version.content) {
	
	switch (block.type) {
	  case "text":

        html += `
          <div class="gift-description">
            ${getLocalizedText(block)}
          </div>
        `;
		break;

    case "table":

        const headers =
          getLocalizedArray(block.headers);

        html += `
          <table class="gift-table">
  
            <thead>
              <tr>
                ${headers
                  .map(h => `<th>${h}</th>`)
                  .join("")}
              </tr>
            </thead>
  
            <tbody>

              ${block.rows.map(row => {

                const cells =
                  getLocalizedArray(row);

                return `
                  <tr>
                    ${cells
                      .map(cell => `<td>${cell}</td>`)
                      .join("")}
                  </tr>
                `;
              }).join("")}

            </tbody>

          </table>
        `;
		break;
    }
  }

  return html;
}

function saveSettings() {

  const settings = {

    language:
      currentLanguage,

    breed:
      breedChoices.getValue(true),

    auspice:
      auspiceChoices.getValue(true),

    tribe:
      tribeChoices.getValue(true),

    faction:
      otherChoices.getValue(true),

    rank:
      rankChoices.getValue(true)
  };

  localStorage.setItem(
    "garou-gifts-settings",
    JSON.stringify(settings)
  );
}

function loadSettings() {

  const raw =
    localStorage.getItem(
      "garou-gifts-settings"
    );

  if (!raw) {
    return {};
  }

  let settings = {};

  try {
    settings = JSON.parse(raw);
  } catch (error) {
    console.warn(
      "Invalid saved settings.",
      error
    );
  }

  currentLanguage =
    ["en", "pl"].includes(settings.language)
      ? settings.language
      : "en";

  document.getElementById(
    "languageSelect"
  ).value = currentLanguage;

  return {
    breed: settings.breed || [],
    auspice: settings.auspice || [],
    tribe: settings.tribe || [],
    faction: settings.faction || [],
    rank: settings.rank || []
  };
}

  // =========================
  // START
  // =========================

  loadData();
