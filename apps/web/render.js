const NAV_ITEMS = [
  { id: "dashboard", label: "ภาพรวม", hint: "สถานะระบบและความคืบหน้า" },
  { id: "catalog", label: "ข้อมูลหลัก", hint: "ครู ห้องเรียน วิชา และห้องเรียนประจำ" },
  { id: "timetable", label: "ตารางสอน", hint: "วางแผน ตรวจสอบ และจัดคาบประจำสัปดาห์" },
  { id: "settings", label: "ตั้งค่า", hint: "ข้อมูลสถานศึกษาและผู้ลงนามเอกสาร" },
];

const SCREEN_META = {
  dashboard: {
    eyebrow: "ศูนย์ควบคุม",
    title: "ภาพรวมการดำเนินงาน",
    description: "ติดตามความพร้อม ความครอบคลุม ความขัดแย้ง และภาระสอนจากหน้าจอเดียวที่อ่านง่ายและเป็นระบบ",
  },
  catalog: {
    eyebrow: "ฐานข้อมูลหลัก",
    title: "พื้นที่จัดการข้อมูลระบบ",
    description: "ดูแลข้อมูลครู ห้องเรียน รายวิชา และห้องเรียนให้ถูกต้อง เพื่อให้ระบบจัดตารางทำงานได้แม่นยำ",
  },
  timetable: {
    eyebrow: "พื้นที่ทำงานหลัก",
    title: "ตัวจัดตารางสอน",
    description: "เลือกกลุ่มที่ยังไม่ลงคาบ ดูคำแนะนำ และตรวจสอบความครบถ้วนของตารางก่อนใช้งานจริง",
  },
  settings: {
    eyebrow: "ตั้งค่าเอกสาร",
    title: "ข้อมูลและเอกลักษณ์สถานศึกษา",
    description: "กำหนดชื่อโรงเรียน ภาคเรียน ปีการศึกษา และผู้ลงนามสำหรับเอกสารส่งออกทั้งหมด",
  },
};

const CATALOG_OPTIONS = [
  { value: "teachers", label: "ครู" },
  { value: "rooms", label: "ห้องเรียน" },
  { value: "subjects", label: "รายวิชา" },
  { value: "sections", label: "ห้องเรียน" },
  { value: "enrollments", label: "แผนรายวิชา" },
  { value: "instructionalGroups", label: "กลุ่มการสอน" },
];

const DAY_COLUMNS = [
  { value: "MON", label: "จ.", fullLabel: "วันจันทร์" },
  { value: "TUE", label: "อ.", fullLabel: "วันอังคาร" },
  { value: "WED", label: "พ.", fullLabel: "วันพุธ" },
  { value: "THU", label: "พฤ.", fullLabel: "วันพฤหัสบดี" },
  { value: "FRI", label: "ศ.", fullLabel: "วันศุกร์" },
];

const DELIVERY_MODE_LABELS = {
  WHOLE_CLASS: "ทั้งห้อง",
  SPLIT_GROUP: "กลุ่มย่อย",
  TEAM_TEACHING: "สอนร่วม",
  LARGE_GROUP: "กลุ่มใหญ่",
};

const TEACHING_ROLE_LABELS = {
  LEAD: "ครูหลัก",
  CO_TEACHER: "ครูร่วม",
  ASSISTANT: "ผู้ช่วยสอน",
  SUPPORT: "สนับสนุน",
};

const EDUCATION_LEVEL_LABELS = {
  PRIMARY: "ประถมศึกษา",
  LOWER_SECONDARY: "มัธยมศึกษาตอนต้น",
};

const ROOM_TYPE_LABELS = {
  CLASSROOM: "ห้องเรียน",
  LAB: "ห้องปฏิบัติการ",
  COMPUTER: "ห้องคอมพิวเตอร์",
  ART: "ห้องศิลปะ",
  HALL: "หอประชุม",
};

