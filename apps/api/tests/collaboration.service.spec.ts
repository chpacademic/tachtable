import { strict as assert } from "node:assert";
import test from "node:test";
import type { CollaborationState } from "../src/collaboration/collaboration.service";
import { applyCollaborativeMutation, claimSlotLock, heartbeatPresence } from "../src/collaboration/collaboration.service";

function buildState(): CollaborationState {
  return {
    snapshot: {
      timetableId: "tt-1",
      version: 3,
      teachers: [
        { id: "t-1", teacherCode: "T001", fullName: "ครูชลธิชา", maxPeriodsPerWeek: 24 },
        { id: "t-2", teacherCode: "T002", fullName: "ครูอรพิน", maxPeriodsPerWeek: 24 },
      ],
      rooms: [{ id: "r-1", roomCode: "R101", name: "ป.5/1" }],
      sections: [{ id: "s-1", educationLevel: "PRIMARY", grade: 5, roomName: "1", plannedPeriodsPerWeek: 30 }],
      subjects: [{ id: "sub-1", subjectCode: "MA51101", name: "คณิตศาสตร์", credits: 1, weeklyPeriods: 5 }],
      enrollments: [{ id: "e-1", sectionId: "s-1", subjectId: "sub-1", leadTeacherId: "t-1", requiredPeriodsPerWeek: 5 }],
      instructionalGroups: [
        {
          id: "g-1",
          enrollmentId: "e-1",
          groupCode: "WHOLE",
          displayName: "ทั้งห้องคณิตศาสตร์",
          deliveryMode: "TEAM_TEACHING",
          studentGroupKey: "WHOLE_CLASS",
          requiredPeriodsPerWeek: 5,
          teachers: [
            { id: "agt-1", instructionalGroupId: "g-1", teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 },
            { id: "agt-2", instructionalGroupId: "g-1", teacherId: "t-2", teachingRole: "CO_TEACHER", loadFactor: 1 },
          ],
        },
      ],
      entries: [],
    },
    presences: [],
    locks: [],
    events: [],
  };
}

test("heartbeatPresence upserts active editor state", () => {
  const state = heartbeatPresence(buildState(), {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    currentView: "section",
    selectedSectionId: "s-1",
  });

  assert.equal(state.presences.length, 1);
  assert.equal(state.presences[0]?.userId, "u-1");
});

test("claimSlotLock rejects another user on the same resource and slot", () => {
  const base = buildState();
  const claimed = claimSlotLock(base, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "INSTRUCTIONAL_GROUP",
    resourceId: "g-1",
    day: "MON",
    period: 1,
  });
  const nextState = { ...base, locks: claimed.locks };

  const denied = claimSlotLock(nextState, {
    timetableId: "tt-1",
    userId: "u-2",
    displayName: "ครูวิชาการ",
    resourceType: "INSTRUCTIONAL_GROUP",
    resourceId: "g-1",
    day: "MON",
    period: 1,
  });

  assert.equal(denied.ok, false);
});

test("applyCollaborativeMutation blocks stale version writes", () => {
  const state = buildState();
  const response = applyCollaborativeMutation(state, {
    timetableId: "tt-1",
    actorUserId: "u-1",
    actorDisplayName: "หัวหน้าวิชาการ",
    baseVersion: 2,
    patches: [
      {
        enrollmentId: "e-1",
        instructionalGroupId: "g-1",
        sectionId: "s-1",
        subjectId: "sub-1",
        deliveryMode: "TEAM_TEACHING",
        studentGroupKey: "WHOLE_CLASS",
        roomId: "r-1",
        day: "MON",
        period: 1,
        teachers: [
          { teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 },
          { teacherId: "t-2", teachingRole: "CO_TEACHER", loadFactor: 1 },
        ],
      },
    ],
  });

  assert.equal(response.result.ok, false);
  assert.match(response.result.staleReason ?? "", /เวอร์ชันล่าสุด/);
});

test("applyCollaborativeMutation requires owned locks for group and teachers then increments version", () => {
  const base = buildState();
  const step1 = claimSlotLock(base, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "SECTION",
    resourceId: "s-1",
    day: "MON",
    period: 1,
  });
  const step2 = claimSlotLock({ ...base, locks: step1.locks }, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "INSTRUCTIONAL_GROUP",
    resourceId: "g-1",
    day: "MON",
    period: 1,
  });
  const step3 = claimSlotLock({ ...base, locks: step2.locks }, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "TEACHER",
    resourceId: "t-1",
    day: "MON",
    period: 1,
  });
  const step4 = claimSlotLock({ ...base, locks: step3.locks }, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "TEACHER",
    resourceId: "t-2",
    day: "MON",
    period: 1,
  });
  const step5 = claimSlotLock({ ...base, locks: step4.locks }, {
    timetableId: "tt-1",
    userId: "u-1",
    displayName: "หัวหน้าวิชาการ",
    resourceType: "ROOM",
    resourceId: "r-1",
    day: "MON",
    period: 1,
  });

  const response = applyCollaborativeMutation(
    {
      ...base,
      locks: step5.locks,
    },
    {
      timetableId: "tt-1",
      actorUserId: "u-1",
      actorDisplayName: "หัวหน้าวิชาการ",
      baseVersion: 3,
      expectedLockIds: step5.locks.map((lock) => lock.id),
      patches: [
        {
          enrollmentId: "e-1",
          instructionalGroupId: "g-1",
          sectionId: "s-1",
          subjectId: "sub-1",
          deliveryMode: "TEAM_TEACHING",
          studentGroupKey: "WHOLE_CLASS",
          roomId: "r-1",
          day: "MON",
          period: 1,
          teachers: [
            { teacherId: "t-1", teachingRole: "LEAD", loadFactor: 1 },
            { teacherId: "t-2", teachingRole: "CO_TEACHER", loadFactor: 1 },
          ],
        },
      ],
    },
  );

  assert.equal(response.result.ok, true);
  assert.equal(response.result.nextVersion, 4);
  assert.equal(response.nextState.snapshot.entries.length, 1);
  assert.equal(response.nextState.snapshot.entries[0]?.teachers.length, 2);
});
