import {
  type TimetableChangeEvent,
  type TimetableEntry,
  type TimetableMutationRequest,
  type TimetableMutationResult,
  type TimetablePresence,
  type TimetableSlotLock,
  type TimetableSnapshot,
  type Weekday,
} from "../domain/models";
import { validateTimetable } from "../scheduling/conflict-engine";

const LOCK_TTL_MS = 3 * 60 * 1000;
const PRESENCE_TTL_MS = 90 * 1000;

type SlotResourceType = TimetableSlotLock["resourceType"];

export interface CollaborationState {
  snapshot: TimetableSnapshot;
  presences: TimetablePresence[];
  locks: TimetableSlotLock[];
  events: TimetableChangeEvent[];
}

export interface PresenceHeartbeatInput {
  timetableId: string;
  userId: string;
  displayName: string;
  currentView?: string;
  selectedSectionId?: string;
  selectedTeacherId?: string;
  colorToken?: string;
  now?: Date;
}

export interface ClaimSlotLockInput {
  timetableId: string;
  userId: string;
  displayName: string;
  day: Weekday;
  period: number;
  resourceType: SlotResourceType;
  resourceId: string;
  note?: string;
  now?: Date;
}

export interface ClaimSlotLockResult {
  ok: boolean;
  reason?: string;
  lock?: TimetableSlotLock;
  locks: TimetableSlotLock[];
}

export interface ReleaseSlotLockInput {
  lockId: string;
  userId: string;
}

export interface CollaborationMutationResponse {
  result: TimetableMutationResult;
  nextState: CollaborationState;
}

export function heartbeatPresence(state: CollaborationState, input: PresenceHeartbeatInput): CollaborationState {
  const now = input.now ?? new Date();
  const nextPresence: TimetablePresence = {
    id: `${input.timetableId}:${input.userId}`,
    timetableId: input.timetableId,
    userId: input.userId,
    displayName: input.displayName,
    status: "ACTIVE",
    currentView: input.currentView,
    selectedSectionId: input.selectedSectionId,
    selectedTeacherId: input.selectedTeacherId,
    colorToken: input.colorToken,
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PRESENCE_TTL_MS).toISOString(),
  };

  return {
    ...state,
    presences: pruneExpiredPresences(state.presences, now)
      .filter((presence) => !(presence.timetableId === input.timetableId && presence.userId === input.userId))
      .concat(nextPresence),
  };
}

export function claimSlotLock(state: CollaborationState, input: ClaimSlotLockInput): ClaimSlotLockResult {
  const now = input.now ?? new Date();
  const activeLocks = pruneExpiredLocks(state.locks, now);
  const conflictingLock = activeLocks.find(
    (lock) =>
      lock.timetableId === input.timetableId &&
      lock.day === input.day &&
      lock.period === input.period &&
      lock.resourceType === input.resourceType &&
      lock.resourceId === input.resourceId &&
      lock.userId !== input.userId,
  );

  if (conflictingLock) {
    return {
      ok: false,
      reason: `slot นี้ถูกจับจองโดย ${conflictingLock.displayName} อยู่แล้ว`,
      locks: activeLocks,
    };
  }

  const lock: TimetableSlotLock = {
    id: `${input.timetableId}:${input.resourceType}:${input.resourceId}:${input.day}:${input.period}`,
    timetableId: input.timetableId,
    userId: input.userId,
    displayName: input.displayName,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    day: input.day,
    period: input.period,
    note: input.note,
    expiresAt: new Date(now.getTime() + LOCK_TTL_MS).toISOString(),
  };

  const locks = activeLocks
    .filter((item) => item.id !== lock.id)
    .concat(lock)
    .sort((left, right) => left.id.localeCompare(right.id));

  return { ok: true, lock, locks };
}

export function releaseSlotLock(state: CollaborationState, input: ReleaseSlotLockInput): CollaborationState {
  return {
    ...state,
    locks: state.locks.filter((lock) => !(lock.id === input.lockId && lock.userId === input.userId)),
  };
}

export function applyCollaborativeMutation(
  state: CollaborationState,
  mutation: TimetableMutationRequest,
  now = new Date(),
): CollaborationMutationResponse {
  const nextState = {
    ...state,
    presences: pruneExpiredPresences(state.presences, now),
    locks: pruneExpiredLocks(state.locks, now),
  };

  if (mutation.baseVersion !== nextState.snapshot.version) {
    return {
      result: {
        ok: false,
        staleReason: `ตารางถูกแก้ไขไปแล้ว เวอร์ชันล่าสุดคือ ${nextState.snapshot.version}`,
      },
      nextState,
    };
  }

  const lockError = ensureActorOwnsTouchedResources(nextState.locks, mutation);
  if (lockError) {
    return {
      result: {
        ok: false,
        staleReason: lockError,
      },
      nextState,
    };
  }

  const patchedEntries = mutateEntries(nextState.snapshot.entries, mutation);
  const validation = validateTimetable({
    ...nextState.snapshot,
    entries: patchedEntries,
  });
  const touchedSlots = new Set(mutation.patches.map((patch) => `${patch.day}:${patch.period}`));
  const blockingConflicts = validation.conflicts.filter(
    (conflict) =>
      ((conflict.code === "TEACHER_DOUBLE_BOOKED" ||
        conflict.code === "ROOM_DOUBLE_BOOKED" ||
        conflict.code === "SECTION_WHOLE_CLASS_COLLISION" ||
        conflict.code === "SECTION_GROUP_OVERLAP") &&
      conflict.day &&
      conflict.period &&
      touchedSlots.has(`${conflict.day}:${conflict.period}`)),
  );

  if (blockingConflicts.length > 0) {
    return {
      result: {
        ok: false,
        conflicts: blockingConflicts,
        staleReason: "พบการชนกันของครู ห้อง หรือชั้นเรียนใน slot ที่กำลังแก้ไข",
      },
      nextState,
    };
  }

  const nextVersion = nextState.snapshot.version + 1;
  const changeEvent: TimetableChangeEvent = {
    id: `evt-${mutation.timetableId}-${nextVersion}`,
    timetableId: mutation.timetableId,
    actorUserId: mutation.actorUserId,
    actorDisplayName: mutation.actorDisplayName,
    eventType: mutation.patches.length > 1 ? "ENTRY_UPDATED" : inferEventType(mutation),
    baseVersion: mutation.baseVersion,
    nextVersion,
    payload: {
      reason: mutation.reason,
      patches: mutation.patches,
    },
    createdAt: now.toISOString(),
  };

  return {
    result: {
      ok: true,
      nextVersion,
      entries: patchedEntries,
      conflicts: validation.conflicts,
    },
    nextState: {
      ...nextState,
      snapshot: {
        ...nextState.snapshot,
        version: nextVersion,
        entries: patchedEntries,
      },
      events: nextState.events.concat(changeEvent),
    },
  };
}

