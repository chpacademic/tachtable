const {
  DAY_LABELS,
  DELIVERY_MODE_LABELS,
  EDUCATION_LEVEL_LABELS,
  TEACHING_ROLE_LABELS,
  WEEKDAYS,
  PERIODS_PER_DAY,
} = require("./constants");
const { validateTimetable, findSuggestedSlots } = require("./conflict-engine");

function getCurrentTimetable(db) {
  return db.timetables[0];
}

function buildDataset(db, timetable = getCurrentTimetable(db)) {
  return {
    timetableId: timetable.id,
    version: timetable.version,
    teachers: db.teachers,
    rooms: db.rooms,
    sections: db.sections,
    subjects: db.subjects,
    enrollments: db.enrollments,
    instructionalGroups: db.instructionalGroups,
    entries: timetable.entries || [],
  };
}

function buildMaps(db) {
  return {
    teacherMap: new Map(db.teachers.map((item) => [item.id, item])),
    roomMap: new Map(db.rooms.map((item) => [item.id, item])),
    sectionMap: new Map(db.sections.map((item) => [item.id, item])),
    subjectMap: new Map(db.subjects.map((item) => [item.id, item])),
    enrollmentMap: new Map(db.enrollments.map((item) => [item.id, item])),
    groupMap: new Map(db.instructionalGroups.map((item) => [item.id, item])),
  };
}

function sectionLabel(section) {
  return `${section.grade}/${section.roomName}`;
}

function hashColor(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const palette = ["#123d7a", "#0f766e", "#9f6d1c", "#8f1d40", "#4f46e5", "#0d9488", "#c2410c", "#0369a1"];
  return palette[Math.abs(hash) % palette.length];
}

function decorateEntry(entry, db) {
  const maps = buildMaps(db);
  const subject = maps.subjectMap.get(entry.subjectId);
  const room = maps.roomMap.get(entry.roomId);
  const section = maps.sectionMap.get(entry.sectionId);
  const group = maps.groupMap.get(entry.instructionalGroupId);
  const teachers = entry.teachers.map((assignment) => {
    const teacher = maps.teacherMap.get(assignment.teacherId);
    return {
      ...assignment,
      fullName: teacher?.fullName || assignment.teacherId,
      label: `${teacher?.fullName || assignment.teacherId} (${TEACHING_ROLE_LABELS[assignment.teachingRole] || assignment.teachingRole})`,
    };
  });

  return {
    ...entry,
    subjectName: subject?.name || entry.subjectId,
    subjectCode: subject?.subjectCode || entry.subjectId,
    roomName: room?.name || entry.roomId,
    sectionName: section ? sectionLabel(section) : entry.sectionId,
    sectionEducationLevel: section ? EDUCATION_LEVEL_LABELS[section.educationLevel] : "-",
    deliveryModeLabel: DELIVERY_MODE_LABELS[entry.deliveryMode] || entry.deliveryMode,
    groupName: group?.displayName || entry.studentGroupKey,
    teacherLabels: teachers.map((teacher) => teacher.label),
    teachersDetailed: teachers,
    colorTone: hashColor(entry.subjectId),
  };
}

function buildTeacherLoads(db) {
  const dataset = buildDataset(db);
  const teacherLoadMap = new Map(db.teachers.map((teacher) => [teacher.id, 0]));
  const teachingGroupsMap = new Map(db.teachers.map((teacher) => [teacher.id, new Set()]));

  for (const entry of dataset.entries) {
    for (const teacher of entry.teachers) {
      teacherLoadMap.set(teacher.teacherId, (teacherLoadMap.get(teacher.teacherId) || 0) + (teacher.loadFactor || 1));
      teachingGroupsMap.get(teacher.teacherId)?.add(entry.instructionalGroupId);
    }
  }

  return db.teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.fullName,
    current: Number((teacherLoadMap.get(teacher.id) || 0).toFixed(2)),
    max: teacher.maxPeriodsPerWeek,
    subjectNames: teacher.subjectIds
      .map((subjectId) => db.subjects.find((subject) => subject.id === subjectId)?.name)
      .filter(Boolean),
    assignedGroups: teachingGroupsMap.get(teacher.id)?.size || 0,
  }));
}

