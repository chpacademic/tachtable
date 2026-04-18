const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const PERIODS_PER_DAY = 6;
const PERIODS_PER_WEEK = 30;
const DELIVERY_MODES = ["WHOLE_CLASS", "SPLIT_GROUP", "TEAM_TEACHING", "LARGE_GROUP"];
const TEACHING_ROLES = ["LEAD", "CO_TEACHER", "ASSISTANT", "SUPPORT"];
const EDUCATION_LEVELS = ["PRIMARY", "LOWER_SECONDARY"];
const USER_ROLES = ["ADMIN", "ACADEMIC_MANAGER", "SUBJECT_TEACHER", "HOMEROOM_TEACHER"];

const DAY_LABELS = {
  MON: "วันจันทร์",
  TUE: "วันอังคาร",
  WED: "วันพุธ",
  THU: "วันพฤหัสบดี",
  FRI: "วันศุกร์",
};

const DAY_SHORT_LABELS = {
  MON: "จ.",
  TUE: "อ.",
  WED: "พ.",
  THU: "พฤ.",
  FRI: "ศ.",
};

const DELIVERY_MODE_LABELS = {
  WHOLE_CLASS: "ทั้งห้อง",
  SPLIT_GROUP: "กลุ่มย่อย",
  TEAM_TEACHING: "สอนร่วม",
  LARGE_GROUP: "กลุ่มใหญ่",
};

const TEACHING_ROLE_LABELS = {
  LEAD: "ครูหลัก",
  CO_TEACHER: "ครูร่วม",
  ASSISTANT: "ผู้ช่วยสอน",
  SUPPORT: "สนับสนุน",
};

const EDUCATION_LEVEL_LABELS = {
  PRIMARY: "ประถมศึกษา",
  LOWER_SECONDARY: "มัธยมศึกษาตอนต้น",
};

module.exports = {
  WEEKDAYS,
  PERIODS_PER_DAY,
  PERIODS_PER_WEEK,
  DELIVERY_MODES,
  TEACHING_ROLES,
  EDUCATION_LEVELS,
  USER_ROLES,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  DELIVERY_MODE_LABELS,
  TEACHING_ROLE_LABELS,
  EDUCATION_LEVEL_LABELS,
};