const SEVERITY_LABELS = {
  error: "ข้อผิดพลาด",
  warning: "คำเตือน",
  success: "พร้อมใช้งาน",
};

const CONFLICT_CODE_LABELS = {
  TEACHER_DOUBLE_BOOKED: "ครูสอนซ้อนเวลา",
  ROOM_DOUBLE_BOOKED: "ห้องเรียนถูกใช้ซ้อน",
  SECTION_WHOLE_CLASS_COLLISION: "คาบทั้งห้องซ้อนกัน",
  SECTION_GROUP_OVERLAP: "กลุ่มย่อยซ้อนกัน",
  TEACHER_OVERLOAD: "ภาระสอนเกินกำหนด",
  MISSING_SUBJECT_PERIODS: "คาบรายวิชาไม่ครบ",
  MISSING_GROUP_PERIODS: "คาบกลุ่มการสอนไม่ครบ",
  SECTION_WEEKLY_TOTAL_INVALID: "คาบรวมรายสัปดาห์ไม่ตรงเป้า",
  SECTION_DAILY_TOTAL_INVALID: "คาบรวมรายวันไม่สมดุล",
};

const EVENT_TYPE_LABELS = {
  ENTRY_CREATED: "เพิ่มคาบเรียน",
  ENTRY_UPDATED: "ปรับแก้คาบเรียน",
  ENTRY_DELETED: "ลบคาบเรียน",
};

const RESOURCE_TYPE_LABELS = {
  SECTION: "ห้องเรียน",
  INSTRUCTIONAL_GROUP: "กลุ่มการสอน",
  ROOM: "ห้อง",
  TEACHER: "ครู",
};