function buildUnresolvedGroups(db) {
  const dataset = buildDataset(db);
  const slotUsage = new Map();
  const maps = buildMaps(db);

  for (const entry of dataset.entries) {
    const slots = slotUsage.get(entry.instructionalGroupId) || new Set();
    slots.add(`${entry.day}:${entry.period}`);
    slotUsage.set(entry.instructionalGroupId, slots);
  }

  return db.instructionalGroups
    .map((group) => {
      const enrollment = maps.enrollmentMap.get(group.enrollmentId);
      const section = enrollment ? maps.sectionMap.get(enrollment.sectionId) : undefined;
      const subject = enrollment ? maps.subjectMap.get(enrollment.subjectId) : undefined;
      const assigned = slotUsage.get(group.id)?.size || 0;
      return {
        groupId: group.id,
        enrollmentId: group.enrollmentId,
        subjectName: subject?.name || "-",
        sectionName: section ? sectionLabel(section) : "-",
        displayName: group.displayName,
        deliveryMode: group.deliveryMode,
        deliveryModeLabel: DELIVERY_MODE_LABELS[group.deliveryMode] || group.deliveryMode,
        studentGroupKey: group.studentGroupKey,
        requiredPeriodsPerWeek: group.requiredPeriodsPerWeek,
        assignedPeriods: assigned,
        remainingPeriods: Math.max(group.requiredPeriodsPerWeek - assigned, 0),
        teachers: group.teachers.map((assignment) => maps.teacherMap.get(assignment.teacherId)?.fullName || assignment.teacherId),
      };
    })
    .filter((item) => item.remainingPeriods > 0)
    .sort((left, right) => right.remainingPeriods - left.remainingPeriods || left.sectionName.localeCompare(right.sectionName));
}

function buildSectionStatuses(db) {
  const dataset = buildDataset(db);
  const validation = validateTimetable(dataset);
  const sectionSlotUsage = new Map();

  for (const entry of dataset.entries) {
    const slots = sectionSlotUsage.get(entry.sectionId) || new Set();
    slots.add(`${entry.day}:${entry.period}`);
    sectionSlotUsage.set(entry.sectionId, slots);
  }

  return db.sections.map((section) => {
    const assignedPeriods = sectionSlotUsage.get(section.id)?.size || 0;
    const conflicts = validation.conflicts.filter((conflict) => conflict.entityIds.includes(section.id));
    return {
      id: section.id,
      educationLevel: section.educationLevel,
      educationLevelLabel: EDUCATION_LEVEL_LABELS[section.educationLevel] || section.educationLevel,
      label: sectionLabel(section),
      assignedPeriods,
      plannedPeriodsPerWeek: section.plannedPeriodsPerWeek,
      completionRate: Math.round((assignedPeriods / section.plannedPeriodsPerWeek) * 100),
      warningCount: conflicts.filter((item) => item.severity === "warning").length,
      errorCount: conflicts.filter((item) => item.severity === "error").length,
    };
  });
}

function buildDashboardSummary(db) {
  const dataset = buildDataset(db);
  const validation = validateTimetable(dataset);

  return {
    teachers: db.teachers.length,
    rooms: db.rooms.length,
    subjects: db.subjects.length,
    scheduledTimetables: db.timetables.length,
    completionRate: validation.summary.completionRate,
    assignedPeriods: validation.summary.assignedPeriods,
    requiredPeriods: validation.summary.requiredPeriods,
    alerts: validation.conflicts.slice(0, 8).map((conflict) => ({
      severity: conflict.severity,
      message: conflict.message,
      code: conflict.code,
    })),
  };
}

function getEntriesForView(db, view, entityId) {
  const dataset = buildDataset(db);
  if (view === "teacher") {
    return dataset.entries.filter((entry) => entry.teachers.some((teacher) => teacher.teacherId === entityId));
  }
  return dataset.entries.filter((entry) => entry.sectionId === entityId);
}

function buildTimetableMatrix(db, options) {
  const entries = getEntriesForView(db, options.view, options.entityId);
  const matrix = Array.from({ length: PERIODS_PER_DAY }, () =>
    Array.from({ length: WEEKDAYS.length }, () => []),
  );

  for (const entry of entries) {
    const dayIndex = WEEKDAYS.indexOf(entry.day);
    if (dayIndex === -1) {
      continue;
    }
    matrix[entry.period - 1][dayIndex].push(decorateEntry(entry, db));
  }

  for (const periodRows of matrix) {
    for (const cellEntries of periodRows) {
      cellEntries.sort((left, right) => left.subjectName.localeCompare(right.subjectName));
    }
  }

  return matrix;
}

function buildPrintableMatrix(db, options) {
  const matrix = buildTimetableMatrix(db, options);
  return matrix.map((periodRow) =>
    periodRow.map((entries) => {
      if (entries.length === 0) {
        return "-";
      }

      return entries
        .map((entry) => {
          const teacherLine = entry.teachersDetailed.map((teacher) => teacher.fullName).join(", ");
          const groupLine = entry.studentGroupKey === "WHOLE_CLASS" ? "" : `\n${entry.groupName}`;
          return `${entry.subjectName}${groupLine}\n${teacherLine}\n${entry.roomName}`;
        })
        .join("\n----------------\n");
    }),
  );
}

