import type {
  TimetableChangeEvent,
  TimetableMutationRequest,
  TimetablePresence,
  TimetableSlotLock,
} from "../domain/models";

export type CollaborationEventName =
  | "presence.snapshot"
  | "presence.updated"
  | "lock.claimed"
  | "lock.released"
  | "timetable.changed"
  | "validation.updated";

export interface PresenceSnapshotEvent {
  type: "presence.snapshot";
  presences: TimetablePresence[];
  locks: TimetableSlotLock[];
}

export interface PresenceUpdatedEvent {
  type: "presence.updated";
  presence: TimetablePresence;
}

export interface LockClaimedEvent {
  type: "lock.claimed";
  lock: TimetableSlotLock;
}

export interface LockReleasedEvent {
  type: "lock.released";
  lockId: string;
  userId: string;
}

export interface TimetableChangedEvent {
  type: "timetable.changed";
  event: TimetableChangeEvent;
  version: number;
}

export interface ValidationUpdatedEvent {
  type: "validation.updated";
  version: number;
  conflictCount: number;
}

export type CollaborationServerEvent =
  | PresenceSnapshotEvent
  | PresenceUpdatedEvent
  | LockClaimedEvent
  | LockReleasedEvent
  | TimetableChangedEvent
  | ValidationUpdatedEvent;

export interface JoinCollaborationRequest {
  timetableId: string;
  userId: string;
  displayName: string;
  currentView?: string;
  selectedSectionId?: string;
  selectedTeacherId?: string;
}

export type TimetableMutationMessage = TimetableMutationRequest;
