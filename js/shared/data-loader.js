export async function loadJson(url) {

  const response = await fetch(url);

  if (!response.ok) {
    const fileName =
      url.split("/").pop() || url;

    throw new Error(
      `${fileName}: HTTP ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export function renderLoadError(
  container,
  title,
  error
) {

  container.innerHTML = "";

  const message =
    document.createElement("div");

  message.className = "error-message";

  const heading =
    document.createElement("strong");

  heading.textContent = title;

  const details =
    document.createElement("div");

  details.textContent =
    error instanceof Error
      ? error.message
      : String(error);

  message.append(heading, details);
  container.appendChild(message);
}
