const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", hint: "System health and progress" },
  { id: "catalog", label: "Master data", hint: "Teachers, rooms, subjects, sections" },
  { id: "timetable", label: "Timetable", hint: "Plan and validate the weekly grid" },
  { id: "settings", label: "Settings", hint: "School profile and PDF sign-off" },
];

const SCREEN_META = {
  dashboard: {
    eyebrow: "School Operations",
    title: "Operations overview",
    description: "Track readiness, coverage, conflicts, and staffing from one clean control room.",
  },
  catalog: {
    eyebrow: "Data Foundation",
    title: "Master data workspace",
    description: "Keep the timetable engine accurate with clean teachers, rooms, subjects, and section data.",
  },
  timetable: {
    eyebrow: "Protected Workspace",
    title: "Timetable planner",
    description: "Assign unresolved instructional groups, review suggestions, and validate the final board.",
  },
  settings: {
    eyebrow: "Document Setup",
    title: "School settings",
    description: "Set the school profile, term information, and PDF signatories used across exports.",
  },
};

const CATALOG_OPTIONS = [
  { value: "teachers", label: "Teachers" },
  { value: "rooms", label: "Rooms" },
  { value: "subjects", label: "Subjects" },
  { value: "sections", label: "Sections" },
  { value: "enrollments", label: "Enrollments" },
  { value: "instructionalGroups", label: "Instructional groups" },
];

const DAY_COLUMNS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSectionLabel(section) {
  if (!section) {
    return "-";
  }
  return `Grade ${section.grade} / Room ${section.roomName}`;
}

function optionTags(items, selectedValue, valueKey = "id", labelKey = "name", allowBlank = true) {
  const options = allowBlank ? [`<option value="">Select an option</option>`] : [];
  for (const item of items) {
    const value = item[valueKey];
    const label = item[labelKey];
    options.push(
      `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`,
    );
  }
  return options.join("");
}

function buildEmptyState(title, body, tone = "neutral") {
  return `
    <article class="empty-state ${tone}">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function buildTableEmptyRow(columnCount, message) {
  return `<tr><td colspan="${columnCount}" class="table-empty">${escapeHtml(message)}</td></tr>`;
}

function renderWorkspaceState(root, options = {}) {
  const {
    tone = "neutral",
    title = "Loading workspace",
    body = "Please wait while TeachTable prepares your data.",
  } = options;

  root.innerHTML = buildEmptyState(title, body, tone);
}

function renderMetrics(metricsRoot, dashboard = {}) {
  const items = [
    {
      label: "Teachers",
      value: dashboard.teachers ?? 0,
      detail: "Active teaching staff in the timetable model",
      tone: "cool",
    },
    {
      label: "Rooms",
      value: dashboard.rooms ?? 0,
      detail: "Classrooms and special rooms available this term",
      tone: "warm",
    },
    {
      label: "Subjects",
      value: dashboard.subjects ?? 0,
      detail: "Subjects currently mapped to sections and teachers",
      tone: "mint",
    },
    {
      label: "Assigned periods",
      value: dashboard.assignedPeriods ?? 0,
      detail: `Out of ${dashboard.requiredPeriods ?? 0} required periods`,
      tone: "rose",
    },
    {
      label: "Completion",
      value: `${dashboard.completionRate ?? 0}%`,
      detail: `${(dashboard.alerts || []).length} active alerts to review`,
      tone: "primary",
    },
  ];

  metricsRoot.innerHTML = items
    .map(
      (item) => `
        <article class="metric-card tone-${item.tone}">
          <p class="metric-label">${escapeHtml(item.label)}</p>
          <p class="metric-value">${escapeHtml(item.value)}</p>
          <p class="metric-detail">${escapeHtml(item.detail)}</p>
        </article>
      `,
    )
    .join("");
}

function renderStatusList(root, validation = {}) {
  const conflicts = validation.conflicts || [];
  const warnings = conflicts.filter((item) => item.severity === "warning").length;
  const errors = conflicts.filter((item) => item.severity === "error").length;
  const readiness = errors > 0 ? "Needs attention" : warnings > 0 ? "Ready with warnings" : "Ready to use";
  const syncTone = errors > 0 ? "error" : warnings > 0 ? "warning" : "success";

  root.innerHTML = `
    <div class="status-row">
      <span class="tone-pill ${syncTone}">${escapeHtml(readiness)}</span>
      <span class="muted-text">${errors} errors, ${warnings} warnings</span>
    </div>
    <div class="status-row">
      <span class="tone-dot ${errors > 0 ? "error" : "success"}"></span>
      <span class="muted-text">Validation feed updates from the latest timetable snapshot.</span>
    </div>
  `;
}

function renderSectionStatuses(root, statuses = []) {
  root.innerHTML = statuses.length
    ? statuses
        .map((item) => {
          const toneClass = item.errorCount > 0 ? "error" : item.warningCount > 0 ? "warning" : "success";
          return `
            <article class="status-card">
              <div class="status-meta">
                <div>
                  <strong>${escapeHtml(item.label)}</strong>
                  <div class="muted-text">${escapeHtml(item.educationLevelLabel)}</div>
                </div>
                <span class="pill">${item.assignedPeriods}/${item.plannedPeriodsPerWeek} periods</span>
              </div>
              <div class="progress-row">
                <div class="progress-track">
                  <div class="progress-fill ${toneClass}" style="width: ${Math.min(item.completionRate || 0, 100)}%"></div>
                </div>
                <span class="tone-pill ${toneClass}">${item.completionRate}%</span>
              </div>
              <p class="muted-text">${item.errorCount} errors · ${item.warningCount} warnings</p>
            </article>
          `;
        })
        .join("")
    : buildEmptyState("No sections yet", "Create sections and enrollments to start measuring timetable coverage.");
}

function renderAlertFeed(root, alerts = []) {
  root.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <article class="stack-item">
              <div class="status-meta">
                <h4>${escapeHtml(alert.code)}</h4>
                <span class="tone-pill ${alert.severity === "error" ? "error" : "warning"}">${escapeHtml(alert.severity)}</span>
              </div>
              <p>${escapeHtml(alert.message)}</p>
            </article>
          `,
        )
        .join("")
    : buildEmptyState("No active alerts", "The current timetable snapshot has no outstanding alert items.");
}

