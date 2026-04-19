import { escapeHtml } from "./html.js";

function buildEmptyState(title, body, tone = "neutral") {
  return `
    <article class="empty-state ${tone} tt-soft-panel">
      <strong class="tt-section-title">${escapeHtml(title)}</strong>
      <p class="tt-body-soft">${escapeHtml(body)}</p>
    </article>
  `;
}

export {
  buildEmptyState,
};
