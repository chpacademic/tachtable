export interface RouteContract {
  method: "GET" | "POST" | "PATCH";
  path: string;
  description: string;
}

export const timetableRoutes: RouteContract[] = [
  {
    method: "GET",
    path: "/api/dashboard/summary",
    description: "สรุป KPI, completion rate, conflict count และ alert feed",
  },
  {
    method: "GET",
    path: "/api/timetables/:timetableId",
    description: "ดึงตารางพร้อม entry, unresolved list และ conflict ล่าสุด",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/validate",
    description: "ตรวจตารางทั้งฉบับและคืน conflict ที่อธิบายสาเหตุได้",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/validate-slot",
    description: "ตรวจ slot เดียวตอน drag and drop เพื่อแสดงผลแบบ real-time",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/auto-schedule",
    description: "สั่ง heuristic scheduler จัดคาบที่ยังว่างตามเงื่อนไข",
  },
  {
    method: "GET",
    path: "/api/enrollments/:enrollmentId/instructional-groups",
    description: "ดึงกลุ่มการสอนย่อยของรายวิชานั้น เช่น WHOLE, A, B, TEAM",
  },
  {
    method: "POST",
    path: "/api/enrollments/:enrollmentId/instructional-groups",
    description: "สร้างหรือแก้กลุ่มการสอนย่อย พร้อมครูร่วมสอนและ load factor",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/collaboration/join",
    description: "ลงทะเบียนผู้ใช้งานที่กำลังช่วยกันจัดตารางและเปิด presence session",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/collaboration/heartbeat",
    description: "อัปเดต heartbeat, มุมมองที่กำลังแก้ และ cursor context ของผู้ใช้",
  },
  {
    method: "POST",
    path: "/api/timetables/:timetableId/collaboration/locks",
    description: "จอง slot lock รายคาบเพื่อกันการแก้ชนกันในช่วงเวลาสั้น",
  },
  {
    method: "PATCH",
    path: "/api/timetables/:timetableId/mutations",
    description: "บันทึก patch ของตารางพร้อม optimistic concurrency โดยอิง baseVersion",
  },
  {
    method: "GET",
    path: "/api/timetables/:timetableId/activity",
    description: "ดึงประวัติการแก้ไขล่าสุด, active users และ lock ที่ยังไม่หมดอายุ",
  },
  {
    method: "POST",
    path: "/api/exports/timetable-pdf",
    description: "สร้างเอกสาร PDF A4 พร้อมลายเซ็นและข้อมูลโรงเรียน",
  },
  {
    method: "POST",
    path: "/api/exports/timetable-csv",
    description: "ส่งออกข้อมูลตารางเป็น CSV สำหรับ Excel หรือระบบอื่น",
  },
];

export interface ValidateSlotRequest {
  timetableId: string;
  sectionId: string;
  instructionalGroupId: string;
  studentGroupKey: string;
  deliveryMode: "WHOLE_CLASS" | "SPLIT_GROUP" | "TEAM_TEACHING" | "LARGE_GROUP";
  teachers: Array<{
    teacherId: string;
    teachingRole: "LEAD" | "CO_TEACHER" | "ASSISTANT" | "SUPPORT";
    loadFactor: number;
  }>;
  roomId: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
}

export interface AutoScheduleRequest {
  timetableId: string;
  educationLevel?: "PRIMARY" | "LOWER_SECONDARY";
  forceRebuild?: boolean;
}

export interface InstructionalGroupUpsertRequest {
  enrollmentId: string;
  groupCode: string;
  displayName: string;
  deliveryMode: "WHOLE_CLASS" | "SPLIT_GROUP" | "TEAM_TEACHING" | "LARGE_GROUP";
  studentGroupKey: string;
  requiredPeriodsPerWeek: number;
  preferredRoomId?: string;
  teachers: Array<{
    teacherId: string;
    teachingRole: "LEAD" | "CO_TEACHER" | "ASSISTANT" | "SUPPORT";
    loadFactor: number;
  }>;
}

export interface CollaborationJoinRequest {
  timetableId: string;
  userId: string;
  displayName: string;
  currentView?: "section" | "teacher";
  selectedSectionId?: string;
  selectedTeacherId?: string;
}

export interface CollaborationHeartbeatRequest extends CollaborationJoinRequest {}

export interface ClaimSlotLockRequest {
  timetableId: string;
  userId: string;
  displayName: string;
  resourceType: "SECTION" | "TEACHER" | "ROOM" | "INSTRUCTIONAL_GROUP";
  resourceId: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  note?: string;
}

export interface TimetableMutationPatch {
  id?: string;
  remove?: boolean;
  enrollmentId: string;
  instructionalGroupId: string;
  sectionId: string;
  subjectId: string;
  deliveryMode: "WHOLE_CLASS" | "SPLIT_GROUP" | "TEAM_TEACHING" | "LARGE_GROUP";
  studentGroupKey: string;
  roomId: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  teachers: Array<{
    teacherId: string;
    teachingRole: "LEAD" | "CO_TEACHER" | "ASSISTANT" | "SUPPORT";
    loadFactor: number;
  }>;
}

export interface TimetableMutationHttpRequest {
  timetableId: string;
  actorUserId: string;
  actorDisplayName: string;
  baseVersion: number;
  reason?: string;
  expectedLockIds?: string[];
  patches: TimetableMutationPatch[];
}

export interface DashboardSummaryResponse {
  teachers: number;
  rooms: number;
  subjects: number;
  scheduledTimetables: number;
  completionRate: number;
  alerts: Array<{
    severity: "warning" | "error";
    message: string;
  }>;
}

export interface CollaborationActivityResponse {
  version: number;
  activeUsers: Array<{
    userId: string;
    displayName: string;
    currentView?: string;
    selectedSectionId?: string;
    selectedTeacherId?: string;
    lastSeenAt: string;
  }>;
  locks: Array<{
    lockId: string;
    resourceType: "SECTION" | "TEACHER" | "ROOM" | "INSTRUCTIONAL_GROUP";
    resourceId: string;
    day: "MON" | "TUE" | "WED" | "THU" | "FRI";
    period: number;
    displayName: string;
    expiresAt: string;
  }>;
  recentEvents: Array<{
    eventType: string;
    actorDisplayName: string;
    createdAt: string;
  }>;
}