function pruneExpiredPresences(presences: TimetablePresence[], now: Date): TimetablePresence[] {
  return presences.filter((presence) => new Date(presence.expiresAt).getTime() > now.getTime());
}

function pruneExpiredLocks(locks: TimetableSlotLock[], now: Date): TimetableSlotLock[] {
  return locks.filter((lock) => new Date(lock.expiresAt).getTime() > now.getTime());
}

function ensureActorOwnsTouchedResources(locks: TimetableSlotLock[], mutation: TimetableMutationRequest): string | null {
  const touched = mutation.patches.flatMap((patch) => [
    toLockKey("SECTION", patch.sectionId, patch.day, patch.period),
    toLockKey("INSTRUCTIONAL_GROUP", patch.instructionalGroupId, patch.day, patch.period),
    toLockKey("ROOM", patch.roomId, patch.day, patch.period),
    ...patch.teachers.map((teacher) => toLockKey("TEACHER", teacher.teacherId, patch.day, patch.period)),
  ]);
  const actorLockIds = new Set(locks.filter((lock) => lock.userId === mutation.actorUserId).map((lock) => lock.id));

  const ownedLocks = new Set(
    locks
      .filter((lock) => lock.userId === mutation.actorUserId)
      .map((lock) => toLockKey(lock.resourceType, lock.resourceId, lock.day, lock.period)),
  );
  const conflictingLock = locks.find(
    (lock) =>
      lock.userId !== mutation.actorUserId &&
      touched.includes(toLockKey(lock.resourceType, lock.resourceId, lock.day, lock.period)),
  );

  if (conflictingLock) {
    return `slot ที่กำลังแก้ไขถูกล็อกโดย ${conflictingLock.displayName}`;
  }

  if (!mutation.expectedLockIds || mutation.expectedLockIds.length === 0) {
    return "ต้อง claim lock ก่อนบันทึกการแก้ไข";
  }

  const missingLockId = mutation.expectedLockIds.some((lockId) => !actorLockIds.has(lockId));
  if (missingLockId) {
    return "lock ที่ส่งมาไม่อยู่ในการครอบครองของผู้ใช้หรือหมดอายุแล้ว";
  }

  const missingOwnership = touched.some((key) => !ownedLocks.has(key));
  return missingOwnership ? "ผู้ใช้ยังไม่ได้ถือ lock ครบทุก resource ที่แก้ไข" : null;
}

function mutateEntries(entries: TimetableEntry[], mutation: TimetableMutationRequest): TimetableEntry[] {
  let nextEntries = [...entries];

  for (const patch of mutation.patches) {
    if (patch.remove) {
      nextEntries = nextEntries.filter((entry) => entry.id !== patch.id);
      continue;
    }

    const targetIndex = nextEntries.findIndex(
      (entry) =>
        entry.id === patch.id ||
        (!patch.id &&
          entry.sectionId === patch.sectionId &&
          entry.instructionalGroupId === patch.instructionalGroupId &&
          entry.day === patch.day &&
          entry.period === patch.period),
    );
    const baseEntry: TimetableEntry = {
      id: patch.id ?? `entry-${mutation.timetableId}-${patch.sectionId}-${patch.day}-${patch.period}`,
      timetableId: mutation.timetableId,
      enrollmentId: patch.enrollmentId,
      instructionalGroupId: patch.instructionalGroupId,
      sectionId: patch.sectionId,
      subjectId: patch.subjectId,
      deliveryMode: patch.deliveryMode,
      studentGroupKey: patch.studentGroupKey,
      roomId: patch.roomId,
      day: patch.day,
      period: patch.period,
      teachers: patch.teachers,
      revision: 1,
      updatedByUserId: mutation.actorUserId,
    };

    if (targetIndex === -1) {
      nextEntries.push(baseEntry);
      continue;
    }

    const current = nextEntries[targetIndex];
    nextEntries[targetIndex] = {
      ...current,
      ...baseEntry,
      revision: (current.revision ?? 1) + 1,
      updatedByUserId: mutation.actorUserId,
    };
  }

  return nextEntries;
}

function toLockKey(resourceType: SlotResourceType, resourceId: string, day: Weekday, period: number): string {
  return `${resourceType}:${resourceId}:${day}:${period}`;
}

function inferEventType(mutation: TimetableMutationRequest): TimetableChangeEvent["eventType"] {
  const [patch] = mutation.patches;
  if (patch?.remove) {
    return "ENTRY_DELETED";
  }

  return patch?.id ? "ENTRY_UPDATED" : "ENTRY_CREATED";
}