function renderTeacherLoads(root, teacherLoads = []) {
  root.innerHTML = teacherLoads.length
    ? teacherLoads
        .map((teacher) => {
          const max = Math.max(teacher.max || 0, 1);
          const percent = Math.round(((teacher.current || 0) / max) * 100);
          const toneClass = percent >= 95 ? "danger" : percent >= 85 ? "warn" : "safe";
          return `
            <article class="load-row">
              <div class="status-meta">
                <div>
                  <strong>${escapeHtml(teacher.name)}</strong>
                  <div class="muted-text">${escapeHtml((teacher.subjectNames || []).join(", ") || "No subject mapping yet")}</div>
                </div>
                <strong>${teacher.current}/${teacher.max} periods</strong>
              </div>
              <div class="load-bar"><div class="load-fill ${toneClass}" style="width: ${Math.min(percent, 100)}%"></div></div>
            </article>
          `;
        })
        .join("")
    : buildEmptyState("No workload data", "Add teachers and timetable assignments to view staff load distribution.");
}

function catalogColumns(resource) {
  switch (resource) {
    case "teachers":
      return ["Code", "Teacher", "Max load", "Roles", "Subjects", "Actions"];
    case "rooms":
      return ["Code", "Room", "Type", "Capacity", "Actions"];
    case "subjects":
      return ["Code", "Subject", "Credits", "Periods / week", "Learning area", "Actions"];
    case "sections":
      return ["Level", "Section", "Term", "Planned periods", "Homeroom teacher", "Actions"];
    case "enrollments":
      return ["Section", "Subject", "Lead teacher", "Required periods", "Preferred room", "Actions"];
    case "instructionalGroups":
      return ["Group", "Subject", "Section", "Delivery", "Teachers", "Actions"];
    default:
      return [];
  }
}

