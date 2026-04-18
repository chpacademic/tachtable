import { strict as assert } from "node:assert";
import test from "node:test";
import type { SchedulingDataset } from "../src/domain/models";
import { validateTimetable } from "../src/scheduling/conflict-engine";

test("validateTimetable detects team-teaching teacher collisions and overload", () => {
  const dataset: SchedulingDataset = {
    teachers: [
      { id: "t-1", teacherCode: "T001", fullName: "ครูชลธิชา", maxPeriodsPerWeek: 1 },
      { id: "t-2", teacherCode: "T002", fullName: "ครูอรพิน", maxPeriodsPerWeek: 24 },
    ],
    rooms: [
      { id: "r-1", roomCode: "R101", name: "ป.5/1" },
      { id: "r-2", roomCode: "LAB1", name: "ห้องวิทยาศาสตร์" },
    ],
    sections: [{ id: "s-1", educationLevel: "PRIMARY", grade: 5, roomName: "1", plannedPeriodsPerWeek: 1 }],
    subjects: [
      { id: "sub-1", subjectCode: "TH51101", name: "ภาษาไทย", credits: 1, weeklyPeriods: 1 },
      { id: "sub-2", subjectCode: "MA51101", name: "คณิตศาสตร์", credits: 1, weeklyPeriods: 1 },
    ],
    enrollments: [
      { id: "e-1", sectionId: "s-1", subjectId: "sub-1", leadTeacherId: "t-1", requiredPeriodsPerWeek: 1 },
      { id: "e-2", sectionId: "s-1", subjectId: "sub-2", leadTeacherId: "t-1", requiredPeriodsPerWeek: 1 },
    ],
    instructionalGroups: [
      {
        id: "g-1",
        enrollmentId: "e-1",
        groupCode: "WHOLE",
        displayName: "ทั้งห้อง ภาษาไทย",
        deliveryMode: "WHOLE_CLASS",
        studentGroupKey: "WHOLE_CLASS",
        requiredPeriodsPerWeek: 1,
        teachers: [{ id: "ga-1", instructionalGroupId: "g-1", teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 }],
      },
      {
        id: "g-2",
        enrollmentId: "e-2",
        groupCode: "WHOLE",
        displayName: "ทั้งห้อง คณิตศาสตร์",
        deliveryMode: "TEAM_TEACHING",
        studentGroupKey: "WHOLE_CLASS",
        requiredPeriodsPerWeek: 1,
        teachers: [
          { id: "ga-2", instructionalGroupId: "g-2", teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 },
          { id: "ga-3", instructionalGroupId: "g-2", teacherId: "t-2", teachingRole: "CO_TEACHER", loadFactor: 1 },
        ],
      },
    ],
    entries: [
      {
        id: "entry-1",
        timetableId: "tt-1",
        enrollmentId: "e-1",
        instructionalGroupId: "g-1",
        sectionId: "s-1",
        subjectId: "sub-1",
        deliveryMode: "WHOLE_CLASS",
        studentGroupKey: "WHOLE_CLASS",
        roomId: "r-1",
        day: "MON",
        period: 1,
        teachers: [{ teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 }],
      },
      {
        id: "entry-2",
        timetableId: "tt-1",
        enrollmentId: "e-2",
        instructionalGroupId: "g-2",
        sectionId: "s-1",
        subjectId: "sub-2",
        deliveryMode: "TEAM_TEACHING",
        studentGroupKey: "WHOLE_CLASS",
        roomId: "r-2",
        day: "MON",
        period: 1,
        teachers: [
          { teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 },
          { teacherId: "t-2", teachingRole: "CO_TEACHER", loadFactor: 1 },
        ],
      },
    ],
  };

  const result = validateTimetable(dataset);

  assert.ok(result.conflicts.find((item) => item.code === "TEACHER_DOUBLE_BOOKED"));
  assert.ok(result.conflicts.find((item) => item.code === "TEACHER_OVERLOAD"));
  assert.ok(result.conflicts.find((item) => item.code === "SECTION_WHOLE_CLASS_COLLISION"));
  assert.equal(result.summary.assignedPeriods, 1);
});

test("validateTimetable allows split groups in the same period when student groups are different", () => {
  const dataset: SchedulingDataset = {
    teachers: [
      { id: "t-1", teacherCode: "T001", fullName: "ครูชลธิชา", maxPeriodsPerWeek: 24 },
      { id: "t-2", teacherCode: "T002", fullName: "ครูอรพิน", maxPeriodsPerWeek: 24 },
    ],
    rooms: [
      { id: "r-1", roomCode: "R101", name: "ห้องภาษา A" },
      { id: "r-2", roomCode: "R102", name: "ห้องภาษา B" },
    ],
    sections: [{ id: "s-1", educationLevel: "PRIMARY", grade: 5, roomName: "1", plannedPeriodsPerWeek: 1 }],
    subjects: [{ id: "sub-1", subjectCode: "EN51101", name: "ภาษาอังกฤษ", credits: 1, weeklyPeriods: 1 }],
    enrollments: [{ id: "e-1", sectionId: "s-1", subjectId: "sub-1", leadTeacherId: "t-1", requiredPeriodsPerWeek: 1 }],
    instructionalGroups: [
      {
        id: "g-a",
        enrollmentId: "e-1",
        groupCode: "A",
        displayName: "กลุ่ม A",
        deliveryMode: "SPLIT_GROUP",
        studentGroupKey: "A",
        requiredPeriodsPerWeek: 1,
        teachers: [{ id: "ga-1", instructionalGroupId: "g-a", teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 }],
      },
      {
        id: "g-b",
        enrollmentId: "e-1",
        groupCode: "B",
        displayName: "กลุ่ม B",
        deliveryMode: "SPLIT_GROUP",
        studentGroupKey: "B",
        requiredPeriodsPerWeek: 1,
        teachers: [{ id: "ga-2", instructionalGroupId: "g-b", teacherId: "t-2", teachingRole: "LEAD", loadFactor: 1 }],
      },
    ],
    entries: [
      {
        id: "entry-a",
        timetableId: "tt-1",
        enrollmentId: "e-1",
        instructionalGroupId: "g-a",
        sectionId: "s-1",
        subjectId: "sub-1",
        deliveryMode: "SPLIT_GROUP",
        studentGroupKey: "A",
        roomId: "r-1",
        day: "MON",
        period: 1,
        teachers: [{ teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 }],
      },
      {
        id: "entry-b",
        timetableId: "tt-1",
        enrollmentId: "e-1",
        instructionalGroupId: "g-b",
        sectionId: "s-1",
        subjectId: "sub-1",
        deliveryMode: "SPLIT_GROUP",
        studentGroupKey: "B",
        roomId: "r-2",
        day: "MON",
        period: 1,
        teachers: [{ teacherId: "t-2", teachingRole: "LEAD", loadFactor: 1 }],
      },
    ],
  };

  const result = validateTimetable(dataset);

  assert.equal(result.conflicts.some((item) => item.code === "SECTION_GROUP_OVERLAP"), false);
  assert.equal(result.conflicts.some((item) => item.code === "SECTION_WHOLE_CLASS_COLLISION"), false);
  assert.equal(result.summary.assignedPeriods, 1);
});
