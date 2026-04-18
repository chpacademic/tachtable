const {
  DAY_LABELS,
  DELIVERY_MODE_LABELS,
  EDUCATION_LEVEL_LABELS,
  TEACHING_ROLE_LABELS,
} = require("./constants");

function escapeCell(cell) {
  const value = String(cell);
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

function buildTimetableCsv(params) {
  const sectionMap = new Map(params.sections.map((item) => [item.id, item]));
  const subjectMap = new Map(params.subjects.map((item) => [item.id, item]));
  const teacherMap = new Map(params.teachers.map((item) => [item.id, item]));
  const roomMap = new Map(params.rooms.map((item) => [item.id, item]));

  const rows = [
    ["วัน", "คาบ", "ระดับชั้น", "ห้องเรียน", "กลุ่มผู้เรียน", "รูปแบบการสอน", "รหัสวิชา", "ชื่อวิชา", "ครูผู้สอน", "ห้อง"],
  ];

  for (const entry of params.entries) {
    const section = sectionMap.get(entry.sectionId);
    const subject = subjectMap.get(entry.subjectId);
    const room = roomMap.get(entry.roomId);
    const teacherNames = entry.teachers
      .map((assignment) => {
        const teacher = teacherMap.get(assignment.teacherId);
        const label = teacher?.fullName || assignment.teacherId;
        return `${label} (${TEACHING_ROLE_LABELS[assignment.teachingRole] || assignment.teachingRole})`;
      })
      .join(" | ");

    rows.push([
      DAY_LABELS[entry.day] || entry.day,
      entry.period,
      EDUCATION_LEVEL_LABELS[section?.educationLevel] || section?.educationLevel || "-",
      section ? `${section.grade}/${section.roomName}` : "-",
      entry.studentGroupKey,
      DELIVERY_MODE_LABELS[entry.deliveryMode] || entry.deliveryMode,
      subject?.subjectCode || "-",
      subject?.name || "-",
      teacherNames || "-",
      room?.name || entry.roomId,
    ]);
  }

  return rowsToCsv(rows);
}

module.exports = {
  rowsToCsv,
  buildTimetableCsv,
};
