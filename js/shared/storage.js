export function loadStoredObject(
  key,
  fallback = {}
) {

  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    const value = JSON.parse(raw);

    return value && typeof value === "object"
      ? value
      : fallback;
  } catch (error) {
    console.warn(
      `Invalid saved data for "${key}".`,
      error
    );

    return fallback;
  }
}

export function saveStoredObject(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}
