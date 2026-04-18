import {
  applyMutation,
  autoSchedule,
  claimLock,
  configureApi,
  deleteResource,
  exportCsv,
  exportPdf,
  getBootstrap,
  getSuggestions,
  heartbeat,
  joinCollaboration,
  releaseLock,
  saveResource,
  saveSettings,
  validateTimetable,
} from "./api.js";
import {
  getAuthSetupStatus,
  getCurrentIdToken,
  initializeFirebaseAuth,
  observeAuthState,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
} from "./auth.js";
import {
  DAY_COLUMNS,
  SCREEN_META,
  buildAssignmentRowHtml,
  buildModalForm,
  formatDeliveryMode,
  formatSectionLabel,
  formatTeachingRole,
  renderActivity,
  renderAlertFeed,
  renderBoardGrid,
  renderBoardHead,
  renderCatalogBody,
  renderCatalogHead,
  renderCatalogOptions,
  renderGroupPool,
  renderLocks,
  renderMetrics,
  renderNav,
  renderPresence,
  renderScopeSelect,
  renderSectionStatuses,
  renderSettingsForm,
  renderStatusList,
  renderSuggestions,
  renderTeacherLoads,
  renderValidation,
  renderViewSwitch,
  renderWorkspaceState,
} from "./render.js";

const DEFAULT_SCREEN = "dashboard";
const SCREEN_IDS = new Set(Object.keys(SCREEN_META));
const HEARTBEAT_INTERVAL_MS = 30000;

const state = {
  screen: resolveScreenFromHash(),
  catalogType: "teachers",
  catalogSearch: "",
  view: "section",
  scopeId: "",
  selectedGroupId: "",
  suggestions: [],
  dragPayload: null,
  data: null,
  dataState: "idle",
  dataError: "",
  lastSyncedAt: "",
  modal: {
    open: false,
    resource: "teachers",
    recordId: "",
  },
  auth: {
    status: "loading",
    user: null,
    error: "",
    config: getAuthSetupStatus(),
  },
  userProfile: {
    userId: "",
    displayName: "",
  },
  busy: new Set(),
};

let authUnsubscribe = () => undefined;
let heartbeatTimer = null;
let unauthorizedHandled = false;

const dom = {
  bootScreen: document.getElementById("boot-screen"),
  bootStatus: document.getElementById("boot-status"),
  authScreen: document.getElementById("auth-screen"),
  authStatusChip: document.getElementById("auth-status-chip"),
  authErrorMessage: document.getElementById("auth-error-message"),
  googleSigninButton: document.getElementById("google-signin-button"),
  emailLoginForm: document.getElementById("email-login-form"),
  authEmailInput: document.getElementById("auth-email-input"),
  authPasswordInput: document.getElementById("auth-password-input"),
  emailLoginButton: document.getElementById("email-login-button"),
  appShell: document.getElementById("app-shell"),
  nav: document.getElementById("nav"),
  systemStatus: document.getElementById("system-status"),
  displayNameInput: document.getElementById("display-name-input"),
  saveProfileButton: document.getElementById("save-profile-button"),
  signoutButton: document.getElementById("signout-button"),
  userAvatar: document.getElementById("user-avatar"),
  userName: document.getElementById("user-name"),
  userEmail: document.getElementById("user-email"),
  accountStatus: document.getElementById("account-status"),
  schoolCaption: document.getElementById("school-caption"),
  pageTitle: document.getElementById("page-title"),
  pageDescription: document.getElementById("page-description"),
  livePill: document.getElementById("live-pill"),
  syncNote: document.getElementById("sync-note"),
  refreshButton: document.getElementById("refresh-button"),
  workspaceState: document.getElementById("workspace-state"),
  metricsGrid: document.getElementById("metrics-grid"),
  sectionStatuses: document.getElementById("section-statuses"),
  alertFeed: document.getElementById("alert-feed"),
  teacherLoads: document.getElementById("teacher-loads"),
  catalogType: document.getElementById("catalog-type"),
  catalogSearch: document.getElementById("catalog-search"),
  addRecordButton: document.getElementById("add-record-button"),
  catalogSummary: document.getElementById("catalog-summary"),
  catalogHead: document.getElementById("catalog-head"),
  catalogBody: document.getElementById("catalog-body"),
  viewSwitch: document.getElementById("view-switch"),
  scopeSelect: document.getElementById("scope-select"),
  validateButton: document.getElementById("validate-button"),
  exportCsvButton: document.getElementById("export-csv-button"),
  exportPdfButton: document.getElementById("export-pdf-button"),
  autoScheduleButton: document.getElementById("auto-schedule-button"),
  heroAutoButton: document.getElementById("hero-auto-button"),
  groupPool: document.getElementById("group-pool"),
  boardHead: document.getElementById("board-head"),
  boardGrid: document.getElementById("board-grid"),
  suggestionList: document.getElementById("suggestion-list"),
  presenceList: document.getElementById("presence-list"),
  lockList: document.getElementById("lock-list"),
  activityList: document.getElementById("activity-list"),
  validationList: document.getElementById("validation-list"),
  settingsForm: document.getElementById("settings-form"),
  saveSettingsButton: document.getElementById("save-settings-button"),
  modal: document.getElementById("modal"),
  modalCaption: document.getElementById("modal-caption"),
  modalTitle: document.getElementById("modal-title"),
  modalCloseButton: document.getElementById("modal-close-button"),
  modalForm: document.getElementById("modal-form"),
  toastStack: document.getElementById("toast-stack"),
};

