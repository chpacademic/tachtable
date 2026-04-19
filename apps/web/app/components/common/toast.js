import { TOAST_DURATION_MS } from "../../utils/constants.js";

function showToast(root, message, tone = "success", durationMs = TOAST_DURATION_MS) {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  root.appendChild(toast);
  window.setTimeout(() => toast.remove(), durationMs);
}

export {
  showToast,
};
