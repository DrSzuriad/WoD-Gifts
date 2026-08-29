import {
  getLocalizedArray,
  getLocalizedText
} from "./i18n.js";

export function renderContent(version) {

  if (!Array.isArray(version.content)) {
    console.error("Invalid version:", version);

    throw new Error(
      `"${version.book}" has invalid content. ` +
      `Expected an array, got ${typeof version.content}.`
    );
  }

  let html = "";

  for (const block of version.content) {
    switch (block.type) {
      case "text":
        html += `
          <div class="content-text">
            ${getLocalizedText(block)}
          </div>
        `;
        break;

      case "table": {
        const headers =
          getLocalizedArray(block.headers);

        html += `
          <table class="content-table">
            <thead>
              <tr>
                ${headers
                  .map(header => `<th>${header}</th>`)
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
  }

  return html;
}
