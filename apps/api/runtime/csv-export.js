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
    ["Day", "Period", "Level", "Classroom", "Student Group", "Delivery Mode", "Subject Code", "Subject Name", "Teachers", "Room"],
  ];

  for (const entry of params.entries) {
    const section = sectionMap.get(entry.sectionId);
    const subject = subjectMap.get(entry.subjectId);
    const room = roomMap.get(entry.roomId);
    const teacherNames = entry.teachers
      .map((assignment) => {
        const teacher = teacherMap.get(assignment.teacherId);
        const label = teacher?.fullName || assignment.teacherId;
        return `${label} (${assignment.teachingRole})`;
      })
      .join(" | ");

    rows.push([
      entry.day,
      entry.period,
      section?.educationLevel || "-",
      section ? `${section.grade}/${section.roomName}` : "-",
      entry.studentGroupKey,
      entry.deliveryMode,
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
