/**
 * Seed data for offline database - demo institution, admin, courses, etc.
 */
import { localDb } from "./localDb";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function seedOfflineDatabase() {
  const db = localDb;

  // Check if already seeded
  const profCount = await db.profiles.count();
  if (profCount > 0) return;

  const adminId = uuid();
  const hodId = uuid();
  const facultyId = uuid();
  const studentId = uuid();
  const deptId = uuid();
  const progId = uuid();
  const batchId = uuid();
  const courseId1 = uuid();
  const courseId2 = uuid();
  const yearId = uuid();
  const semId = uuid();

  await db.profiles.bulkAdd([
    { id: adminId, email: "admin@campus.local", full_name: "Admin User", department_id: deptId, created_at: new Date().toISOString() },
    { id: hodId, email: "hod@campus.local", full_name: "HOD User", department_id: deptId, created_at: new Date().toISOString() },
    { id: facultyId, email: "faculty@campus.local", full_name: "Faculty User", department_id: deptId, created_at: new Date().toISOString() },
    { id: studentId, email: "student@campus.local", full_name: "Student User", department_id: null, program_id: progId, created_at: new Date().toISOString() },
  ]);

  await db.user_roles.bulkAdd([
    { id: uuid(), user_id: adminId, role: "admin" },
    { id: uuid(), user_id: hodId, role: "hod" },
    { id: uuid(), user_id: facultyId, role: "faculty" },
    { id: uuid(), user_id: studentId, role: "student" },
  ]);

  try { await db.institution_settings.add({ id: uuid(), key: "name", value: "Campus Connect (Offline)" }); } catch {}
  await db.academic_years.add({ id: yearId, name: "2024-25", start_date: "2024-07-01", end_date: "2025-06-30", is_current: true });
  await db.departments.add({ id: deptId, name: "Computer Science", code: "CSE", status: "active" });
  await db.programs.add({ id: progId, name: "B.Tech CSE", code: "BTCSE", department_id: deptId, total_credits: 160, status: "active" });
  await db.batches.add({ id: batchId, name: "2024", program_id: progId, admission_year: 2024, passout_year: 2028, total_intake: 60, current_year: 1, status: "active" });
  await db.semesters.add({ id: semId, name: "Semester 1", semester_number: 1 });
  await db.admission_categories.add({ id: uuid(), name: "General", code: "GEN" });
  await db.courses.bulkAdd([
    { id: courseId1, code: "CS101", title: "Introduction to Programming", credits: 3, department_id: deptId, semester: "Odd 2024-25" },
    { id: courseId2, code: "CS102", title: "Data Structures", credits: 4, department_id: deptId, semester: "Odd 2024-25" },
  ]);
  await db.grading_scales.add({ id: uuid(), name: "Default", min_percentage: 0, max_percentage: 100 });
  await db.fee_component_types.add({ id: uuid(), code: "TUITION", name: "Tuition", sort_order: 1 });
  await db.fee_structure_definitions.add({ id: uuid(), name: "Default Fee", academic_year_id: yearId, program_id: progId, batch_id: batchId, is_active: true });

  await db.enrollments.add({ id: uuid(), student_id: studentId, course_id: courseId1, semester: "Odd 2024-25", status: "enrolled" });

  await db.assessment_component_types.add({ id: uuid(), name: "Internal", code: "INT" });
  await db.assessment_component_types.add({ id: uuid(), name: "External", code: "EXT" });
}