const VIEW_LABELS = {
  section: "มุมมองห้องเรียน",
  teacher: "มุมมองครู",
  workspace: "พื้นที่ทำงาน",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDayLabel(day) {
  return DAY_COLUMNS.find((item) => item.value === day)?.fullLabel || day || "-";
}

function formatSeverityLabel(severity) {
  return SEVERITY_LABELS[severity] || severity || "-";
}

function formatConflictCode(code) {
  return CONFLICT_CODE_LABELS[code] || code || "-";
}

function formatTeachingRole(role) {
  return TEACHING_ROLE_LABELS[role] || role || "-";
}

function formatDeliveryMode(mode) {
  return DELIVERY_MODE_LABELS[mode] || mode || "-";
}

function formatEducationLevel(level) {
  return EDUCATION_LEVEL_LABELS[level] || level || "-";
}

function formatRoomType(type) {
  return ROOM_TYPE_LABELS[type] || type || "-";
}

function formatResourceType(type) {
  return RESOURCE_TYPE_LABELS[type] || type || "-";
}

function formatActivityType(eventType) {
  return EVENT_TYPE_LABELS[eventType] || eventType || "-";
}

function formatPresenceView(view) {
  return VIEW_LABELS[view] || view || "พื้นที่ทำงาน";
}

function formatTime(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSectionLabel(section) {
  if (!section) {
    return "-";
  }
  const prefix = section.educationLevel === "PRIMARY" ? "ป." : section.educationLevel === "LOWER_SECONDARY" ? "ม." : "";
  return `${prefix}${section.grade}/${section.roomName}`;
}

function optionTags(items, selectedValue, valueKey = "id", labelKey = "name", allowBlank = true) {
  const options = allowBlank ? ['<option value="">เลือกตัวเลือก</option>'] : [];
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
    <article class="empty-state ${tone} tt-soft-panel">
      <strong class="tt-section-title">${escapeHtml(title)}</strong>
      <p class="tt-body-soft">${escapeHtml(body)}</p>
    </article>
  `;
}

function buildTableEmptyRow(columnCount, message) {
  return `<tr><td colspan="${columnCount}" class="table-empty">${escapeHtml(message)}</td></tr>`;
}

function renderWorkspaceState(root, options = {}) {
  const {
    tone = "neutral",
    title = "กำลังโหลดพื้นที่ทำงาน",
    body = "กรุณารอสักครู่ ระบบ TeachTable กำลังเตรียมข้อมูลของคุณ",
  } = options;

  root.innerHTML = buildEmptyState(title, body, tone);
}

function renderMetrics(metricsRoot, dashboard = {}) {
  const items = [
    {
      label: "ครู",
      value: dashboard.teachers ?? 0,
      detail: "จำนวนครูที่พร้อมใช้งานในแบบจำลองตารางสอน",
      tone: "cool",
    },
    {
      label: "ห้องเรียน",
      value: dashboard.rooms ?? 0,
      detail: "ห้องเรียนและห้องพิเศษที่พร้อมใช้งานในภาคเรียนนี้",
      tone: "warm",
    },
    {
      label: "รายวิชา",
      value: dashboard.subjects ?? 0,
      detail: "รายวิชาที่ผูกกับห้องเรียนและครูเรียบร้อยแล้ว",
      tone: "mint",
    },
    {
      label: "คาบที่จัดแล้ว",
      value: dashboard.assignedPeriods ?? 0,
      detail: `จากทั้งหมด ${dashboard.requiredPeriods ?? 0} คาบ`,
      tone: "rose",
    },
    {
      label: "ความพร้อม",
      value: `${dashboard.completionRate ?? 0}%`,
      detail: `${(dashboard.alerts || []).length} รายการที่ควรตรวจสอบ`,
      tone: "primary",
    },
  ];

  metricsRoot.innerHTML = items
    .map(
      (item) => `
        <article class="metric-card tone-${item.tone} tt-soft-panel">
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
  const readiness = errors > 0 ? "ต้องตรวจสอบ" : warnings > 0 ? "พร้อมใช้งานแบบมีคำเตือน" : "พร้อมใช้งาน";
  const syncTone = errors > 0 ? "error" : warnings > 0 ? "warning" : "success";

  root.innerHTML = `
    <div class="status-row">
      <span class="tone-pill ${syncTone}">${escapeHtml(readiness)}</span>
      <span class="muted-text">${errors} ข้อผิดพลาด • ${warnings} คำเตือน</span>
    </div>
    <div class="status-row">
      <span class="tone-dot ${errors > 0 ? "error" : "success"}"></span>
      <span class="muted-text">สถานะนี้อัปเดตจากผลตรวจตารางสอนล่าสุดของระบบ</span>
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
                  <strong class="tt-section-title">${escapeHtml(item.label)}</strong>
                  <div class="muted-text">${escapeHtml(item.educationLevelLabel || formatEducationLevel(item.educationLevel))}</div>
                </div>
                <span class="pill">${item.assignedPeriods}/${item.plannedPeriodsPerWeek} คาบ</span>
              </div>
              <div class="progress-row">
                <div class="progress-track">
                  <div class="progress-fill ${toneClass}" style="width: ${Math.min(item.completionRate || 0, 100)}%"></div>
                </div>
                <span class="tone-pill ${toneClass}">${item.completionRate}%</span>
              </div>
              <p class="muted-text">${item.errorCount} ข้อผิดพลาด • ${item.warningCount} คำเตือน</p>
            </article>
          `;
        })
        .join("")
    : buildEmptyState("ยังไม่มีข้อมูลห้องเรียน", "เพิ่มห้องเรียนและแผนรายวิชาเพื่อเริ่มประเมินความครอบคลุมของตารางสอน");
}

