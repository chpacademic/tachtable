const JSON_CONTENT_TYPE = "application/json";

let tokenProvider = async () => "";
let unauthorizedHandler = () => undefined;

export function configureApi(options = {}) {
  tokenProvider = typeof options.getAccessToken === "function" ? options.getAccessToken : async () => "";
  unauthorizedHandler = typeof options.onUnauthorized === "function" ? options.onUnauthorized : () => undefined;
}

async function buildAuthorizedHeaders(headers = {}) {
  const nextHeaders = new Headers(headers);
  const token = await tokenProvider();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

async function parseErrorPayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes(JSON_CONTENT_TYPE)) {
    const payload = await response.json().catch(() => null);
    return payload?.message || "";
  }

  return response.text().catch(() => "");
}

async function request(path, options = {}) {
  const headers = await buildAuthorizedHeaders(options.headers || {});

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
    throw new Error((payload && payload.message) || "กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
  }

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message;
    throw new Error(message || "ไม่สามารถดำเนินการตามคำขอได้");
  }

  return payload;
}

async function requestBlob(path, options = {}) {
  const headers = await buildAuthorizedHeaders(options.headers || {});
  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    unauthorizedHandler();
    const message = await parseErrorPayload(response);
    throw new Error(message || "กรุณาเข้าสู่ระบบก่อนใช้งาน TeachTable");
  }

  if (!response.ok) {
    const message = await parseErrorPayload(response);
    throw new Error(message || "ไม่สามารถส่งออกเอกสารได้");
  }

  return {
    blob: await response.blob(),
    filename: resolveFilename(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type") || "",
  };
}

function resolveFilename(contentDisposition = "") {
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch ? plainMatch[1] : "";
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(","));
      }
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function triggerBlobDownload(blob, filename) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename || "teachtable-export";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

function openPrintFrame(blob, filename = "teachtable-print.pdf") {
  const blobUrl = window.URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.title = filename;
  frame.src = blobUrl;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const cleanup = () => {
    window.setTimeout(() => {
      frame.remove();
      window.URL.revokeObjectURL(blobUrl);
    }, 10000);
  };

  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      const fallback = window.open(blobUrl, "_blank", "noopener");
      fallback?.focus();
    } finally {
      cleanup();
    }
  };
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

export function getActivity() {
  return request("/api/timetables/current/activity");
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

export async function exportCsv(params = {}) {
  const response = await requestBlob(`/api/exports/timetable.csv${buildQuery(params)}`);
  triggerBlobDownload(response.blob, response.filename || "teachtable-export.csv");
}

export async function exportPdf(params = {}) {
  const response = await requestBlob(`/api/exports/timetable.pdf${buildQuery(params)}`);
  triggerBlobDownload(response.blob, response.filename || "teachtable-export.pdf");
}

export async function printTimetable(params = {}) {
  const response = await requestBlob(`/api/exports/timetable.pdf${buildQuery(params)}`);
  openPrintFrame(response.blob, response.filename || "teachtable-print.pdf");
}
