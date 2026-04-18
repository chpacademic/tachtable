import {
  PERIODS_PER_DAY,
  WEEKDAYS,
  type ClassSection,
  type InstructionalGroup,
  type SchedulingDataset,
  type ScheduleConflict,
  type TeacherProfile,
  type TimetableEntry,
  type Weekday,
} from "../domain/models";

type SlotKey = `${Weekday}-${number}`;

export interface ValidationSummary {
  completionRate: number;
  assignedPeriods: number;
  requiredPeriods: number;
}

export interface ValidationResult {
  conflicts: ScheduleConflict[];
  summary: ValidationSummary;
}

export interface SuggestedSlot {
  day: Weekday;
  period: number;
  score: number;
  reasons: string[];
}

export interface SuggestionContext {
  group: InstructionalGroup;
  enrollments: SchedulingDataset["enrollments"];
  entries: TimetableEntry[];
  teachers: TeacherProfile[];
  sections: ClassSection[];
}

function toSlotKey(day: Weekday, period: number): SlotKey {
  return `${day}-${period}`;
}

function ensureSection(sectionId: string, sections: ClassSection[]): ClassSection {
  const section = sections.find((item) => item.id === sectionId);
  if (!section) {
    throw new Error(`Missing section ${sectionId}`);
  }

  return section;
}

function occupiesWholeSection(entry: TimetableEntry): boolean {
  return entry.deliveryMode !== "SPLIT_GROUP" || entry.studentGroupKey === "WHOLE_CLASS";
}