function buildActivityPayload(db) {
  const timetable = getCurrentTimetable(db);
  return {
    version: timetable.version,
    activeUsers: db.collaboration.presences.map((presence) => ({
      userId: presence.userId,
      displayName: presence.displayName,
      currentView: presence.currentView,
      selectedSectionId: presence.selectedSectionId,
      selectedTeacherId: presence.selectedTeacherId,
      lastSeenAt: presence.lastSeenAt,
      colorToken: presence.colorToken,
    })),
    locks: db.collaboration.locks.map((lock) => ({
      lockId: lock.id,
      resourceType: lock.resourceType,
      resourceId: lock.resourceId,
      day: lock.day,
      period: lock.period,
      displayName: lock.displayName,
      expiresAt: lock.expiresAt,
      note: lock.note,
    })),
    recentEvents: [...db.collaboration.events]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12)
      .map((event) => ({
        eventType: event.eventType,
        actorDisplayName: event.actorDisplayName,
        createdAt: event.createdAt,
      })),
  };
}

function buildBootstrapPayload(db) {
  const timetable = getCurrentTimetable(db);
  const dataset = buildDataset(db, timetable);
  const validation = validateTimetable(dataset);

  return {
    settings: db.settings,
    teachers: db.teachers,
    rooms: db.rooms,
    subjects: db.subjects,
    sections: db.sections,
    enrollments: db.enrollments,
    instructionalGroups: db.instructionalGroups,
    timetable,
    dashboard: buildDashboardSummary(db),
    validation,
    teacherLoads: buildTeacherLoads(db),
    sectionStatuses: buildSectionStatuses(db),
    unresolvedGroups: buildUnresolvedGroups(db),
    activity: buildActivityPayload(db),
  };
}

function getGroupSuggestions(db, groupId) {
  const dataset = buildDataset(db);
  const group = db.instructionalGroups.find((item) => item.id === groupId);
  if (!group) {
    throw new Error(`Unknown instructional group ${groupId}`);
  }

  return findSuggestedSlots({
    group,
    enrollments: dataset.enrollments,
    entries: dataset.entries,
    teachers: dataset.teachers,
    sections: dataset.sections,
  }).map((slot) => ({
    ...slot,
    dayLabel: DAY_LABELS[slot.day] || slot.day,
  }));
}

function resolveDefaultRoomId(db, groupId) {
  const group = db.instructionalGroups.find((item) => item.id === groupId);
  if (!group) {
    return db.rooms[0]?.id;
  }

  if (group.preferredRoomId) {
    return group.preferredRoomId;
  }

  const enrollment = db.enrollments.find((item) => item.id === group.enrollmentId);
  if (enrollment?.preferredRoomId) {
    return enrollment.preferredRoomId;
  }

  const section = enrollment ? db.sections.find((item) => item.id === enrollment.sectionId) : undefined;
  const matchingRoom = db.rooms.find((room) => room.name.endsWith(`/${section?.roomName || ""}`));
  return matchingRoom?.id || db.rooms[0]?.id;
}

function buildPdfPayload(db, options) {
  const maps = buildMaps(db);
  const isTeacherView = options.view === "teacher";
  const entity = isTeacherView ? maps.teacherMap.get(options.entityId) : maps.sectionMap.get(options.entityId);
  const levelLabel = isTeacherView
    ? "ตารางครูผู้สอน"
    : entity
      ? EDUCATION_LEVEL_LABELS[entity.educationLevel] || entity.educationLevel
      : "-";
  const entityLabel = isTeacherView
    ? entity?.fullName || options.entityId
    : entity
      ? sectionLabel(entity)
      : options.entityId;

  return {
    school_name: db.settings.schoolName,
    report_title: isTeacherView ? "ตารางสอนรายครู" : "ตารางเรียนประจำภาคเรียน",
    education_level: levelLabel,
    section_name: entityLabel,
    term: db.settings.term,
    academic_year: db.settings.academicYear,
    printed_at: new Date().toLocaleString("th-TH"),
    logo_path: db.settings.logoPath || "",
    matrix: buildPrintableMatrix(db, options),
    signatories: db.settings.signatories,
  };
}

module.exports = {
  getCurrentTimetable,
  buildDataset,
  buildMaps,
  decorateEntry,
  buildTeacherLoads,
  buildUnresolvedGroups,
  buildSectionStatuses,
  buildDashboardSummary,
  buildTimetableMatrix,
  buildPrintableMatrix,
  buildActivityPayload,
  buildBootstrapPayload,
  getGroupSuggestions,
  resolveDefaultRoomId,
  buildPdfPayload,
  getEntriesForView,
};
