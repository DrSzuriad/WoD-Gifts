const TOGGLE_CLICK_COUNT = 5;
const TOGGLE_TIME_LIMIT = 2000;

export function initializeDeveloperModeToggle({
  elementId = "appTitle"
} = {}) {

  let enabled = false;
  let clickCount = 0;
  let lastClickTime = 0;

  const element =
    document.getElementById(elementId);

  if (!element) {
    return () => false;
  }

  element.addEventListener("click", () => {
    const currentTime = Date.now();

    if (
      currentTime - lastClickTime >
      TOGGLE_TIME_LIMIT
    ) {
      clickCount = 0;
    }

    clickCount += 1;
    lastClickTime = currentTime;

    if (clickCount < TOGGLE_CLICK_COUNT) {
      return;
    }

    enabled = !enabled;
    clickCount = 0;
    lastClickTime = 0;

    window.alert(
      enabled
        ? "DEV MODE ON"
        : "DEV MODE OFF"
    );

    console.info(
      "Developer mode: gift order on language change " +
      (enabled
        ? "preserved."
        : "sorted normally.")
    );
  });

  return () => enabled;
}
