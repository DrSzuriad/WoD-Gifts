import {
  getLanguage,
  translate
} from "./i18n.js";

export function createLocalizedSelect({
  elementId,
  values,
  placeholder,
  selectedValues = [],
  labelKeys = {},
  preferredOrder = []
}) {

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
        getLanguage()
      );
    }
  );

  const choices = new window.Choices(
    element,
    {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: translate(placeholder),
      noResultsText: translate("No results found"),
      noChoicesText: translate(
        "No choices to choose from"
      ),
      itemSelectText: translate("Press to select"),
      uniqueItemText: translate(
        "Only unique values can be added"
      ),
      shouldSort: false
    }
  );

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