function renderAlertFeed(root, alerts = []) {
  root.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <article class="stack-item">
              <div class="status-meta">
                <h4 class="tt-section-title">${escapeHtml(formatConflictCode(alert.code))}</h4>
                <span class="tone-pill ${alert.severity === "error" ? "error" : "warning"}">${escapeHtml(formatSeverityLabel(alert.severity))}</span>
              </div>
              <p>${escapeHtml(alert.message)}</p>
            </article>
          `,
        )
        .join("")
    : buildEmptyState("ไม่มีการแจ้งเตือนค้างอยู่", "ผลตรวจตารางล่าสุดยังไม่พบรายการที่ต้องดำเนินการ");
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
                  <strong class="tt-section-title">${escapeHtml(teacher.name)}</strong>
                  <div class="muted-text">${escapeHtml((teacher.subjectNames || []).join(", ") || "ยังไม่ได้ผูกรายวิชา")}</div>
                </div>
                <strong>${teacher.current}/${teacher.max} คาบ</strong>
              </div>
              <div class="load-bar"><div class="load-fill ${toneClass}" style="width: ${Math.min(percent, 100)}%"></div></div>
              <p class="muted-text">รับผิดชอบ ${teacher.assignedGroups || 0} กลุ่มการสอน</p>
            </article>
          `;
        })
        .join("")
    : buildEmptyState("ยังไม่มีข้อมูลภาระงาน", "เพิ่มครูและคาบเรียนในตารางเพื่อดูการกระจายภาระสอน");
}

