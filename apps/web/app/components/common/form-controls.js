import { escapeHtml } from "./html.js";

function buildHelpText(text) {
  return `<small class="field-help">${escapeHtml(text)}</small>`;
}

function buildCheckboxGroup(name, items = [], selectedValues = [], options = {}) {
  const {
    valueKey = "value",
    labelKey = "label",
    descriptionKey = "description",
    className = "",
  } = options;
  const selectedSet = new Set(selectedValues || []);

  return `
    <div class="checkbox-group ${className}">
      ${items
        .map((item, index) => {
          const value = String(item[valueKey] ?? "");
          const label = item[labelKey] ?? value;
          const description = item[descriptionKey] ?? "";
          const inputId = `${name}-${index}-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          return `
            <label class="check-tile" for="${escapeHtml(inputId)}">
              <input
                id="${escapeHtml(inputId)}"
                type="checkbox"
                name="${escapeHtml(name)}"
                value="${escapeHtml(value)}"
                ${selectedSet.has(value) ? "checked" : ""}
              />
              <span class="check-tile-copy">
                <strong>${escapeHtml(label)}</strong>
                ${description ? `<small>${escapeHtml(description)}</small>` : ""}
              </span>
            </label>
          `;
        })
        .join("")}
    </div>
  `;
}

export {
  buildCheckboxGroup,
  buildHelpText,
};
