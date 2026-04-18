export type EducationLevel = "PRIMARY" | "LOWER_SECONDARY";
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type UserRole = "ADMIN" | "ACADEMIC_MANAGER" | "SUBJECT_TEACHER" | "HOMEROOM_TEACHER";
export type PresenceStatus = "ACTIVE" | "IDLE" | "DISCONNECTED";
export type DeliveryMode = "WHOLE_CLASS" | "SPLIT_GROUP" | "TEAM_TEACHING" | "LARGE_GROUP";
export type TeachingRole = "LEAD" | "CO_TEACHER" | "ASSISTANT" | "SUPPORT";
export type TimetableEventType =
  | "ENTRY_CREATED"
  | "ENTRY_UPDATED"
  | "ENTRY_MOVED"
  | "ENTRY_DELETED"
  | "SLOT_LOCKED"
  | "SLOT_RELEASED"
  | "BULK_AUTOSCHEDULE"
  | "VALIDATION_RUN";

export interface TeacherProfile {
  id: string;
  teacherCode: string;
  fullName: string;
  maxPeriodsPerWeek: number;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  specialType?: string;
}

export interface Subject {
  id: string;
  subjectCode: string;
  name: string;
  credits: number;
  weeklyPeriods: number;
  learningArea?: string;
}

export interface ClassSection {
  id: string;
  educationLevel: EducationLevel;
  grade: number;
  roomName: string;
  plannedPeriodsPerWeek: number;
  homeroomTeacherId?: string;
}

export interface Enrollment {
  id: string;
  sectionId: string;
  subjectId: string;
  leadTeacherId?: string;
  requiredPeriodsPerWeek: number;
  preferredRoomId?: string;
  notes?: string;
}

export interface InstructionalGroupTeacherAssignment {
  id: string;
  instructionalGroupId: string;
  teacherId: string;
  teachingRole: TeachingRole;
  loadFactor: number;
}

export interface InstructionalGroup {
  id: string;
  enrollmentId: string;
  groupCode: string;
  displayName: string;
  deliveryMode: DeliveryMode;
  studentGroupKey: string;
  requiredPeriodsPerWeek: number;
  preferredRoomId?: string;
  teachers: InstructionalGroupTeacherAssignment[];
}

export interface TimetableEntryTeacher {
  teacherId: string;
  teachingRole: TeachingRole;
  loadFactor: number;
}

export interface TimetableEntry {
  id: string;
  timetableId: string;
  enrollmentId: string;
  instructionalGroupId: string;
  sectionId: string;
  subjectId: string;
  deliveryMode: DeliveryMode;
  studentGroupKey: string;
  roomId: string;
  day: Weekday;
  period: number;
  teachers: TimetableEntryTeacher[];
  revision?: number;
  updatedByUserId?: string;
}

export type ConflictSeverity = "warning" | "error";

export interface ScheduleConflict {
  code:
    | "TEACHER_DOUBLE_BOOKED"
    | "ROOM_DOUBLE_BOOKED"
    | "SECTION_WHOLE_CLASS_COLLISION"
    | "SECTION_GROUP_OVERLAP"
    | "TEACHER_OVERLOAD"
    | "MISSING_SUBJECT_PERIODS"
    | "MISSING_GROUP_PERIODS"
    | "SECTION_WEEKLY_TOTAL_INVALID"
    | "SECTION_DAILY_TOTAL_INVALID";
  severity: ConflictSeverity;
  message: string;
  entityIds: string[];
  day?: Weekday;
  period?: number;
}

export interface SchedulingDataset {
  teachers: TeacherProfile[];
  rooms: Room[];
  sections: ClassSection[];
  subjects: Subject[];
  enrollments: Enrollment[];
  instructionalGroups: InstructionalGroup[];
  entries: TimetableEntry[];
}

export interface TimetableSnapshot extends SchedulingDataset {
  timetableId: string;
  version: number;
}

export interface TimetablePresence {
  id: string;
  timetableId: string;
  userId: string;
  displayName: string;
  status: PresenceStatus;
  currentView?: string;
  selectedSectionId?: string;
  selectedTeacherId?: string;
  colorToken?: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface TimetableSlotLock {
  id: string;
  timetableId: string;
  userId: string;
  displayName: string;
  resourceType: "SECTION" | "TEACHER" | "ROOM" | "INSTRUCTIONAL_GROUP";
  resourceId: string;
  day: Weekday;
  period: number;
  expiresAt: string;
  note?: string;
}

export interface TimetableChangeEvent {
  id: string;
  timetableId: string;
  actorUserId: string;
  actorDisplayName: string;
  eventType: TimetableEventType;
  baseVersion: number;
  nextVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TimetableEntryPatch {
  id?: string;
  remove?: boolean;
  enrollmentId: string;
  instructionalGroupId: string;
  sectionId: string;
  subjectId: string;
  deliveryMode: DeliveryMode;
  studentGroupKey: string;
  roomId: string;
  day: Weekday;
  period: number;
  teachers: TimetableEntryTeacher[];
}

export interface TimetableMutationRequest {
  actorUserId: string;
  actorDisplayName: string;
  timetableId: string;
  baseVersion: number;
  reason?: string;
  patches: TimetableEntryPatch[];
  expectedLockIds?: string[];
}

export interface TimetableMutationResult {
  ok: boolean;
  nextVersion?: number;
  entries?: TimetableEntry[];
  conflicts?: ScheduleConflict[];
  staleReason?: string;
}

export const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI"];
export const PERIODS_PER_DAY = 6;
export const PERIODS_PER_WEEK = 30;