function catalogColumns(resource) {
  switch (resource) {
    case "teachers":
      return ["รหัส", "ชื่อครู", "คาบสูงสุด", "บทบาท", "รายวิชา", "จัดการ"];
    case "rooms":
      return ["รหัส", "ชื่อห้อง", "ประเภท", "ความจุ", "จัดการ"];
    case "subjects":
      return ["รหัส", "รายวิชา", "หน่วยกิต", "คาบ/สัปดาห์", "กลุ่มสาระ", "จัดการ"];
    case "sections":
      return ["ระดับชั้น", "ห้องเรียน", "ภาคเรียน", "คาบเป้าหมาย", "ครูประจำชั้น", "จัดการ"];
    case "enrollments":
      return ["ห้องเรียน", "รายวิชา", "ครูผู้สอนหลัก", "คาบที่ต้องจัด", "ห้องที่ต้องการ", "จัดการ"];
    case "instructionalGroups":
      return ["กลุ่ม", "รายวิชา", "ห้องเรียน", "รูปแบบ", "ครู", "จัดการ"];
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
      <button class="text-button" data-action="edit" data-id="${escapeHtml(id)}">แก้ไข</button>
      <button class="text-button danger-text" data-action="delete" data-id="${escapeHtml(id)}">ลบ</button>
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
          <td>${escapeHtml(formatRoomType(record.specialType))}</td>
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
          <td>${escapeHtml(formatEducationLevel(record.educationLevel))}</td>
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
        <td>${escapeHtml(formatDeliveryMode(record.deliveryMode))}</td>
        <td>${escapeHtml((record.teachers || []).map((assignment) => lookup.teacherMap.get(assignment.teacherId)?.fullName || assignment.teacherId).join(", ") || "-")}</td>
        <td>${actionButtons(record.id)}</td>
      </tr>
    `;
  });

  root.innerHTML = rows.join("") || buildTableEmptyRow(catalogColumns(resource).length, "ไม่พบข้อมูลที่ตรงกับตัวกรองในขณะนี้");
}

function renderViewSwitch(root, activeView) {
  root.innerHTML = `
    <button class="${activeView === "section" ? "is-active" : ""}" data-view="section">มุมมองห้องเรียน</button>
    <button class="${activeView === "teacher" ? "is-active" : ""}" data-view="teacher">มุมมองครู</button>
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
  root.innerHTML = `<div class="board-corner">คาบ</div>${DAY_COLUMNS.map((day) => `<div>${escapeHtml(day.fullLabel)}</div>`).join("")}`;
}

function renderBoardGrid(root, matrix) {
  root.innerHTML = matrix
    .map(
      (periodRow, periodIndex) => `
        <div class="board-row">
          <div class="period-label"><strong>คาบ ${periodIndex + 1}</strong><span>${periodIndex + 1}</span></div>
          ${periodRow
            .map(
              (entries, dayIndex) => `
                <div class="slot-cell" data-day="${DAY_COLUMNS[dayIndex].value}" data-period="${periodIndex + 1}">
                  ${entries
                    .map(
                      (entry) => `
                        <article class="entry-card" draggable="true" data-entry-id="${escapeHtml(entry.id)}" style="--entry-color: ${escapeHtml(entry.colorTone)}">
                          <button class="entry-delete" data-entry-delete="${escapeHtml(entry.id)}">นำออก</button>
                          <h4 class="tt-section-title">${escapeHtml(entry.subjectName)}</h4>
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
                <h4 class="tt-section-title">${escapeHtml(group.subjectName)}</h4>
                <span class="pill">${group.remainingPeriods}/${group.requiredPeriodsPerWeek} คาบ</span>
              </div>
              <p>${escapeHtml(group.displayName)} • ${escapeHtml(group.sectionName)}</p>
              <div class="group-meta">
                <span class="pill">${escapeHtml(group.deliveryModeLabel || formatDeliveryMode(group.deliveryMode))}</span>
                <span class="pill">${escapeHtml(group.studentGroupKey)}</span>
              </div>
              <p>${escapeHtml((group.teachers || []).join(", ") || "ยังไม่ได้กำหนดครู")}</p>
            </article>
          `,
        )
        .join("")
    : buildEmptyState("จัดลงคาบครบแล้ว", "ไม่มีกลุ่มการสอนที่ค้างอยู่ในขอบเขตที่คุณกำลังดู");
}

function renderSimpleStack(root, items, emptyTitle, emptyText, mapper) {
  root.innerHTML = items.length ? items.map(mapper).join("") : buildEmptyState(emptyTitle, emptyText);
}

function renderValidation(root, validation = {}) {
  const conflicts = validation.conflicts || [];
  renderSimpleStack(
    root,
    conflicts,
    "ยังไม่พบปัญหา",
    "กดตรวจสอบหลังแก้ไข เพื่อยืนยันว่าตารางสอนยังไม่มีความขัดแย้งสำคัญ",
    (item) => `
      <article class="stack-item">
        <div class="status-meta">
          <h4 class="tt-section-title">${escapeHtml(formatConflictCode(item.code))}</h4>
          <span class="tone-pill ${item.severity === "error" ? "error" : "warning"}">${escapeHtml(formatSeverityLabel(item.severity))}</span>
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
    "เลือกกลุ่มที่ต้องการก่อน",
    "เลือกกลุ่มการสอนที่ยังไม่ลงคาบ เพื่อดูช่วงเวลาที่ระบบแนะนำให้เหมาะสมที่สุด",
    (item) => `
      <article class="stack-item clickable" data-suggestion-day="${escapeHtml(item.day)}" data-suggestion-period="${escapeHtml(item.period)}">
        <div class="status-meta">
          <h4 class="tt-section-title">${escapeHtml(item.dayLabel || formatDayLabel(item.day))} • คาบ ${escapeHtml(item.period)}</h4>
          <span class="pill">คะแนน ${escapeHtml(item.score)}</span>
        </div>
        <p>${escapeHtml((item.reasons || []).join(" • ") || "เป็นช่วงเวลาที่สมดุลสำหรับกลุ่มการสอนนี้")}</p>
      </article>
    `,
  );
}

function renderActivity(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.recentEvents || [],
    "ยังไม่มีกิจกรรมล่าสุด",
    "เมื่อเริ่มมีการแก้ไขตารางหรือระบบอัตโนมัติทำงาน รายการเหล่านั้นจะแสดงที่นี่",
    (item) => `
      <article class="stack-item">
        <h4 class="tt-section-title">${escapeHtml(formatActivityType(item.eventType))}</h4>
        <p>${escapeHtml(item.actorDisplayName)} • ${escapeHtml(formatDateTime(item.createdAt))}</p>
      </article>
    `,
  );
}

function renderPresence(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.activeUsers || [],
    "ยังไม่มีผู้ใช้งานออนไลน์",
    "เมื่อผู้ใช้ที่ยืนยันตัวตนแล้วเปิดเข้ามาในหน้าจัดตาราง รายชื่อจะแสดงในส่วนนี้",
    (item) => `
      <article class="presence-item">
        <strong class="tt-section-title">${escapeHtml(item.displayName)}</strong>
        <span class="muted-text">${escapeHtml(formatPresenceView(item.currentView || "workspace"))} • ${escapeHtml(formatTime(item.lastSeenAt))}</span>
      </article>
    `,
  );
}

function renderLocks(root, activity = {}) {
  renderSimpleStack(
    root,
    activity.locks || [],
    "ยังไม่มีการล็อกการแก้ไข",
    "เมื่อมีการแก้ไขคาบเรียน ระบบจะแสดงรายการล็อกชั่วคราวเพื่อป้องกันการชนกันของงาน",
    (item) => `
      <article class="lock-item">
        <strong class="tt-section-title">${escapeHtml(item.displayName)}</strong>
        <span class="muted-text">${escapeHtml(formatResourceType(item.resourceType))} • ${escapeHtml(item.resourceId)} • ${escapeHtml(formatDayLabel(item.day))} คาบ ${escapeHtml(item.period)}</span>
      </article>
    `,
  );
}

function renderSettingsForm(root, settings = {}) {
  const signatories = settings.signatories || [];
  root.innerHTML = `
    <label class="field">
      <span>ชื่อสถานศึกษา</span>
      <input name="schoolName" value="${escapeHtml(settings.schoolName || "")}" />
    </label>
    <label class="field">
      <span>ชื่อย่อสถานศึกษา</span>
      <input name="schoolShortName" value="${escapeHtml(settings.schoolShortName || "")}" />
    </label>
    <label class="field">
      <span>ปีการศึกษา</span>
      <input name="academicYear" value="${escapeHtml(settings.academicYear || "")}" />
    </label>
    <label class="field">
      <span>ภาคเรียน</span>
      <input name="term" value="${escapeHtml(settings.term || "")}" />
    </label>
    <label class="field full">
      <span>พาธโลโก้</span>
      <input name="logoPath" value="${escapeHtml(settings.logoPath || "")}" />
    </label>
    <div class="field full">
      <span>ผู้ลงนามในเอกสาร PDF</span>
      <div class="signatory-grid">
        ${[0, 1, 2]
          .map(
            (index) => `
              <div class="signatory-card">
                <label class="field">
                  <span>ตำแหน่ง</span>
                  <input name="signatoryTitle${index}" value="${escapeHtml(signatories[index]?.title || "")}" />
                </label>
                <label class="field">
                  <span>ชื่อ-สกุล</span>
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
                <span>ครูผู้สอน</span>
                <select data-assignment-field="teacherId">${optionTags(teachers, assignment.teacherId, "id", "fullName")}</select>
              </label>
              <label class="field">
                <span>บทบาท</span>
                <select data-assignment-field="teachingRole">
                  ${Object.entries(TEACHING_ROLE_LABELS)
                    .map(([role, label]) => `<option value="${role}" ${role === assignment.teachingRole ? "selected" : ""}>${label}</option>`)
                    .join("")}
                </select>
              </label>
              <label class="field">
                <span>สัดส่วนภาระสอน</span>
                <input type="number" step="0.25" min="0.25" data-assignment-field="loadFactor" value="${escapeHtml(assignment.loadFactor || 1)}" />
              </label>
              <button type="button" class="ghost-button compact-button" data-remove-assignment="${index}">ลบแถว</button>
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
        <span>ครูผู้สอน</span>
        <select data-assignment-field="teacherId">${optionTags(teachers, assignment.teacherId, "id", "fullName")}</select>
      </label>
      <label class="field">
        <span>บทบาท</span>
        <select data-assignment-field="teachingRole">
          ${Object.entries(TEACHING_ROLE_LABELS)
            .map(([role, label]) => `<option value="${role}" ${role === assignment.teachingRole ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </label>
      <label class="field">
        <span>สัดส่วนภาระสอน</span>
        <input type="number" step="0.25" min="0.25" data-assignment-field="loadFactor" value="${escapeHtml(assignment.loadFactor || 1)}" />
      </label>
      <button type="button" class="ghost-button compact-button" data-remove-assignment="${index}">ลบแถว</button>
    </div>
  `;
}

function buildModalForm(resource, record, lookup) {
  if (resource === "teachers") {
    return `
      <label class="field"><span>รหัสครู</span><input name="teacherCode" value="${escapeHtml(record.teacherCode || "")}" required /></label>
      <label class="field"><span>ชื่อ-สกุล</span><input name="fullName" value="${escapeHtml(record.fullName || "")}" required /></label>
      <label class="field"><span>คาบสูงสุดต่อสัปดาห์</span><input name="maxPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.maxPeriodsPerWeek || 24)}" /></label>
      <label class="field"><span>บทบาท (คั่นด้วยเครื่องหมายจุลภาค)</span><input name="rolesText" value="${escapeHtml((record.roles || []).join(", "))}" /></label>
      <label class="field full"><span>รายวิชาที่สอน</span><select multiple name="subjectIds">${optionTags(lookup.subjects, "", "id", "name", false)}</select></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกข้อมูลครู</button></div>
    `;
  }

  if (resource === "rooms") {
    return `
      <label class="field"><span>รหัสห้อง</span><input name="roomCode" value="${escapeHtml(record.roomCode || "")}" required /></label>
      <label class="field"><span>ชื่อห้อง</span><input name="name" value="${escapeHtml(record.name || "")}" required /></label>
      <label class="field"><span>ประเภทห้อง</span><input name="specialType" value="${escapeHtml(record.specialType || "CLASSROOM")}" /></label>
      <label class="field"><span>ความจุ</span><input name="capacity" type="number" min="1" value="${escapeHtml(record.capacity || 40)}" /></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกข้อมูลห้อง</button></div>
    `;
  }

  if (resource === "subjects") {
    return `
      <label class="field"><span>รหัสวิชา</span><input name="subjectCode" value="${escapeHtml(record.subjectCode || "")}" required /></label>
      <label class="field"><span>ชื่อรายวิชา</span><input name="name" value="${escapeHtml(record.name || "")}" required /></label>
      <label class="field"><span>หน่วยกิต</span><input name="credits" type="number" min="0" step="0.5" value="${escapeHtml(record.credits || 1)}" /></label>
      <label class="field"><span>คาบต่อสัปดาห์</span><input name="weeklyPeriods" type="number" min="1" value="${escapeHtml(record.weeklyPeriods || 1)}" /></label>
      <label class="field full"><span>กลุ่มสาระ</span><input name="learningArea" value="${escapeHtml(record.learningArea || "")}" /></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกข้อมูลวิชา</button></div>
    `;
  }

  if (resource === "sections") {
    return `
      <label class="field"><span>ระดับชั้น</span><select name="educationLevel">${Object.entries(EDUCATION_LEVEL_LABELS).map(([level, label]) => `<option value="${level}" ${level === record.educationLevel ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>ชั้นปี</span><input name="grade" type="number" min="1" value="${escapeHtml(record.grade || 1)}" /></label>
      <label class="field"><span>เลขห้อง</span><input name="roomName" value="${escapeHtml(record.roomName || "")}" /></label>
      <label class="field"><span>คาบเป้าหมายต่อสัปดาห์</span><input name="plannedPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.plannedPeriodsPerWeek || 30)}" /></label>
      <label class="field"><span>ปีการศึกษา</span><input name="academicYear" value="${escapeHtml(record.academicYear || "")}" /></label>
      <label class="field"><span>ภาคเรียน</span><input name="term" value="${escapeHtml(record.term || "")}" /></label>
      <label class="field full"><span>ครูประจำชั้น</span><select name="homeroomTeacherId">${optionTags(lookup.teachers, record.homeroomTeacherId, "id", "fullName")}</select></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกข้อมูลห้องเรียน</button></div>
    `;
  }

  if (resource === "enrollments") {
    return `
      <label class="field"><span>ห้องเรียน</span><select name="sectionId">${optionTags(lookup.sections.map((section) => ({ ...section, label: formatSectionLabel(section) })), record.sectionId, "id", "label")}</select></label>
      <label class="field"><span>รายวิชา</span><select name="subjectId">${optionTags(lookup.subjects, record.subjectId, "id", "name")}</select></label>
      <label class="field"><span>ครูผู้สอนหลัก</span><select name="leadTeacherId">${optionTags(lookup.teachers, record.leadTeacherId, "id", "fullName")}</select></label>
      <label class="field"><span>คาบที่ต้องจัด</span><input name="requiredPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.requiredPeriodsPerWeek || 1)}" /></label>
      <label class="field"><span>ห้องที่ต้องการ</span><select name="preferredRoomId">${optionTags(lookup.rooms, record.preferredRoomId, "id", "name")}</select></label>
      <label class="field full"><span>หมายเหตุ</span><textarea name="notes">${escapeHtml(record.notes || "")}</textarea></label>
      <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกแผนรายวิชา</button></div>
    `;
  }

  return `
    <label class="field"><span>แผนรายวิชา</span><select name="enrollmentId">${optionTags(lookup.enrollments.map((enrollment) => ({ ...enrollment, label: `${lookup.subjectMap.get(enrollment.subjectId)?.name || "-"} • ${formatSectionLabel(lookup.sectionMap.get(enrollment.sectionId))}` })), record.enrollmentId, "id", "label")}</select></label>
    <label class="field"><span>รหัสกลุ่ม</span><input name="groupCode" value="${escapeHtml(record.groupCode || "")}" /></label>
    <label class="field"><span>ชื่อกลุ่มแสดงผล</span><input name="displayName" value="${escapeHtml(record.displayName || "")}" /></label>
    <label class="field"><span>รูปแบบการสอน</span><select name="deliveryMode">${Object.entries(DELIVERY_MODE_LABELS).map(([mode, label]) => `<option value="${mode}" ${mode === record.deliveryMode ? "selected" : ""}>${label}</option>`).join("")}</select></label>
    <label class="field"><span>คีย์กลุ่มผู้เรียน</span><input name="studentGroupKey" value="${escapeHtml(record.studentGroupKey || "")}" /></label>
    <label class="field"><span>คาบที่ต้องจัด</span><input name="requiredPeriodsPerWeek" type="number" min="1" value="${escapeHtml(record.requiredPeriodsPerWeek || 1)}" /></label>
    <label class="field full"><span>ห้องที่ต้องการ</span><select name="preferredRoomId">${optionTags(lookup.rooms, record.preferredRoomId, "id", "name")}</select></label>
    <div class="field full">
      <span>การมอบหมายครูผู้สอน</span>
      ${buildTeacherAssignmentRows(record.teachers || [], lookup.teachers)}
      <button type="button" class="ghost-button" id="add-assignment-button">เพิ่มครูผู้สอน</button>
    </div>
    <div class="full action-row modal-actions"><button class="primary-button" type="submit">บันทึกกลุ่มการสอน</button></div>
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
  formatDeliveryMode,
  formatTeachingRole,
};