function renderCatalogHead(root, resource) {
  root.innerHTML = `<tr>${catalogColumns(resource).map((label) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;
}

function matchSearch(record, searchText) {
  if (!searchText) {
    return true;
  }
  return JSON.stringify(record).toLowerCase().includes(searchText.toLowerCase());
}

function actionButtons(id) {
  return `
    <div class="action-row">
      <button class="text-button" data-action="edit" data-id="${escapeHtml(id)}">Edit</button>
      <button class="text-button danger-text" data-action="delete" data-id="${escapeHtml(id)}">Delete</button>
    </div>
  `;
}

function renderCatalogBody(root, resource, data, lookup, searchText) {
  const filtered = (data || []).filter((record) => matchSearch(record, searchText));
  const rows = filtered.map((record) => {
    if (resource === "teachers") {
      return `
        <tr>
          <td>${escapeHtml(record.teacherCode)}</td>
          <td>${escapeHtml(record.fullName)}</td>
          <td>${escapeHtml(record.maxPeriodsPerWeek)}</td>
          <td>${escapeHtml((record.roles || []).join(", ") || "-")}</td>
          <td>${escapeHtml((record.subjectIds || []).map((id) => lookup.subjectMap.get(id)?.name || id).join(", ") || "-")}</td>
          <td>${actionButtons(record.id)}</td>
        </tr>
      `;
    }

    if (resource === "rooms") {
      return `
        <tr>
          <td>${escapeHtml(record.roomCode)}</td>
          <td>${escapeHtml(record.name)}</td>
          <td>${escapeHtml(record.specialType)}</td>
          <td>${escapeHtml(record.capacity)}</td>
          <td>${actionButtons(record.id)}</td>
        </tr>
      `;
    }

    if (resource === "subjects") {
      return `
        <tr>
          <td>${escapeHtml(record.subjectCode)}</td>
          <td>${escapeHtml(record.name)}</td>
          <td>${escapeHtml(record.credits)}</td>
          <td>${escapeHtml(record.weeklyPeriods)}</td>
          <td>${escapeHtml(record.learningArea)}</td>
          <td>${actionButtons(record.id)}</td>
        </tr>
      `;
    }

    if (resource === "sections") {
      return `
        <tr>
          <td>${escapeHtml(record.educationLevel)}</td>
          <td>${escapeHtml(formatSectionLabel(record))}</td>
          <td>${escapeHtml(`${record.term}/${record.academicYear}`)}</td>
          <td>${escapeHtml(record.plannedPeriodsPerWeek)}</td>
          <td>${escapeHtml(lookup.teacherMap.get(record.homeroomTeacherId)?.fullName || "-")}</td>
          <td>${actionButtons(record.id)}</td>
        </tr>
      `;
    }

    if (resource === "enrollments") {
      return `
        <tr>
          <td>${escapeHtml(formatSectionLabel(lookup.sectionMap.get(record.sectionId)))}</td>
          <td>${escapeHtml(lookup.subjectMap.get(record.subjectId)?.name || "-")}</td>
          <td>${escapeHtml(lookup.teacherMap.get(record.leadTeacherId)?.fullName || "-")}</td>
          <td>${escapeHtml(record.requiredPeriodsPerWeek)}</td>
          <td>${escapeHtml(lookup.roomMap.get(record.preferredRoomId)?.name || "-")}</td>
          <td>${actionButtons(record.id)}</td>
        </tr>
      `;
    }

    return `
      <tr>
        <td>${escapeHtml(record.displayName)}</td>
        <td>${escapeHtml(lookup.subjectMap.get(lookup.enrollmentMap.get(record.enrollmentId)?.subjectId)?.name || "-")}</td>
        <td>${escapeHtml(formatSectionLabel(lookup.sectionMap.get(lookup.enrollmentMap.get(record.enrollmentId)?.sectionId)))}</td>
        <td>${escapeHtml(record.deliveryMode)}</td>
        <td>${escapeHtml((record.teachers || []).map((assignment) => lookup.teacherMap.get(assignment.teacherId)?.fullName || assignment.teacherId).join(", ") || "-")}</td>
        <td>${actionButtons(record.id)}</td>
      </tr>
    `;
  });

  root.innerHTML = rows.join("") || buildTableEmptyRow(catalogColumns(resource).length, "No records match the current filter.");
}

function renderViewSwitch(root, activeView) {
  root.innerHTML = `
    <button class="${activeView === "section" ? "is-active" : ""}" data-view="section">Section view</button>
    <button class="${activeView === "teacher" ? "is-active" : ""}" data-view="teacher">Teacher view</button>
  `;
}

function renderScopeSelect(select, state, data) {
  const source = state.view === "teacher"
    ? data.teachers.map((teacher) => ({ id: teacher.id, label: teacher.fullName }))
    : data.sections.map((section) => ({ id: section.id, label: formatSectionLabel(section) }));

  select.innerHTML = source
    .map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === state.scopeId ? "selected" : ""}>${escapeHtml(item.label)}</option>`)
    .join("");
}

