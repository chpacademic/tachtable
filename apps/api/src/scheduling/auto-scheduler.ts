import {
  PERIODS_PER_DAY,
  WEEKDAYS,
  type Enrollment,
  type InstructionalGroup,
  type Room,
  type SchedulingDataset,
  type TimetableEntry,
} from "../domain/models";
import { findSuggestedSlots, validateTimetable } from "./conflict-engine";

export interface AutoScheduleResult {
  entries: TimetableEntry[];
  unresolved: Array<{ instructionalGroupId: string; remainingPeriods: number; reason: string }>;
  completionRate: number;
  conflicts: ReturnType<typeof validateTimetable>["conflicts"];
}

export function autoSchedule(dataset: SchedulingDataset): AutoScheduleResult {
  const entries: TimetableEntry[] = [...dataset.entries];
  const unresolved: AutoScheduleResult["unresolved"] = [];

  const orderedGroups = [...dataset.instructionalGroups].sort((left, right) => {
    if (right.requiredPeriodsPerWeek !== left.requiredPeriodsPerWeek) {
      return right.requiredPeriodsPerWeek - left.requiredPeriodsPerWeek;
    }

    return right.teachers.length - left.teachers.length;
  });

  for (const group of orderedGroups) {
    if (group.teachers.length === 0) {
      unresolved.push({
        instructionalGroupId: group.id,
        remainingPeriods: group.requiredPeriodsPerWeek,
        reason: "ยังไม่มีครูใน instructional group นี้",
      });
      continue;
    }

    const enrollment = findEnrollment(group.enrollmentId, dataset.enrollments);
    const alreadyPlaced = distinctScheduledPeriods(entries, group.id);
    let remaining = group.requiredPeriodsPerWeek - alreadyPlaced;

    while (remaining > 0) {
      const suggestions = findSuggestedSlots({
        group,
        enrollments: dataset.enrollments,
        entries,
        teachers: dataset.teachers,
        sections: dataset.sections,
      });

      const nextSlot = suggestions.find((slot) => !hasDuplicateGroupSameDay(entries, group, slot.day));
      if (!nextSlot) {
        unresolved.push({
          instructionalGroupId: group.id,
          remainingPeriods: remaining,
          reason: "ไม่พบ slot ที่ผ่านเงื่อนไขของครูร่วมสอน กลุ่มผู้เรียน และห้องเรียน",
        });
        break;
      }

      entries.push({
        id: `generated-${group.id}-${nextSlot.day}-${nextSlot.period}-${remaining}`,
        timetableId: dataset.entries[0]?.timetableId ?? "draft-timetable",
        enrollmentId: group.enrollmentId,
        instructionalGroupId: group.id,
        sectionId: enrollment.sectionId,
        subjectId: enrollment.subjectId,
        deliveryMode: group.deliveryMode,
        studentGroupKey: group.studentGroupKey,
        roomId: pickRoomId(group, enrollment, dataset.rooms),
        day: nextSlot.day,
        period: nextSlot.period,
        teachers: group.teachers.map((teacher) => ({
          teacherId: teacher.teacherId,
          teachingRole: teacher.teachingRole,
          loadFactor: teacher.loadFactor,
        })),
      });

      remaining -= 1;
    }
  }

  const validation = validateTimetable({ ...dataset, entries });

  return {
    entries,
    unresolved,
    completionRate: validation.summary.completionRate,
    conflicts: validation.conflicts,
  };
}

function findEnrollment(enrollmentId: string, enrollments: Enrollment[]): Enrollment {
  const enrollment = enrollments.find((item) => item.id === enrollmentId);
  if (!enrollment) {
    throw new Error(`Missing enrollment ${enrollmentId}`);
  }

  return enrollment;
}

function distinctScheduledPeriods(entries: TimetableEntry[], instructionalGroupId: string): number {
  return new Set(
    entries
      .filter((entry) => entry.instructionalGroupId === instructionalGroupId)
      .map((entry) => `${entry.day}:${entry.period}`),
  ).size;
}

function pickRoomId(group: InstructionalGroup, enrollment: Enrollment, rooms: Room[]): string {
  if (group.preferredRoomId) {
    return group.preferredRoomId;
  }

  if (enrollment.preferredRoomId) {
    return enrollment.preferredRoomId;
  }

  return rooms[0]?.id ?? "default-room";
}

function hasDuplicateGroupSameDay(entries: TimetableEntry[], group: InstructionalGroup, day: TimetableEntry["day"]): boolean {
  const subjectCount = entries.filter((entry) => entry.instructionalGroupId === group.id && entry.day === day).length;
  return subjectCount >= 2;
}

export function enumerateAllSlots() {
  const slots: Array<{ day: TimetableEntry["day"]; period: number }> = [];
  for (const day of WEEKDAYS) {
    for (let period = 1; period <= PERIODS_PER_DAY; period += 1) {
      slots.push({ day, period });
    }
  }
  return slots;
}