configureApi({
  getAccessToken: () => getCurrentIdToken(false),
  onUnauthorized: handleUnauthorized,
});

function resolveScreenFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  return SCREEN_IDS.has(raw) ? raw : DEFAULT_SCREEN;
}

function setScreen(screen) {
  const nextScreen = SCREEN_IDS.has(screen) ? screen : DEFAULT_SCREEN;
  state.screen = nextScreen;
  const nextHash = `#/${nextScreen}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }
  render();
}

function getDisplayNameStorageKey(uid) {
  return `teachtable-display-name:${uid}`;
}

function hydrateUserProfile(user) {
  const storedName = localStorage.getItem(getDisplayNameStorageKey(user.uid));
  const fallbackName = user.displayName || user.email?.split("@")[0] || "ผู้ใช้ TeachTable";
  state.userProfile = {
    userId: user.uid,
    displayName: storedName || fallbackName,
  };
  dom.displayNameInput.value = state.userProfile.displayName;
}

function getInitials(value) {
  const source = String(value || "TT").trim();
  if (!source) {
    return "TT";
  }
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]).join("").toUpperCase();
}

function setAuthError(message = "") {
  state.auth.error = message;
  dom.authErrorMessage.textContent = message;
  dom.authErrorMessage.classList.toggle("hidden", !message);
}

function clearAuthError() {
  setAuthError("");
}

function formatTimeLabel(value) {
  return new Date(value).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSyncTime(value) {
  if (!value) {
    return "รอการซิงก์ครั้งแรก";
  }
  return `ซิงก์ล่าสุด ${formatTimeLabel(value)}`;
}

function humanizeProvider(provider) {
  if (!provider) {
    return "เข้าสู่ระบบแล้ว";
  }
  if (provider === "google.com") {
    return "เข้าสู่ระบบด้วย Google";
  }
  if (provider === "password") {
    return "เข้าสู่ระบบด้วยอีเมล";
  }
  return `เข้าสู่ระบบผ่าน ${provider}`;
}

function currentViewLabel() {
  return state.view === "teacher" ? "มุมมองครู" : "มุมมองห้องเรียน";
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  dom.toastStack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function isBusy(key) {
  return state.busy.has(key);
}

function toggleBusy(key, enabled) {
  if (enabled) {
    state.busy.add(key);
  } else {
    state.busy.delete(key);
  }
  renderBusyState();
}

async function runAction(key, action, options = {}) {
  if (isBusy(key)) {
    return null;
  }

  toggleBusy(key, true);
  try {
    const result = await action();
    if (options.successMessage) {
      showToast(options.successMessage);
    }
    return result;
  } catch (error) {
    console.error(error);
    if (typeof options.onError === "function") {
      options.onError(error);
    }
    showToast(options.errorMessage || error.message || "เกิดข้อผิดพลาดบางอย่าง", "error");
    return null;
  } finally {
    toggleBusy(key, false);
  }
}

function setButtonBusy(button, busy, idleLabel, busyLabel) {
  if (!button) {
    return;
  }
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

function renderBusyState() {
  setButtonBusy(dom.googleSigninButton, isBusy("auth-google"), "เข้าสู่ระบบด้วย Google", "กำลังเปิด Google...");
  setButtonBusy(dom.emailLoginButton, isBusy("auth-email"), "เข้าสู่ระบบด้วยอีเมล", "กำลังเข้าสู่ระบบ...");
  setButtonBusy(dom.saveProfileButton, isBusy("save-profile"), "บันทึกชื่อ", "กำลังบันทึก...");
  setButtonBusy(dom.signoutButton, isBusy("sign-out"), "ออกจากระบบ", "กำลังออกจากระบบ...");
  setButtonBusy(dom.refreshButton, isBusy("refresh"), "รีเฟรชข้อมูล", "กำลังรีเฟรช...");
  setButtonBusy(dom.addRecordButton, false, "เพิ่มรายการ", "เพิ่มรายการ");
  setButtonBusy(dom.validateButton, isBusy("validate"), "ตรวจสอบ", "กำลังตรวจสอบ...");
  setButtonBusy(dom.autoScheduleButton, isBusy("auto-schedule"), "จัดวางอัตโนมัติ", "กำลังจัดตาราง...");
  setButtonBusy(dom.heroAutoButton, isBusy("auto-schedule"), "จัดตารางอัตโนมัติ", "กำลังจัดตาราง...");
  setButtonBusy(dom.saveSettingsButton, isBusy("save-settings"), "บันทึกการตั้งค่า", "กำลังบันทึก...");

  if (!state.auth.config.ready) {
    dom.googleSigninButton.disabled = true;
    dom.emailLoginButton.disabled = true;
  }

  const modalSubmit = dom.modalForm.querySelector('button[type="submit"]');
  if (modalSubmit) {
    const idleLabel = modalSubmit.dataset.idleLabel || modalSubmit.textContent;
    modalSubmit.dataset.idleLabel = idleLabel;
    modalSubmit.disabled = isBusy("modal-submit");
    modalSubmit.textContent = isBusy("modal-submit") ? "กำลังบันทึก..." : idleLabel;
  }
}

function handleUnauthorized() {
  if (unauthorizedHandled || state.auth.status !== "signed_in") {
    return;
  }
  unauthorizedHandled = true;
  showToast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง", "error");
  signOutUser()
    .catch(() => undefined)
    .finally(() => {
      unauthorizedHandled = false;
    });
}

function getLookup() {
  const data = state.data;
  return {
    teachers: data.teachers,
    rooms: data.rooms,
    subjects: data.subjects,
    sections: data.sections,
    enrollments: data.enrollments,
    instructionalGroups: data.instructionalGroups,
    teacherMap: new Map(data.teachers.map((item) => [item.id, item])),
    roomMap: new Map(data.rooms.map((item) => [item.id, item])),
    subjectMap: new Map(data.subjects.map((item) => [item.id, item])),
    sectionMap: new Map(data.sections.map((item) => [item.id, item])),
    enrollmentMap: new Map(data.enrollments.map((item) => [item.id, item])),
    groupMap: new Map(data.instructionalGroups.map((item) => [item.id, item])),
  };
}

function currentScopeLabel() {
  if (!state.data) {
    return "-";
  }
  const lookup = getLookup();
  if (state.view === "teacher") {
    return lookup.teacherMap.get(state.scopeId)?.fullName || "-";
  }
  return formatSectionLabel(lookup.sectionMap.get(state.scopeId));
}

function ensureScope() {
  if (!state.data) {
    return;
  }
  const source = state.view === "teacher" ? state.data.teachers : state.data.sections;
  if (!source.some((item) => item.id === state.scopeId)) {
    state.scopeId = source[0]?.id || "";
  }
}

function decorateEntry(entry) {
  const lookup = getLookup();
  const subject = lookup.subjectMap.get(entry.subjectId);
  const room = lookup.roomMap.get(entry.roomId);
  const group = lookup.groupMap.get(entry.instructionalGroupId);
  const section = lookup.sectionMap.get(entry.sectionId);

  return {
    ...entry,
    subjectName: subject?.name || entry.subjectId,
    groupName: group?.displayName || entry.studentGroupKey,
    roomName: room?.name || entry.roomId,
    teacherLabels: entry.teachers.map((assignment) => {
      const teacher = lookup.teacherMap.get(assignment.teacherId);
      return `${teacher?.fullName || assignment.teacherId} (${formatTeachingRole(assignment.teachingRole)})`;
    }),
    sectionName: formatSectionLabel(section),
    deliveryModeLabel: group?.deliveryMode ? formatDeliveryMode(group.deliveryMode) : formatDeliveryMode(entry.deliveryMode),
    colorTone: hashColor(entry.subjectId),
  };
}

function hashColor(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  const palette = ["#187498", "#36AE7C", "#E36488", "#79B8D1", "#EB5353", "#F9D923", "#125C79"];
  return palette[Math.abs(hash) % palette.length];
}

function buildCurrentMatrix() {
  const entries = state.data.timetable.entries
    .filter((entry) =>
      state.view === "teacher"
        ? entry.teachers.some((teacher) => teacher.teacherId === state.scopeId)
        : entry.sectionId === state.scopeId,
    )
    .map(decorateEntry);

  const matrix = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => []));
  for (const entry of entries) {
    const dayIndex = DAY_COLUMNS.findIndex((item) => item.value === entry.day);
    if (dayIndex >= 0) {
      matrix[entry.period - 1][dayIndex].push(entry);
    }
  }
  return matrix;
}

function unresolvedForCurrentScope() {
  const lookup = getLookup();
  if (state.view === "teacher") {
    return state.data.unresolvedGroups.filter((item) => {
      const group = lookup.groupMap.get(item.groupId);
      return group?.teachers.some((assignment) => assignment.teacherId === state.scopeId);
    });
  }

  return state.data.unresolvedGroups.filter((item) => {
    const enrollment = lookup.enrollmentMap.get(item.enrollmentId);
    return enrollment?.sectionId === state.scopeId;
  });
}

function renderAppVisibility() {
  dom.bootScreen.classList.toggle("hidden", state.auth.status !== "loading");
  dom.authScreen.classList.toggle("hidden", state.auth.status !== "signed_out");
  dom.appShell.classList.toggle("hidden", state.auth.status !== "signed_in");
}

function renderAuthState() {
  if (!state.auth.config.ready) {
    dom.authStatusChip.textContent = "ต้องตั้งค่า Firebase";
    setAuthError(`ยังตั้งค่า Firebase ไม่ครบ: ${state.auth.config.missingKeys.join(", ")}`);
    dom.googleSigninButton.disabled = true;
    dom.emailLoginButton.disabled = true;
    return;
  }

  dom.authStatusChip.textContent = "ต้องยืนยันตัวตน";
  dom.googleSigninButton.disabled = false;
  dom.emailLoginButton.disabled = false;
}

function renderWorkspaceHeader() {
  const meta = SCREEN_META[state.screen] || SCREEN_META[DEFAULT_SCREEN];
  const settings = state.data?.settings;
  const provider = state.auth.user?.providerData?.[0]?.providerId || "";
  const collaboratorCount = state.data?.activity?.activeUsers?.length || 0;

  dom.schoolCaption.textContent = settings
    ? `${settings.schoolName} • ภาคเรียน ${settings.term}/${settings.academicYear}`
    : "TeachTable";

  dom.pageTitle.textContent = state.screen === "timetable" && state.data
    ? `${meta.title} • ${currentScopeLabel()}`
    : meta.title;

  dom.pageDescription.textContent = state.screen === "timetable" && state.data
    ? `${meta.description} ตอนนี้คุณกำลังดู${currentViewLabel()} ของ ${currentScopeLabel()}`
    : meta.description;

  dom.userName.textContent = state.userProfile.displayName || "ผู้ใช้ TeachTable";
  dom.userEmail.textContent = state.auth.user?.email || "ผู้ใช้ที่ยืนยันตัวตนแล้ว";
  dom.userAvatar.textContent = getInitials(state.userProfile.displayName || state.auth.user?.email || "TT");
  dom.accountStatus.textContent = humanizeProvider(provider);
  dom.livePill.textContent = collaboratorCount > 0
    ? `ออนไลน์ ${collaboratorCount} คน`
    : "คุณกำลังใช้งานอยู่เพียงคนเดียว";
  dom.syncNote.textContent = formatSyncTime(state.lastSyncedAt);
}

function renderWorkspaceData() {
  if (!state.data) {
    dom.workspaceState.classList.remove("hidden");
    if (state.dataState === "error") {
      renderWorkspaceState(dom.workspaceState, {
        tone: "critical",
        title: "ไม่สามารถโหลดพื้นที่ทำงานได้",
        body: state.dataError || "TeachTable ไม่สามารถโหลดข้อมูลที่ป้องกันไว้สำหรับเซสชันนี้ได้",
      });
    } else {
      renderWorkspaceState(dom.workspaceState, {
        tone: "info",
        title: "กำลังโหลดพื้นที่ทำงานที่ปลอดภัย",
        body: "TeachTable กำลังดึงข้อมูลตารางสอนล่าสุดสำหรับบัญชีที่ยืนยันตัวตนแล้ว",
      });
    }
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.add("hidden"));
    return;
  }

  dom.workspaceState.classList.add("hidden");
  const lookup = getLookup();

  renderNav(dom.nav, state.screen);
  renderStatusList(dom.systemStatus, state.data.validation);
  renderMetrics(dom.metricsGrid, state.data.dashboard);
  renderSectionStatuses(dom.sectionStatuses, state.data.sectionStatuses);
  renderAlertFeed(dom.alertFeed, state.data.dashboard.alerts);
  renderTeacherLoads(dom.teacherLoads, state.data.teacherLoads);

  renderCatalogOptions(dom.catalogType, state.catalogType);
  renderCatalogHead(dom.catalogHead, state.catalogType);
  renderCatalogBody(dom.catalogBody, state.catalogType, state.data[state.catalogType], lookup, state.catalogSearch);
  dom.catalogSummary.textContent = `ทั้งหมด ${state.data[state.catalogType].length} รายการ`;

  renderViewSwitch(dom.viewSwitch, state.view);
  renderScopeSelect(dom.scopeSelect, state, state.data);
  renderBoardHead(dom.boardHead);
  renderBoardGrid(dom.boardGrid, buildCurrentMatrix());
  renderGroupPool(dom.groupPool, unresolvedForCurrentScope(), state.selectedGroupId);
  renderSuggestions(dom.suggestionList, state.suggestions);
  renderPresence(dom.presenceList, state.data.activity);
  renderLocks(dom.lockList, state.data.activity);
  renderActivity(dom.activityList, state.data.activity);
  renderValidation(dom.validationList, state.data.validation);
  renderSettingsForm(dom.settingsForm, state.data.settings);

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("hidden", screen.dataset.screen !== state.screen);
  });
}

function render() {
  renderAppVisibility();

  if (state.auth.status === "loading") {
    dom.bootStatus.textContent = state.auth.error || "กำลังตรวจสอบสิทธิ์การเข้าใช้และโหลดข้อมูลล่าสุดของสถานศึกษา";
    return;
  }

  if (state.auth.status === "signed_out") {
    renderAuthState();
    renderBusyState();
    return;
  }

  renderWorkspaceHeader();
  renderWorkspaceData();
  renderBusyState();
}

async function loadData(options = {}) {
  if (state.auth.status !== "signed_in") {
    return;
  }

  const shouldShowState = !options.background || !state.data;
  if (shouldShowState) {
    state.dataState = "loading";
    render();
  }

  try {
    state.data = await getBootstrap();
    state.dataError = "";
    state.dataState = "ready";
    ensureScope();
    state.lastSyncedAt = new Date().toISOString();
    render();
  } catch (error) {
    state.dataState = "error";
    state.dataError = error.message || "TeachTable ไม่สามารถโหลดข้อมูลล่าสุดได้";
    render();
    throw error;
  }
}

async function syncProfile() {
  if (state.auth.status !== "signed_in" || !state.data) {
    return;
  }

  await joinCollaboration({
    userId: state.userProfile.userId,
    displayName: state.userProfile.displayName,
    currentView: state.view,
    selectedSectionId: state.view === "section" ? state.scopeId : "",
    selectedTeacherId: state.view === "teacher" ? state.scopeId : "",
  });
}

async function refreshDataWithPresence(options = {}) {
  await loadData(options);
  if (state.data) {
    await syncProfile();
  }
}

function currentScopeParams() {
  return {
    view: state.view,
    entityId: state.scopeId,
  };
}

async function claimResourcesForPatch(patch) {
  const requests = [
    { resourceType: "SECTION", resourceId: patch.sectionId },
    { resourceType: "INSTRUCTIONAL_GROUP", resourceId: patch.instructionalGroupId },
    { resourceType: "ROOM", resourceId: patch.roomId },
    ...patch.teachers.map((teacher) => ({ resourceType: "TEACHER", resourceId: teacher.teacherId })),
  ];

  const lockIds = [];
  for (const request of requests) {
    const result = await claimLock({
      ...request,
      userId: state.userProfile.userId,
      displayName: state.userProfile.displayName,
      day: patch.day,
      period: patch.period,
    });
    if (!result.ok) {
      throw new Error(result.reason || "ไม่สามารถสร้าง lock สำหรับการแก้ไขครั้งนี้ได้");
    }
    if (result.lock?.id) {
      lockIds.push(result.lock.id);
    }
  }
  return lockIds;
}

function buildPatchFromGroup(groupId, day, period, existingEntryId = "") {
  const lookup = getLookup();
  const group = lookup.groupMap.get(groupId);
  const enrollment = lookup.enrollmentMap.get(group.enrollmentId);
  const fallbackRoomId = group.preferredRoomId || enrollment.preferredRoomId || state.data.rooms[0]?.id;

  return {
    id: existingEntryId || undefined,
    enrollmentId: group.enrollmentId,
    instructionalGroupId: group.id,
    sectionId: enrollment.sectionId,
    subjectId: enrollment.subjectId,
    deliveryMode: group.deliveryMode,
    studentGroupKey: group.studentGroupKey,
    roomId: fallbackRoomId,
    day,
    period,
    teachers: group.teachers.map((assignment) => ({
      teacherId: assignment.teacherId,
      teachingRole: assignment.teachingRole,
      loadFactor: assignment.loadFactor,
    })),
  };
}

async function commitPatch(patch) {
  const lockIds = await claimResourcesForPatch(patch);
  try {
    const result = await applyMutation({
      actorUserId: state.userProfile.userId,
      actorDisplayName: state.userProfile.displayName,
      baseVersion: state.data.timetable.version,
      expectedLockIds: lockIds,
      patches: [patch],
    });
    if (!result.ok) {
      throw new Error(result.staleReason || "ไม่สามารถบันทึกการเปลี่ยนแปลงตารางสอนได้");
    }
  } finally {
    await Promise.all(lockIds.map((lockId) => releaseLock(lockId).catch(() => undefined)));
  }
}

async function scheduleGroup(groupId, day, period, existingEntryId = "") {
  const patch = buildPatchFromGroup(groupId, day, period, existingEntryId);
  await commitPatch(patch);
  state.selectedGroupId = groupId;
  state.suggestions = await getSuggestions(groupId);
  await refreshDataWithPresence({ background: true });
}

async function deleteEntry(entryId) {
  const entry = state.data.timetable.entries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }
  const patch = { ...entry, remove: true };
  await commitPatch(patch);
  await refreshDataWithPresence({ background: true });
}

function extractSettingsPayload() {
  const formData = new FormData(dom.settingsForm);
  return {
    schoolName: formData.get("schoolName"),
    schoolShortName: formData.get("schoolShortName"),
    academicYear: formData.get("academicYear"),
    term: formData.get("term"),
    logoPath: formData.get("logoPath"),
    signatories: [0, 1, 2].map((index) => ({
      title: formData.get(`signatoryTitle${index}`),
      name: formData.get(`signatoryName${index}`),
    })),
  };
}

function resourceTitle(resource) {
  const labels = {
    teachers: "ครู",
    rooms: "ห้องเรียน",
    subjects: "รายวิชา",
    sections: "ห้องเรียน",
    enrollments: "แผนรายวิชา",
    instructionalGroups: "กลุ่มการสอน",
  };
  return labels[resource] || "รายการ";
}

function openModal(resource, recordId = "") {
  state.modal = { open: true, resource, recordId };
  const lookup = getLookup();
  const record = recordId ? state.data[resource].find((item) => item.id === recordId) : {};
  dom.modalCaption.textContent = resourceTitle(resource);
  dom.modalTitle.textContent = recordId ? `แก้ไข${resourceTitle(resource)}` : `เพิ่ม${resourceTitle(resource)}`;
  dom.modalForm.innerHTML = buildModalForm(resource, record || {}, lookup);
  dom.modal.classList.remove("hidden");

  if (resource === "teachers" && record?.subjectIds?.length) {
    [...dom.modalForm.querySelector('select[name="subjectIds"]').options].forEach((option) => {
      option.selected = record.subjectIds.includes(option.value);
    });
  }

  renderBusyState();
}

function closeModal() {
  state.modal.open = false;
  dom.modal.classList.add("hidden");
  dom.modalForm.innerHTML = "";
}

function collectModalPayload(resource) {
  const formData = new FormData(dom.modalForm);
  if (resource === "teachers") {
    return {
      teacherCode: formData.get("teacherCode"),
      fullName: formData.get("fullName"),
      maxPeriodsPerWeek: Number(formData.get("maxPeriodsPerWeek")),
      roles: String(formData.get("rolesText") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      subjectIds: [...dom.modalForm.querySelector('select[name="subjectIds"]').selectedOptions].map((option) => option.value),
    };
  }

  if (resource === "rooms") {
    return {
      roomCode: formData.get("roomCode"),
      name: formData.get("name"),
      specialType: formData.get("specialType"),
      capacity: Number(formData.get("capacity")),
    };
  }

  if (resource === "subjects") {
    return {
      subjectCode: formData.get("subjectCode"),
      name: formData.get("name"),
      credits: Number(formData.get("credits")),
      weeklyPeriods: Number(formData.get("weeklyPeriods")),
      learningArea: formData.get("learningArea"),
    };
  }

  if (resource === "sections") {
    return {
      educationLevel: formData.get("educationLevel"),
      grade: Number(formData.get("grade")),
      roomName: formData.get("roomName"),
      plannedPeriodsPerWeek: Number(formData.get("plannedPeriodsPerWeek")),
      academicYear: formData.get("academicYear"),
      term: formData.get("term"),
      homeroomTeacherId: formData.get("homeroomTeacherId"),
    };
  }

  if (resource === "enrollments") {
    return {
      sectionId: formData.get("sectionId"),
      subjectId: formData.get("subjectId"),
      leadTeacherId: formData.get("leadTeacherId"),
      requiredPeriodsPerWeek: Number(formData.get("requiredPeriodsPerWeek")),
      preferredRoomId: formData.get("preferredRoomId"),
      notes: formData.get("notes"),
    };
  }

  return {
    enrollmentId: formData.get("enrollmentId"),
    groupCode: formData.get("groupCode"),
    displayName: formData.get("displayName"),
    deliveryMode: formData.get("deliveryMode"),
    studentGroupKey: formData.get("studentGroupKey"),
    requiredPeriodsPerWeek: Number(formData.get("requiredPeriodsPerWeek")),
    preferredRoomId: formData.get("preferredRoomId"),
    teachers: [...dom.modalForm.querySelectorAll(".assignment-row")]
      .map((row) => ({
        teacherId: row.querySelector('[data-assignment-field="teacherId"]').value,
        teachingRole: row.querySelector('[data-assignment-field="teachingRole"]').value,
        loadFactor: Number(row.querySelector('[data-assignment-field="loadFactor"]').value),
      }))
      .filter((item) => item.teacherId),
  };
}

async function onModalSubmit(event) {
  event.preventDefault();
  const payload = collectModalPayload(state.modal.resource);
  const result = await runAction(
    "modal-submit",
    async () => {
      await saveResource(state.modal.resource, payload, state.modal.recordId);
      closeModal();
      await refreshDataWithPresence({ background: true });
    },
    {
      successMessage: `บันทึก${resourceTitle(state.modal.resource)}เรียบร้อยแล้ว`,
    },
  );

  return result;
}

function addAssignmentRow() {
  const grid = dom.modalForm.querySelector("#teacher-assignment-grid");
  if (!grid) {
    return;
  }
  grid.insertAdjacentHTML(
    "beforeend",
    buildAssignmentRowHtml(state.data.teachers, {}, grid.querySelectorAll(".assignment-row").length),
  );
}

function reindexAssignmentRows() {
  dom.modalForm.querySelectorAll(".assignment-row").forEach((row, index) => {
    row.dataset.assignmentIndex = String(index);
    row.querySelector("[data-remove-assignment]").dataset.removeAssignment = String(index);
  });
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(async () => {
    if (state.auth.status !== "signed_in" || !state.data) {
      return;
    }

    try {
      await heartbeat({
        userId: state.userProfile.userId,
        displayName: state.userProfile.displayName,
        currentView: state.view,
        selectedSectionId: state.view === "section" ? state.scopeId : "",
        selectedTeacherId: state.view === "teacher" ? state.scopeId : "",
      });
      await loadData({ background: true });
    } catch (error) {
      console.error(error);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

async function handleAuthChange(user) {
  clearAuthError();
  state.auth.user = user;

  if (!user) {
    stopHeartbeat();
    state.auth.status = "signed_out";
    state.data = null;
    state.dataState = "idle";
    state.dataError = "";
    state.lastSyncedAt = "";
    state.selectedGroupId = "";
    state.suggestions = [];
    render();
    return;
  }

  state.auth.status = "signed_in";
  hydrateUserProfile(user);
  render();
  await refreshDataWithPresence();
  startHeartbeat();
}

function bindEvents() {
  window.addEventListener("hashchange", async () => {
    state.screen = resolveScreenFromHash();
    render();
    if (state.auth.status === "signed_in" && state.data) {
      try {
        await syncProfile();
      } catch (error) {
        console.error(error);
      }
    }
  });

  dom.googleSigninButton.addEventListener("click", () =>
    runAction(
      "auth-google",
      async () => {
        clearAuthError();
        await signInWithGoogle();
      },
      {
        errorMessage: "ไม่สามารถเข้าสู่ระบบด้วย Google ได้",
        onError: (error) => setAuthError(error.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้"),
      },
    ));

  dom.emailLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runAction(
      "auth-email",
      async () => {
        clearAuthError();
        await signInWithEmail(dom.authEmailInput.value.trim(), dom.authPasswordInput.value);
      },
      {
        errorMessage: "ไม่สามารถเข้าสู่ระบบด้วยอีเมลได้",
        onError: (error) => setAuthError(error.message || "ไม่สามารถเข้าสู่ระบบด้วยอีเมลได้"),
      },
    );
  });

  dom.nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-screen]");
    if (button) {
      setScreen(button.dataset.screen);
    }
  });

  dom.saveProfileButton.addEventListener("click", () =>
    runAction(
      "save-profile",
      async () => {
        const nextName = dom.displayNameInput.value.trim() || state.userProfile.displayName;
        state.userProfile.displayName = nextName;
        localStorage.setItem(getDisplayNameStorageKey(state.userProfile.userId), nextName);
        renderWorkspaceHeader();
        await syncProfile();
        await loadData({ background: true });
      },
      {
        successMessage: "อัปเดตชื่อที่แสดงแล้ว",
      },
    ));

  dom.signoutButton.addEventListener("click", () =>
    runAction(
      "sign-out",
      async () => {
        stopHeartbeat();
        await signOutUser();
      },
      {
        successMessage: "ออกจากระบบเรียบร้อยแล้ว",
      },
    ));

  dom.refreshButton.addEventListener("click", () =>
    runAction(
      "refresh",
      async () => {
        await refreshDataWithPresence({ background: true });
      },
      {
        successMessage: "โหลดข้อมูลล่าสุดเรียบร้อยแล้ว",
      },
    ));

  dom.catalogType.addEventListener("change", () => {
    state.catalogType = dom.catalogType.value;
    render();
  });

  dom.catalogSearch.addEventListener("input", () => {
    state.catalogSearch = dom.catalogSearch.value.trim();
    render();
  });

  dom.addRecordButton.addEventListener("click", () => {
    openModal(state.catalogType);
  });

  dom.modalCloseButton.addEventListener("click", closeModal);
  dom.modal.addEventListener("click", (event) => {
    if (event.target === dom.modal) {
      closeModal();
    }
  });

  dom.modalForm.addEventListener("submit", onModalSubmit);
  dom.modalForm.addEventListener("click", (event) => {
    if (event.target.id === "add-assignment-button") {
      addAssignmentRow();
    }

    const removeButton = event.target.closest("[data-remove-assignment]");
    if (removeButton) {
      removeButton.closest(".assignment-row")?.remove();
      reindexAssignmentRows();
    }
  });

  dom.catalogBody.addEventListener("click", async (event) => {
    const editButton = event.target.closest('[data-action="edit"]');
    const deleteButton = event.target.closest('[data-action="delete"]');

    if (editButton) {
      openModal(state.catalogType, editButton.dataset.id);
      return;
    }

    if (deleteButton) {
      const confirmed = window.confirm(`ต้องการลบ${resourceTitle(state.catalogType)}นี้ใช่หรือไม่`);
      if (!confirmed) {
        return;
      }

      await runAction(
        "catalog-delete",
        async () => {
          await deleteResource(state.catalogType, deleteButton.dataset.id);
          await refreshDataWithPresence({ background: true });
        },
        {
          successMessage: `ลบ${resourceTitle(state.catalogType)}เรียบร้อยแล้ว`,
        },
      );
    }
  });

  dom.viewSwitch.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) {
      return;
    }

    state.view = button.dataset.view;
    ensureScope();
    state.selectedGroupId = "";
    state.suggestions = [];
    render();
    await syncProfile().catch((error) => console.error(error));
  });

  dom.scopeSelect.addEventListener("change", async () => {
    state.scopeId = dom.scopeSelect.value;
    state.selectedGroupId = "";
    state.suggestions = [];
    render();
    await syncProfile().catch((error) => console.error(error));
  });

  dom.autoScheduleButton.addEventListener("click", () =>
    runAction(
      "auto-schedule",
      async () => {
        await autoSchedule({
          forceRebuild: false,
          actorUserId: state.userProfile.userId,
          actorDisplayName: state.userProfile.displayName,
        });
        await refreshDataWithPresence({ background: true });
      },
      {
        successMessage: "จัดตารางอัตโนมัติเรียบร้อยแล้ว",
      },
    ));

  dom.heroAutoButton.addEventListener("click", () =>
    runAction(
      "auto-schedule",
      async () => {
        setScreen("timetable");
        await autoSchedule({
          forceRebuild: false,
          actorUserId: state.userProfile.userId,
          actorDisplayName: state.userProfile.displayName,
        });
        await refreshDataWithPresence({ background: true });
      },
      {
        successMessage: "จัดตารางอัตโนมัติเรียบร้อยแล้ว",
      },
    ));

  dom.validateButton.addEventListener("click", () =>
    runAction(
      "validate",
      async () => {
        await validateTimetable();
        await loadData({ background: true });
      },
      {
        successMessage: "ตรวจสอบตารางเรียบร้อยแล้ว",
      },
    ));

  dom.exportCsvButton.addEventListener("click", () => {
    const params = currentScopeParams();
    exportCsv(params.view, params.entityId);
  });

  dom.exportPdfButton.addEventListener("click", () => {
    const params = currentScopeParams();
    exportPdf(params.view, params.entityId);
  });

  dom.groupPool.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-group-id]");
    if (!card) {
      return;
    }
    state.selectedGroupId = card.dataset.groupId;
    state.suggestions = await getSuggestions(state.selectedGroupId);
    render();
  });

  dom.suggestionList.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-suggestion-day]");
    if (!item || !state.selectedGroupId) {
      return;
    }

    await runAction(
      "board-save",
      async () => {
        await scheduleGroup(state.selectedGroupId, item.dataset.suggestionDay, Number(item.dataset.suggestionPeriod));
      },
      {
        successMessage: "ลงคาบให้กลุ่มการสอนเรียบร้อยแล้ว",
      },
    );
  });

  dom.boardGrid.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-entry-delete]");
    if (!deleteButton) {
      return;
    }

    const confirmed = window.confirm("ต้องการนำคาบนี้ออกจากตารางใช่หรือไม่");
    if (!confirmed) {
      return;
    }

    await runAction(
      "board-save",
      async () => {
        await deleteEntry(deleteButton.dataset.entryDelete);
      },
      {
        successMessage: "นำคาบออกจากตารางเรียบร้อยแล้ว",
      },
    );
  });

  dom.boardGrid.addEventListener("dragstart", (event) => {
    const entryCard = event.target.closest("[data-entry-id]");
    if (entryCard) {
      state.dragPayload = { type: "entry", entryId: entryCard.dataset.entryId };
      event.dataTransfer?.setData("text/plain", JSON.stringify(state.dragPayload));
    }
  });

  dom.groupPool.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-group-id]");
    if (card) {
      state.dragPayload = { type: "group", groupId: card.dataset.groupId };
      event.dataTransfer?.setData("text/plain", JSON.stringify(state.dragPayload));
    }
  });

  dom.boardGrid.addEventListener("dragover", (event) => {
    event.preventDefault();
    const cell = event.target.closest(".slot-cell");
    cell?.classList.add("is-drop-target");
  });

  dom.boardGrid.addEventListener("dragleave", (event) => {
    const cell = event.target.closest(".slot-cell");
    cell?.classList.remove("is-drop-target");
  });

  dom.boardGrid.addEventListener("drop", async (event) => {
    event.preventDefault();
    const cell = event.target.closest(".slot-cell");
    if (!cell || !state.dragPayload) {
      return;
    }

    cell.classList.remove("is-drop-target");
    const day = cell.dataset.day;
    const period = Number(cell.dataset.period);

    await runAction(
      "board-save",
      async () => {
        if (state.dragPayload.type === "group") {
          await scheduleGroup(state.dragPayload.groupId, day, period);
        } else if (state.dragPayload.type === "entry") {
          const entry = state.data.timetable.entries.find((item) => item.id === state.dragPayload.entryId);
          if (entry) {
            await scheduleGroup(entry.instructionalGroupId, day, period, entry.id);
          }
        }
        state.dragPayload = null;
      },
      {
        successMessage: "อัปเดตตารางสอนเรียบร้อยแล้ว",
      },
    );
  });

  dom.saveSettingsButton.addEventListener("click", () =>
    runAction(
      "save-settings",
      async () => {
        await saveSettings(extractSettingsPayload());
        await loadData({ background: true });
      },
      {
        successMessage: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
      },
    ));

  document.querySelectorAll("[data-screen-link]").forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.screenLink));
  });
}

async function init() {
  bindEvents();
  render();

  if (!state.auth.config.ready) {
    state.auth.status = "signed_out";
    render();
    return;
  }

  try {
    await initializeFirebaseAuth();
    authUnsubscribe = await observeAuthState(
      (user) => {
        handleAuthChange(user).catch((error) => {
          console.error(error);
          setAuthError(error.message || "ไม่สามารถกู้คืนสถานะการเข้าสู่ระบบได้");
        });
      },
      (error) => {
        console.error(error);
        state.auth.status = "signed_out";
        setAuthError(error.message || "ระบบยืนยันตัวตนไม่พร้อมใช้งานในขณะนี้");
        render();
      },
    );
  } catch (error) {
    console.error(error);
    state.auth.status = "signed_out";
    setAuthError(error.message || "ไม่สามารถเริ่มต้น Firebase Authentication ได้");
    render();
  }
}

window.addEventListener("beforeunload", () => {
  stopHeartbeat();
  authUnsubscribe();
});

init().catch((error) => {
  console.error(error);
  state.auth.status = "signed_out";
  setAuthError(error.message || "TeachTable ไม่สามารถเริ่มต้นระบบได้");
  render();
});
