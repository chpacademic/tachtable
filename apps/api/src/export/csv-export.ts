import type { ClassSection, Subject, TeacherProfile, TimetableEntry } from "../domain/models";

function escapeCell(cell: string | number): string {
  const value = String(cell);
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function rowsToCsv(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

export function buildTimetableCsv(params: {
  entries: TimetableEntry[];
  sections: ClassSection[];
  subjects: Subject[];
  teachers: TeacherProfile[];
}): string {
  const sectionMap = new Map(params.sections.map((item) => [item.id, item]));
  const subjectMap = new Map(params.subjects.map((item) => [item.id, item]));
  const teacherMap = new Map(params.teachers.map((item) => [item.id, item]));

  const rows: Array<Array<string | number>> = [
    ["Day", "Period", "Level", "Classroom", "Student Group", "Delivery Mode", "Subject Code", "Subject Name", "Teachers", "Room ID"],
  ];

  for (const entry of params.entries) {
    const section = sectionMap.get(entry.sectionId);
    const subject = subjectMap.get(entry.subjectId);
    const teacherNames = entry.teachers
      .map((assignment) => {
        const teacher = teacherMap.get(assignment.teacherId);
        const label = teacher?.fullName ?? assignment.teacherId;
        return `${label} (${assignment.teachingRole})`;
      })
      .join(" | ");

    rows.push([
      entry.day,
      entry.period,
      section?.educationLevel ?? "-",
      section ? `${section.grade}/${section.roomName}` : "-",
      entry.studentGroupKey,
      entry.deliveryMode,
      subject?.subjectCode ?? "-",
      subject?.name ?? "-",
      teacherNames || "-",
      entry.roomId,
    ]);
  }

  return rowsToCsv(rows);
}
