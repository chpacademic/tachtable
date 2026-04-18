const JSON_CONTENT_TYPE = "application/json";

let tokenProvider = async () => "";
let unauthorizedHandler = () => undefined;

export function configureApi(options = {}) {
  tokenProvider = typeof options.getAccessToken === "function" ? options.getAccessToken : async () => "";
  unauthorizedHandler = typeof options.onUnauthorized === "function" ? options.onUnauthorized : () => undefined;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = await tokenProvider();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", JSON_CONTENT_TYPE);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes(JSON_CONTENT_TYPE)
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (response.status === 401) {
    unauthorizedHandler();
    throw new Error((payload && payload.message) || "Please sign in before continuing.");
  }

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message;
    throw new Error(message || "The request could not be completed.");
  }

  return payload;
}

export function getBootstrap() {
  return request("/api/bootstrap");
}

export function saveResource(resource, payload, id) {
  return request(`/api/${resource}${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteResource(resource, id) {
  return request(`/api/${resource}/${id}`, {
    method: "DELETE",
  });
}

export function validateTimetable() {
  return request("/api/timetables/current/validate", {
    method: "POST",
  });
}

export function autoSchedule(payload) {
  return request("/api/timetables/current/auto-schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveSettings(payload) {
  return request("/api/settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSuggestions(groupId) {
  return request(`/api/instructional-groups/${groupId}/suggestions`);
}

export function joinCollaboration(payload) {
  return request("/api/timetables/current/collaboration/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function heartbeat(payload) {
  return request("/api/timetables/current/collaboration/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function claimLock(payload) {
  return request("/api/timetables/current/collaboration/locks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function releaseLock(lockId) {
  return request(`/api/timetables/current/collaboration/locks/${encodeURIComponent(lockId)}`, {
    method: "DELETE",
  });
}

export function applyMutation(payload) {
  return request("/api/timetables/current/mutations", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function exportCsv(view, entityId) {
  window.open(`/api/exports/timetable.csv?view=${view}&entityId=${entityId}`, "_blank", "noopener");
}

export function exportPdf(view, entityId) {
  window.open(`/api/exports/timetable.pdf?view=${view}&entityId=${entityId}`, "_blank", "noopener");
}
