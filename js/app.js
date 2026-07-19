

  let gifts = [];

  let breedChoices;
  let auspiceChoices;
  let tribeChoices;
  let otherChoices;
  let rankChoices;

  let currentLanguage = "en";

  // =========================
  // ŁADOWANIE JSON
  // =========================

async function loadData() {

    try {

        console.log("Loading gifts.json...");

        const response = await fetch("./data/gifts.json");

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );
        }

        gifts = await response.json();

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
                <b>Failed to load gifts.json</b><br><br>

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

  renderGifts(filtered);
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

function renderGifts(filteredGifts) {

  const container =
    document.getElementById("giftList");

  container.innerHTML = "";

  filteredGifts.forEach((gift, index) => {

    const requirementsText =
      gift.requirements.map(r => {

        let text =
          `${r.type}: ${r.value}`;

        if (r.faction_type !== "All") {

          text +=
            ` (${r.faction_type}: ${r.faction_value})`;
        }

        text += ` | Rank ${r.rank}`;

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
			  ? ` (${v.edition})`
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

function updateFactionOptions() {

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

  // jeśli wybrano tribe
  if (selectedTribes.length > 0) {

    factionValues = [...new Set(

      gifts.flatMap(gift =>

        gift.requirements
          .filter(r =>

            r.type === "Tribe" &&
            selectedTribes.includes(r.value) &&
            r.faction_type !== "All"

          )
          .map(r => r.faction_value)

      )

    )];

	} else {

	  // brak tribe = brak faction
	  factionValues = [];
	}

	factionValues = [
	  "All",
	  ...factionValues.sort()
	];

  otherChoices = new Choices(otherSelect, {
    removeItemButton: true,
    searchEnabled: true,
    placeholder: true,
    placeholderValue: "Faction"
  });

  factionValues.forEach(value => {

    otherChoices.setChoices([
      {
        value: value,
        label: value,
        selected: false
      }
    ], "value", "label", false);

  });
}

function initializeApp() {

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

  breedChoices =
    fillSelect("breedSelect", breeds, "Breed");

  auspiceChoices =
    fillSelect("auspiceSelect", auspices, "Auspice");

  tribeChoices =
    fillSelect("tribeSelect", tribes, "Tribe");

  updateFactionOptions();

  rankChoices =
    fillSelect("rankSelect", ranks, "Rank");
	
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

		saveSettings();

		filterGifts();
	  });
	
  sortGifts(garouGifts);

  renderGifts(garouGifts);
  
  loadSettings();

  restoreSelections();
  
}

function fillSelect(
  elementId,
  values,
  placeholder
) {

  const element =
    document.getElementById(elementId);

  const choices =
    new Choices(element, {

      removeItemButton: true,

      searchEnabled: true,

      placeholder: true,

      placeholderValue: placeholder
    });

  choices.setChoices(

    values.map(value => ({
      value: String(value),
      label: String(value),
      selected: false
    })),

    "value",
    "label",
    false
  );

  return choices;
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
          block.headers[currentLanguage] ||
          block.headers.en ||
          [];

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
                  row[currentLanguage] ||
                  row.en ||
                  [];

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
    return;
  }

  const settings =
    JSON.parse(raw);

  currentLanguage =
    settings.language || "en";

  document.getElementById(
    "languageSelect"
  ).value = currentLanguage;
}

function restoreSelections() {

  const raw =
    localStorage.getItem(
      "garou-gifts-settings"
    );

  if (!raw) {
    return;
  }

  const settings =
    JSON.parse(raw);

  breedChoices.setChoiceByValue(
    settings.breed || []
  );

  auspiceChoices.setChoiceByValue(
    settings.auspice || []
  );

  tribeChoices.setChoiceByValue(
    settings.tribe || []
  );

  updateFactionOptions();

  otherChoices.setChoiceByValue(
    settings.faction || []
  );

  rankChoices.setChoiceByValue(
    settings.rank || []
  );

  filterGifts();
}

  // =========================
  // START
  // =========================

  loadData();