function renderBoardHead(root) {
  root.innerHTML = `<div class="board-corner">Period</div>${DAY_COLUMNS.map((day) => `<div>${escapeHtml(day.label)}</div>`).join("")}`;
}

function renderBoardGrid(root, matrix) {
  root.innerHTML = matrix
    .map(
      (periodRow, periodIndex) => `
        <div class="board-row">
          <div class="period-label"><strong>P${periodIndex + 1}</strong><span>${periodIndex + 1}</span></div>
          ${periodRow
            .map(
              (entries, dayIndex) => `
                <div class="slot-cell" data-day="${DAY_COLUMNS[dayIndex].value}" data-period="${periodIndex + 1}">
                  ${entries
                    .map(
                      (entry) => `
                        <article class="entry-card" draggable="true" data-entry-id="${escapeHtml(entry.id)}" style="--entry-color: ${escapeHtml(entry.colorTone)}">
                          <button class="entry-delete" data-entry-delete="${escapeHtml(entry.id)}">Remove</button>
                          <h4>${escapeHtml(entry.subjectName)}</h4>
                          <p>${escapeHtml(entry.groupName)}</p>
                          <p>${escapeHtml(entry.teacherLabels.join(", "))}</p>
                          <div class="entry-meta">
                            <span class="pill">${escapeHtml(entry.roomName)}</span>
                            <span class="pill">${escapeHtml(entry.deliveryModeLabel)}</span>
                          </div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              `,
            )
            .join("")}
        </div>
      `,
    )
    .join("");
}

function renderGroupPool(root, unresolvedGroups = [], selectedGroupId) {
  root.innerHTML = unresolvedGroups.length
    ? unresolvedGroups
        .map(
          (group) => `
            <article class="group-card ${group.groupId === selectedGroupId ? "selected" : ""}" draggable="true" data-group-id="${escapeHtml(group.groupId)}">
              <div class="status-meta">
                <h4>${escapeHtml(group.subjectName)}</h4>
                <span class="pill">${group.remainingPeriods}/${group.requiredPeriodsPerWeek} left</span>
              </div>
              <p>${escapeHtml(group.displayName)} · ${escapeHtml(group.sectionName)}</p>
              <div class="group-meta">
                <span class="pill">${escapeHtml(group.deliveryModeLabel)}</span>
                <span class="pill">${escapeHtml(group.studentGroupKey)}</span>
              </div>
              <p>${escapeHtml((group.teachers || []).join(", ") || "No teacher assigned")}</p>
            </article>
          `,
        )
        .join("")
    : buildEmptyState("All groups scheduled", "There are no unresolved instructional groups in the current scope.");
}

function renderSimpleStack(root, items, emptyTitle, emptyText, mapper) {
  root.innerHTML = items.length ? items.map(mapper).join("") : buildEmptyState(emptyTitle, emptyText);
}

function renderValidation(root, validation = {}) {
  const conflicts = validation.conflicts || [];
  renderSimpleStack(
    root,
    conflicts,
    "No validation issues",
    "Run validation after edits to confirm the timetable is conflict-free.",
    (item) => `
      <article class="stack-item">
        <div class="status-meta">
          <h4>${escapeHtml(item.code)}</h4>
          <span class="tone-pill ${item.severity === "error" ? "error" : "warning"}">${escapeHtml(item.severity)}</span>
        </div>
        <p>${escapeHtml(item.message)}</p>
      </article>
    `,
  );
}

function renderSuggestions(root, suggestions = []) {
  renderSimpleStack(
    root,
    suggestions,
    "Pick a group first",
    "Select an unresolved instructional group to see the best suggested slots.",
    (item) => `
      <article class="stack-item clickable" data-suggestion-day="${escapeHtml(item.day)}" data-suggestion-period="${escapeHtml(item.period)}">
        <div class="status-meta">
          <h4>${escapeHtml(item.dayLabel)} · Period ${escapeHtml(item.period)}</h4>
          <span class="pill">Score ${escapeHtml(item.score)}</span>
        </div>
        <p>${escapeHtml((item.reasons || []).join(" · ") || "Balanced slot for this instructional group.")}</p>
      </article>
    `,
  );
}

function renderActivity(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.recentEvents || [],
    "No recent activity",
    "User edits and automation events will appear here once the team starts working in the board.",
    (item) => `
      <article class="stack-item">
        <h4>${escapeHtml(item.eventType)}</h4>
        <p>${escapeHtml(item.actorDisplayName)} · ${new Date(item.createdAt).toLocaleString("en-US")}</p>
      </article>
    `,
  );
}

function renderPresence(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.activeUsers || [],
    "No active collaborators",
    "When other authenticated users open the timetable workspace, they will appear here.",
    (item) => `
      <article class="presence-item">
        <strong>${escapeHtml(item.displayName)}</strong>
        <span class="muted-text">${escapeHtml(item.currentView || "workspace")} · ${new Date(item.lastSeenAt).toLocaleTimeString("en-US")}</span>
      </article>
    `,
  );
}

function renderLocks(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.locks || [],
    "No active locks",
    "Temporary edit locks will appear here while timetable cells are being changed.",
    (item) => `
      <article class="lock-item">
        <strong>${escapeHtml(item.displayName)}</strong>
        <span class="muted-text">${escapeHtml(item.resourceType)} · ${escapeHtml(item.resourceId)} · ${escapeHtml(item.day)} period ${escapeHtml(item.period)}</span>
      </article>
    `,
  );
}

function renderSettingsForm(root, settings = {}) {
  const signatories = settings.signatories || [];
  root.innerHTML = `
    <label class="field">
      <span>School name</span>
      <input name="schoolName" value="${escapeHtml(settings.schoolName || "")}" />
    </label>
    <label class="field">
      <span>Short name</span>
      <input name="schoolShortName" value="${escapeHtml(settings.schoolShortName || "")}" />
    </label>
    <label class="field">
      <span>Academic year</span>
      <input name="academicYear" value="${escapeHtml(settings.academicYear || "")}" />
    </label>
    <label class="field">
      <span>Term</span>
      <input name="term" value="${escapeHtml(settings.term || "")}" />
    </label>
    <label class="field full">
      <span>Logo path</span>
      <input name="logoPath" value="${escapeHtml(settings.logoPath || "")}" />
    </label>
    <div class="field full">
      <span>PDF signatories</span>
      <div class="signatory-grid">
        ${[0, 1, 2]
          .map(
            (index) => `
              <div class="signatory-card">
                <label class="field">
                  <span>Title</span>
                  <input name="signatoryTitle${index}" value="${escapeHtml(signatories[index]?.title || "")}" />
                </label>
                <label class="field">
                  <span>Name</span>
                  <input name="signatoryName${index}" value="${escapeHtml(signatories[index]?.name || "")}" />
                </label>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderNav(root, activeScreen) {
  root.innerHTML = NAV_ITEMS
    .map(
      (item) => `
        <button class="nav-item ${item.id === activeScreen ? "is-active" : ""}" data-screen="${item.id}">
          <span>${escapeHtml(item.label)}</span>
          <small>${escapeHtml(item.hint)}</small>
        </button>
      `,
    )
    .join("");
}

function renderCatalogOptions(select, activeValue) {
  select.innerHTML = CATALOG_OPTIONS
    .map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === activeValue ? "selected" : ""}>${escapeHtml(item.label)}</option>`)
    .join("");
}

function buildTeacherAssignmentRows(assignments, teachers) {
  const rows = assignments.length ? assignments : [{ teacherId: "", teachingRole: "LEAD", loadFactor: 1 }];
  return `
    <div class="teacher-assignment-grid" id="teacher-assignment-grid">
      ${rows
        .map(
          (assignment, index) => `
            <div class="assignment-row" data-assignment-index="${index}">
              <label class="field">
                <span>Teacher</span>
                <select data-assignment-field="teacherId">${optionTags(teachers, assignment.teacherId, "id", "fullName")}</select>
              </label>
              <label class="field">
                <span>Role</span>
                <select data-assignment-field="teachingRole">
                  ${["LEAD", "CO_TEACHER", "ASSISTANT", "SUPPORT"]
                    .map((role) => `<option value="${role}" ${role === assignment.teachingRole ? "selected" : ""}>${role}</option>`)
                    .join("")}
                </select>
              </label>
              <label class="field">
                <span>Load factor</span>
                <input type="number" step="0.25" min="0.25" data-assignment-field="loadFactor" value="${escapeHtml(assignment.loadFactor || 1)}" />
              </label>
              <button type="button" class="ghost-button compact-button" data-remove-assignment="${index}">Remove</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function buildAssignmentRowHtml(teachers, assignment = {}, index = 0) {
  return `
    <div class="assignment-row" data-assignment-index="${index}">
      <label class="field">
        <span>Teacher</span>
        <select data-assignment-field="teacherId">${optionTags(teachers, assignment.teacherId, "id", "fullName")}</select>
      </label>
      <label class="field">
        <span>Role</span>
        <select data-assignment-field="teachingRole">
          ${["LEAD", "CO_TEACHER", "ASSISTANT", "SUPPORT"]
            .map((role) => `<option value="${role}" ${role === assignment.teachingRole ? "selected" : ""}>${role}</option>`)
            .join("")}
        </select>
      </label>
      <label class="field">
        <span>Load factor</span>
        <input type="number" step="0.25" min="0.25" data-assignment-field="loadFactor" value="${escapeHtml(assignment.loadFactor || 1)}" />
      </label>
      <button type="button" class="ghost-button compact-button" data-remove-assignment="${index}">Remove</button>
    </div>
  `;
}

function buildModalForm(resource, record, lookup) {
  if (resource === "teachers") {
    return `
      <label class="field"><span>Teacher code</span><input name="teacherCode" value="${escapeHtml(record.teacherCode || "")}" required /></label>
      <label class="field"><span>Full name</span><input name="fullName" value="${escapeHtml(record.fullName || "")}" required /></label>
      <label class="field"><span>Max periods / week</span><input name="maxPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.maxPeriodsPerWeek || 24)}" /></label>
      <label class="field"><span>Roles (comma separated)</span><input name="rolesText" value="${escapeHtml((record.roles || []).join(", "))}" /></label>
      <label class="field full"><span>Subjects</span><select multiple name="subjectIds">${optionTags(lookup.subjects, "", "id", "name", false)}</select></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save teacher</button></div>
    `;
  }

  if (resource === "rooms") {
    return `
      <label class="field"><span>Room code</span><input name="roomCode" value="${escapeHtml(record.roomCode || "")}" required /></label>
      <label class="field"><span>Room name</span><input name="name" value="${escapeHtml(record.name || "")}" required /></label>
      <label class="field"><span>Room type</span><input name="specialType" value="${escapeHtml(record.specialType || "CLASSROOM")}" /></label>
      <label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" value="${escapeHtml(record.capacity || 40)}" /></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save room</button></div>
    `;
  }

  if (resource === "subjects") {
    return `
      <label class="field"><span>Subject code</span><input name="subjectCode" value="${escapeHtml(record.subjectCode || "")}" required /></label>
      <label class="field"><span>Subject name</span><input name="name" value="${escapeHtml(record.name || "")}" required /></label>
      <label class="field"><span>Credits</span><input name="credits" type="number" min="0" step="0.5" value="${escapeHtml(record.credits || 1)}" /></label>
      <label class="field"><span>Periods / week</span><input name="weeklyPeriods" type="number" min="1" value="${escapeHtml(record.weeklyPeriods || 1)}" /></label>
      <label class="field full"><span>Learning area</span><input name="learningArea" value="${escapeHtml(record.learningArea || "")}" /></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save subject</button></div>
    `;
  }

  if (resource === "sections") {
    return `
      <label class="field"><span>Education level</span><select name="educationLevel">${["PRIMARY", "LOWER_SECONDARY"].map((level) => `<option value="${level}" ${level === record.educationLevel ? "selected" : ""}>${level}</option>`).join("")}</select></label>
      <label class="field"><span>Grade</span><input name="grade" type="number" min="1" value="${escapeHtml(record.grade || 1)}" /></label>
      <label class="field"><span>Room name</span><input name="roomName" value="${escapeHtml(record.roomName || "")}" /></label>
      <label class="field"><span>Planned periods / week</span><input name="plannedPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.plannedPeriodsPerWeek || 30)}" /></label>
      <label class="field"><span>Academic year</span><input name="academicYear" value="${escapeHtml(record.academicYear || "")}" /></label>
      <label class="field"><span>Term</span><input name="term" value="${escapeHtml(record.term || "")}" /></label>
      <label class="field full"><span>Homeroom teacher</span><select name="homeroomTeacherId">${optionTags(lookup.teachers, record.homeroomTeacherId, "id", "fullName")}</select></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save section</button></div>
    `;
  }

  if (resource === "enrollments") {
    return `
      <label class="field"><span>Section</span><select name="sectionId">${optionTags(lookup.sections.map((section) => ({ ...section, label: formatSectionLabel(section) })), record.sectionId, "id", "label")}</select></label>
      <label class="field"><span>Subject</span><select name="subjectId">${optionTags(lookup.subjects, record.subjectId, "id", "name")}</select></label>
      <label class="field"><span>Lead teacher</span><select name="leadTeacherId">${optionTags(lookup.teachers, record.leadTeacherId, "id", "fullName")}</select></label>
      <label class="field"><span>Required periods</span><input name="requiredPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.requiredPeriodsPerWeek || 1)}" /></label>
      <label class="field"><span>Preferred room</span><select name="preferredRoomId">${optionTags(lookup.rooms, record.preferredRoomId, "id", "name")}</select></label>
      <label class="field full"><span>Notes</span><textarea name="notes">${escapeHtml(record.notes || "")}</textarea></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save enrollment</button></div>
    `;
  }

  return `
    <label class="field"><span>Enrollment</span><select name="enrollmentId">${optionTags(lookup.enrollments.map((enrollment) => ({ ...enrollment, label: `${lookup.subjectMap.get(enrollment.subjectId)?.name || "-"} · ${formatSectionLabel(lookup.sectionMap.get(enrollment.sectionId))}` })), record.enrollmentId, "id", "label")}</select></label>
    <label class="field"><span>Group code</span><input name="groupCode" value="${escapeHtml(record.groupCode || "")}" /></label>
    <label class="field"><span>Display name</span><input name="displayName" value="${escapeHtml(record.displayName || "")}" /></label>
    <label class="field"><span>Delivery mode</span><select name="deliveryMode">${["WHOLE_CLASS", "SPLIT_GROUP", "TEAM_TEACHING", "LARGE_GROUP"].map((mode) => `<option value="${mode}" ${mode === record.deliveryMode ? "selected" : ""}>${mode}</option>`).join("")}</select></label>
    <label class="field"><span>Student group key</span><input name="studentGroupKey" value="${escapeHtml(record.studentGroupKey || "")}" /></label>
    <label class="field"><span>Required periods</span><input name="requiredPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.requiredPeriodsPerWeek || 1)}" /></label>
    <label class="field full"><span>Preferred room</span><select name="preferredRoomId">${optionTags(lookup.rooms, record.preferredRoomId, "id", "name")}</select></label>
    <div class="field full">
      <span>Teacher assignments</span>
      ${buildTeacherAssignmentRows(record.teachers || [], lookup.teachers)}
      <button type="button" class="ghost-button" id="add-assignment-button">Add teacher</button>
    </div>
    <div class="full action-row modal-actions"><button class="primary-button" type="submit">Save group</button></div>
  `;
}

export {
  DAY_COLUMNS,
  NAV_ITEMS,
  SCREEN_META,
  CATALOG_OPTIONS,
  renderWorkspaceState,
  renderMetrics,
  renderStatusList,
  renderSectionStatuses,
  renderAlertFeed,
  renderTeacherLoads,
  renderCatalogHead,
  renderCatalogBody,
  renderViewSwitch,
  renderScopeSelect,
  renderBoardHead,
  renderBoardGrid,
  renderGroupPool,
  renderValidation,
  renderSuggestions,
  renderActivity,
  renderPresence,
  renderLocks,
  renderSettingsForm,
  renderNav,
  renderCatalogOptions,
  buildModalForm,
  buildTeacherAssignmentRows,
  buildAssignmentRowHtml,
  escapeHtml,
  formatSectionLabel,
};
