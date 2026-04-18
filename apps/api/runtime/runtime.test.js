const test = require("node:test");
const assert = require("node:assert/strict");

const { autoSchedule } = require("./auto-scheduler");
const { applyCollaborativeMutation, claimSlotLock } = require("./collaboration-service");
const { validateTimetable } = require("./conflict-engine");
const { createSampleDatabase } = require("./sample-data");
const { buildDataset } = require("./selectors");

test("autoSchedule creates timetable entries from seeded data", () => {
  const db = createSampleDatabase();
  const dataset = buildDataset(db);
  const result = autoSchedule(dataset, { forceRebuild: true });

  assert.ok(result.entries.length > 0);
  assert.ok(result.completionRate >= 0);
});

test("validateTimetable detects teacher double booking", () => {
  const db = createSampleDatabase();
  const dataset = buildDataset(db);
  dataset.entries = [
    {
      id: "entry-1",
      timetableId: dataset.timetableId,
      enrollmentId: db.enrollments[0].id,
      instructionalGroupId: db.instructionalGroups[0].id,
      sectionId: db.enrollments[0].sectionId,
      subjectId: db.enrollments[0].subjectId,
      deliveryMode: "WHOLE_CLASS",
      studentGroupKey: "WHOLE_CLASS",
      roomId: db.rooms[0].id,
      day: "MON",
      period: 1,
      teachers: [{ teacherId: "teacher-math", teachingRole: "LEAD", loadFactor: 1 }],
    },
    {
      id: "entry-2",
      timetableId: dataset.timetableId,
      enrollmentId: db.enrollments[1].id,
      instructionalGroupId: db.instructionalGroups[1].id,
      sectionId: db.enrollments[1].sectionId,
      subjectId: db.enrollments[1].subjectId,
      deliveryMode: "WHOLE_CLASS",
      studentGroupKey: "WHOLE_CLASS",
      roomId: db.rooms[1].id,
      day: "MON",
      period: 1,
      teachers: [{ teacherId: "teacher-math", teachingRole: "LEAD", loadFactor: 1 }],
    },
  ];

  const validation = validateTimetable(dataset);
  assert.ok(validation.conflicts.some((item) => item.code === "TEACHER_DOUBLE_BOOKED"));
});

test("collaboration mutation increments version when locks are held", () => {
  const db = createSampleDatabase();
  const dataset = buildDataset(db);
  const group = db.instructionalGroups[0];
  const enrollment = db.enrollments.find((item) => item.id === group.enrollmentId);
  const patch = {
    enrollmentId: enrollment.id,
    instructionalGroupId: group.id,
    sectionId: enrollment.sectionId,
    subjectId: enrollment.subjectId,
    deliveryMode: group.deliveryMode,
    studentGroupKey: group.studentGroupKey,
    roomId: db.rooms[0].id,
    day: "MON",
    period: 1,
    teachers: group.teachers.map((assignment) => ({
      teacherId: assignment.teacherId,
      teachingRole: assignment.teachingRole,
      loadFactor: assignment.loadFactor,
    })),
  };

  let locks = [];
  for (const request of [
    { resourceType: "SECTION", resourceId: enrollment.sectionId },
    { resourceType: "INSTRUCTIONAL_GROUP", resourceId: group.id },
    { resourceType: "ROOM", resourceId: db.rooms[0].id },
    ...patch.teachers.map((teacher) => ({ resourceType: "TEACHER", resourceId: teacher.teacherId })),
  ]) {
    const result = claimSlotLock(
      { snapshot: dataset, presences: [], locks, events: [] },
      { ...request, timetableId: dataset.timetableId, userId: "u-1", displayName: "tester", day: "MON", period: 1 },
    );
    locks = result.locks;
  }

  const response = applyCollaborativeMutation(
    { snapshot: dataset, presences: [], locks, events: [] },
    {
      actorUserId: "u-1",
      actorDisplayName: "tester",
      timetableId: dataset.timetableId,
      baseVersion: dataset.version,
      expectedLockIds: locks.map((item) => item.id),
      patches: [patch],
    },
  );

  assert.equal(response.result.ok, true);
  assert.equal(response.result.nextVersion, dataset.version + 1);
});