export function validateTimetable(dataset: SchedulingDataset): ValidationResult {
  const conflicts: ScheduleConflict[] = [];
  const teacherSlotMap = new Map<string, { entryId: string; teacherId: string }>();
  const roomSlotMap = new Map<string, TimetableEntry>();
  const sectionSlotMap = new Map<string, TimetableEntry[]>();
  const teacherLoad = new Map<string, number>();
  const sectionDailySlots = new Map<string, Set<SlotKey>>();
  const sectionWeeklySlots = new Map<string, Set<SlotKey>>();
  const enrollmentSlotUsage = new Map<string, Set<SlotKey>>();
  const groupSlotUsage = new Map<string, Set<SlotKey>>();

  for (const entry of dataset.entries) {
    const slotKey = toSlotKey(entry.day, entry.period);
    const roomKey = `${entry.roomId}:${slotKey}`;
    const sectionKey = `${entry.sectionId}:${entry.day}:${entry.period}`;
    const dayKey = `${entry.sectionId}:${entry.day}`;

    pushCollisionConflict("ROOM_DOUBLE_BOOKED", roomSlotMap, roomKey, entry, conflicts, "ห้องเรียนถูกใช้งานซ้อนกันในช่วงเวลาเดียวกัน");

    const currentEntries = sectionSlotMap.get(sectionKey) ?? [];
    currentEntries.push(entry);
    sectionSlotMap.set(sectionKey, currentEntries);

    for (const teacher of entry.teachers) {
      const teacherKey = `${teacher.teacherId}:${slotKey}`;
      pushTeacherCollisionConflict(teacherSlotMap, teacherKey, entry, teacher.teacherId, conflicts);
      teacherLoad.set(teacher.teacherId, (teacherLoad.get(teacher.teacherId) ?? 0) + (teacher.loadFactor ?? 1));
    }

    addSlot(sectionDailySlots, dayKey, slotKey);
    addSlot(sectionWeeklySlots, entry.sectionId, slotKey);
    addSlot(enrollmentSlotUsage, entry.enrollmentId, slotKey);
    addSlot(groupSlotUsage, entry.instructionalGroupId, slotKey);
  }

  for (const [sectionSlotKey, entriesAtSlot] of sectionSlotMap.entries()) {
    const [sectionId, day, rawPeriod] = sectionSlotKey.split(":");
    const period = Number(rawPeriod);

    if (hasWholeClassOverlap(entriesAtSlot)) {
      conflicts.push({
        code: "SECTION_WHOLE_CLASS_COLLISION",
        severity: "error",
        entityIds: entriesAtSlot.map((entry) => entry.id),
        day: day as Weekday,
        period,
        message: `ห้อง ${sectionId} มีคาบแบบเต็มห้องชนกับคาบอื่นในช่วงเวลาเดียวกัน`,
      });
      continue;
    }

    const duplicateGroupKeys = findDuplicateStudentGroups(entriesAtSlot);
    if (duplicateGroupKeys.length > 0) {
      conflicts.push({
        code: "SECTION_GROUP_OVERLAP",
        severity: "error",
        entityIds: entriesAtSlot.map((entry) => entry.id),
        day: day as Weekday,
        period,
        message: `มีกลุ่มย่อยซ้ำกันในห้องเดียวกันช่วงเวลาเดียวกัน: ${duplicateGroupKeys.join(", ")}`,
      });
    }
  }

  for (const teacher of dataset.teachers) {
    const usedLoad = teacherLoad.get(teacher.id) ?? 0;
    if (usedLoad > teacher.maxPeriodsPerWeek) {
      conflicts.push({
        code: "TEACHER_OVERLOAD",
        severity: "error",
        entityIds: [teacher.id],
        message: `ครู ${teacher.fullName} ถูกจัดสอน ${usedLoad} ชั่วโมง เกินกว่าค่าสูงสุด ${teacher.maxPeriodsPerWeek} ชั่วโมง`,
      });
    }
  }

  for (const enrollment of dataset.enrollments) {
    const assignedDistinctSlots = enrollmentSlotUsage.get(enrollment.id)?.size ?? 0;
    if (assignedDistinctSlots !== enrollment.requiredPeriodsPerWeek) {
      conflicts.push({
        code: "MISSING_SUBJECT_PERIODS",
        severity: "error",
        entityIds: [enrollment.id, enrollment.sectionId, enrollment.subjectId],
        message: `รายวิชาใน enrollment ${enrollment.id} ถูกจัด ${assignedDistinctSlots} จาก ${enrollment.requiredPeriodsPerWeek} คาบ`,
      });
    }
  }

  for (const group of dataset.instructionalGroups) {
    const assignedGroupPeriods = groupSlotUsage.get(group.id)?.size ?? 0;
    if (assignedGroupPeriods !== group.requiredPeriodsPerWeek) {
      conflicts.push({
        code: "MISSING_GROUP_PERIODS",
        severity: "error",
        entityIds: [group.id, group.enrollmentId],
        message: `กลุ่ม ${group.displayName} ถูกจัด ${assignedGroupPeriods} จาก ${group.requiredPeriodsPerWeek} คาบ`,
      });
    }
  }

  for (const section of dataset.sections) {
    const weeklyTotal = sectionWeeklySlots.get(section.id)?.size ?? 0;
    if (weeklyTotal !== section.plannedPeriodsPerWeek) {
      conflicts.push({
        code: "SECTION_WEEKLY_TOTAL_INVALID",
        severity: "error",
        entityIds: [section.id],
        message: `ห้อง ${section.roomName} ถูกจัด ${weeklyTotal} ชั่วโมงจากเป้าหมาย ${section.plannedPeriodsPerWeek} ชั่วโมงต่อสัปดาห์`,
      });
    }

    for (const day of WEEKDAYS) {
      const totalPerDay = sectionDailySlots.get(`${section.id}:${day}`)?.size ?? 0;
      if (totalPerDay !== PERIODS_PER_DAY) {
        conflicts.push({
          code: "SECTION_DAILY_TOTAL_INVALID",
          severity: "warning",
          entityIds: [section.id],
          day,
          message: `ห้อง ${section.roomName} มี ${totalPerDay} คาบในวัน ${day} จากที่กำหนด ${PERIODS_PER_DAY} คาบ`,
        });
      }
    }
  }

  const requiredPeriods = dataset.sections.reduce((sum, section) => sum + section.plannedPeriodsPerWeek, 0);
  const assignedPeriods = [...sectionWeeklySlots.values()].reduce((sum, slots) => sum + slots.size, 0);

  return {
    conflicts,
    summary: {
      completionRate: requiredPeriods === 0 ? 0 : Math.round((assignedPeriods / requiredPeriods) * 100),
      assignedPeriods,
      requiredPeriods,
    },
  };
}

