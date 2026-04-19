import { escapeHtml } from "./html.js";

function buildTableEmptyRow(columnCount, message) {
  return `<tr><td colspan="${columnCount}" class="table-empty">${escapeHtml(message)}</td></tr>`;
}

export {
  buildTableEmptyRow,
};