export function findSuggestedSlots(context: SuggestionContext): SuggestedSlot[] {
  const group = context.group;
  const section = ensureSection(findSectionIdForGroup(group, context), context.sections);
  const sectionEntries = context.entries.filter((entry) => entry.sectionId === section.id);
  const groupTeacherIds = new Set(group.teachers.map((teacher) => teacher.teacherId));
  const teacherEntries = context.entries.filter((entry) => entry.teachers.some((teacher) => groupTeacherIds.has(teacher.teacherId)));
  const sameEnrollmentEntries = context.entries.filter((entry) => entry.enrollmentId === group.enrollmentId);

  const suggestions: SuggestedSlot[] = [];

  for (const day of WEEKDAYS) {
    for (let period = 1; period <= PERIODS_PER_DAY; period += 1) {
      const reasons: string[] = [];
      let score = 100;
      const slotEntries = sectionEntries.filter((entry) => entry.day === day && entry.period === period);
      const sectionBlocked = slotEntries.some((entry) => entriesConflictByStudentCoverage(entry, group.studentGroupKey, group.deliveryMode));
      const teacherBlocked = teacherEntries.some((entry) => entry.day === day && entry.period === period);

      if (sectionBlocked || teacherBlocked) {
        continue;
      }

      const dailyLoad = distinctSlotCount(sectionEntries.filter((entry) => entry.day === day));
      const teacherAdjacent = teacherEntries.some((entry) => entry.day === day && Math.abs(entry.period - period) === 1);
      const sameDaySubjectCount = distinctSlotCount(sameEnrollmentEntries.filter((entry) => entry.day === day));

      if (dailyLoad < PERIODS_PER_DAY) {
        score += 10;
        reasons.push("ช่วยเติมวันเรียนให้ครบ 6 คาบ");
      }

      if (teacherAdjacent) {
        score -= 15;
        reasons.push("มีครูร่วมสอนบางคนคาบติดกันอยู่แล้ว");
      }

      if (sameDaySubjectCount >= 2) {
        score -= 20;
        reasons.push("วิชาเดียวกันเริ่มกระจุกในวันเดียว");
      }

      if (period >= 5) {
        score -= 5;
        reasons.push("ช่วงปลายวันเหมาะเป็นตัวเลือกสำรอง");
      }

      suggestions.push({ day, period, score, reasons });
    }
  }

  return suggestions.sort((left, right) => right.score - left.score).slice(0, 8);
}

function findSectionIdForGroup(group: InstructionalGroup, context: SuggestionContext): string {
  const enrollment = context.enrollments.find((item) => item.id === group.enrollmentId);
  if (enrollment) {
    return enrollment.sectionId;
  }

  throw new Error(`Instructional group ${group.id} needs a section reference in the current dataset`);
}

function distinctSlotCount(entries: TimetableEntry[]): number {
  return new Set(entries.map((entry) => toSlotKey(entry.day, entry.period))).size;
}

function entriesConflictByStudentCoverage(entry: TimetableEntry, incomingGroupKey: string, incomingDeliveryMode: InstructionalGroup["deliveryMode"]): boolean {
  if (occupiesWholeSection(entry) || incomingDeliveryMode !== "SPLIT_GROUP" || incomingGroupKey === "WHOLE_CLASS") {
    return true;
  }

  return entry.studentGroupKey === incomingGroupKey;
}

function hasWholeClassOverlap(entries: TimetableEntry[]): boolean {
  const wholeClassCount = entries.filter((entry) => occupiesWholeSection(entry)).length;
  return wholeClassCount > 0 && entries.length > 1;
}

function findDuplicateStudentGroups(entries: TimetableEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.studentGroupKey, (counts.get(entry.studentGroupKey) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([groupKey]) => groupKey);
}

function addSlot(registry: Map<string, Set<SlotKey>>, key: string, slotKey: SlotKey): void {
  const slots = registry.get(key) ?? new Set<SlotKey>();
  slots.add(slotKey);
  registry.set(key, slots);
}

function pushCollisionConflict(
  code: ScheduleConflict["code"],
  registry: Map<string, TimetableEntry>,
  key: string,
  entry: TimetableEntry,
  conflicts: ScheduleConflict[],
  message: string,
): void {
  const existing = registry.get(key);
  if (!existing) {
    registry.set(key, entry);
    return;
  }

  conflicts.push({
    code,
    severity: "error",
    entityIds: [existing.id, entry.id],
    day: entry.day,
    period: entry.period,
    message,
  });
}

function pushTeacherCollisionConflict(
  registry: Map<string, { entryId: string; teacherId: string }>,
  key: string,
  entry: TimetableEntry,
  teacherId: string,
  conflicts: ScheduleConflict[],
): void {
  const existing = registry.get(key);
  if (!existing) {
    registry.set(key, { entryId: entry.id, teacherId });
    return;
  }

  conflicts.push({
    code: "TEACHER_DOUBLE_BOOKED",
    severity: "error",
    entityIds: [existing.entryId, entry.id, teacherId],
    day: entry.day,
    period: entry.period,
    message: `ครู ${teacherId} ถูกจัดสอนซ้อนในช่วงเวลาเดียวกัน`,
  });
}
