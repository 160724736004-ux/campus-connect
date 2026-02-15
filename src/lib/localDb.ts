/**
 * Offline IndexedDB database - mirrors Supabase tables.
 * Use when Supabase server is not available (VITE_USE_OFFLINE_DB=true).
 */
import Dexie, { type EntityTable } from "dexie";

// All tables as generic record types for flexibility
export interface LocalRecord {
  id: string;
  [key: string]: unknown;
}

export class CampusConnectDB extends Dexie {
  // Core
  profiles!: Dexie.Table<LocalRecord, string>;
  user_roles!: Dexie.Table<LocalRecord, string>;
  departments!: Dexie.Table<LocalRecord, string>;
  programs!: Dexie.Table<LocalRecord, string>;
  institution_settings!: Dexie.Table<LocalRecord, string>;
  academic_years!: Dexie.Table<LocalRecord, string>;
  semesters!: Dexie.Table<LocalRecord, string>;
  batches!: Dexie.Table<LocalRecord, string>;
  sections!: Dexie.Table<LocalRecord, string>;
  courses!: Dexie.Table<LocalRecord, string>;
  course_schedules!: Dexie.Table<LocalRecord, string>;
  enrollments!: Dexie.Table<LocalRecord, string>;
  grades!: Dexie.Table<LocalRecord, string>;

  // Fees & finance
  fee_structures!: Dexie.Table<LocalRecord, string>;
  invoices!: Dexie.Table<LocalRecord, string>;
  payments!: Dexie.Table<LocalRecord, string>;
  fee_component_types!: Dexie.Table<LocalRecord, string>;
  fee_structure_definitions!: Dexie.Table<LocalRecord, string>;
  fee_structure_components!: Dexie.Table<LocalRecord, string>;
  fee_concessions!: Dexie.Table<LocalRecord, string>;
  admission_categories!: Dexie.Table<LocalRecord, string>;
  scholarship_schemes!: Dexie.Table<LocalRecord, string>;
  scholarship_applications!: Dexie.Table<LocalRecord, string>;
  fee_concession_applications!: Dexie.Table<LocalRecord, string>;
  scholarship_reimbursement_claims!: Dexie.Table<LocalRecord, string>;
  scholarship_disbursements!: Dexie.Table<LocalRecord, string>;
  payment_receipts!: Dexie.Table<LocalRecord, string>;

  // Assessment & exams
  assessment_component_types!: Dexie.Table<LocalRecord, string>;
  assessment_component_definitions!: Dexie.Table<LocalRecord, string>;
  assessment_component_marks!: Dexie.Table<LocalRecord, string>;
  exam_types!: Dexie.Table<LocalRecord, string>;
  exams!: Dexie.Table<LocalRecord, string>;
  exam_schedules!: Dexie.Table<LocalRecord, string>;
  exam_halls!: Dexie.Table<LocalRecord, string>;
  grading_scales!: Dexie.Table<LocalRecord, string>;

  // OBE / CBCS
  programme_outcomes!: Dexie.Table<LocalRecord, string>;
  programme_specific_outcomes!: Dexie.Table<LocalRecord, string>;
  course_outcomes!: Dexie.Table<LocalRecord, string>;
  co_po_mapping!: Dexie.Table<LocalRecord, string>;
  co_pso_mapping!: Dexie.Table<LocalRecord, string>;
  assessment_co_mapping!: Dexie.Table<LocalRecord, string>;
  co_attainment!: Dexie.Table<LocalRecord, string>;
  po_attainment!: Dexie.Table<LocalRecord, string>;
  cbcs_credit_structure!: Dexie.Table<LocalRecord, string>;
  credit_transfers!: Dexie.Table<LocalRecord, string>;
  mooc_credits!: Dexie.Table<LocalRecord, string>;
  student_credit_summary!: Dexie.Table<LocalRecord, string>;

  // Question bank & online exam
  question_bank_questions!: Dexie.Table<LocalRecord, string>;
  question_paper_blueprints!: Dexie.Table<LocalRecord, string>;
  question_paper_sets!: Dexie.Table<LocalRecord, string>;
  question_paper_set_questions!: Dexie.Table<LocalRecord, string>;
  online_tests!: Dexie.Table<LocalRecord, string>;
  online_test_questions!: Dexie.Table<LocalRecord, string>;
  online_test_attempts!: Dexie.Table<LocalRecord, string>;
  online_test_answers!: Dexie.Table<LocalRecord, string>;

  // Lesson plan
  lesson_plans!: Dexie.Table<LocalRecord, string>;
  lesson_plan_weeks!: Dexie.Table<LocalRecord, string>;

  // LMS
  lms_modules!: Dexie.Table<LocalRecord, string>;
  lms_content!: Dexie.Table<LocalRecord, string>;
  lms_live_sessions!: Dexie.Table<LocalRecord, string>;
  lms_assignments!: Dexie.Table<LocalRecord, string>;
  lms_assignment_submissions!: Dexie.Table<LocalRecord, string>;
  lms_discussions!: Dexie.Table<LocalRecord, string>;
  lms_messages!: Dexie.Table<LocalRecord, string>;
  lms_progress!: Dexie.Table<LocalRecord, string>;
  lms_badges!: Dexie.Table<LocalRecord, string>;
  lms_student_badges!: Dexie.Table<LocalRecord, string>;
  lms_student_points!: Dexie.Table<LocalRecord, string>;

  // Misc
  student_backlogs!: Dexie.Table<LocalRecord, string>;
  curriculum_subjects!: Dexie.Table<LocalRecord, string>;
  timetable_entries!: Dexie.Table<LocalRecord, string>;
  attendance_records!: Dexie.Table<LocalRecord, string>;
  regulations!: Dexie.Table<LocalRecord, string>;
  faculty_workload_assignments!: Dexie.Table<LocalRecord, string>;

  constructor() {
    super("CampusConnectOffline");
    this.version(1).stores({
      profiles: "id, email, full_name",
      user_roles: "id, user_id, role",
      departments: "id",
      programs: "id",
      institution_settings: "id",
      academic_years: "id",
      semesters: "id",
      batches: "id",
      sections: "id",
      courses: "id, code, department_id",
      course_schedules: "id, course_id",
      enrollments: "id, student_id, course_id",
      grades: "id, enrollment_id",
      fee_structures: "id",
      invoices: "id, student_id",
      payments: "id, invoice_id",
      fee_component_types: "id",
      fee_structure_definitions: "id",
      fee_structure_components: "id",
      fee_concessions: "id",
      admission_categories: "id",
      scholarship_schemes: "id",
      scholarship_applications: "id",
      fee_concession_applications: "id",
      scholarship_reimbursement_claims: "id",
      scholarship_disbursements: "id",
      payment_receipts: "id",
      assessment_component_types: "id",
      assessment_component_definitions: "id",
      assessment_component_marks: "id",
      exam_types: "id",
      exams: "id",
      exam_schedules: "id",
      exam_halls: "id",
      grading_scales: "id",
      programme_outcomes: "id",
      programme_specific_outcomes: "id",
      course_outcomes: "id",
      co_po_mapping: "id",
      co_pso_mapping: "id",
      assessment_co_mapping: "id",
      co_attainment: "id",
      po_attainment: "id",
      cbcs_credit_structure: "id",
      credit_transfers: "id",
      mooc_credits: "id",
      student_credit_summary: "id",
      question_bank_questions: "id",
      question_paper_blueprints: "id",
      question_paper_sets: "id",
      question_paper_set_questions: "id",
      online_tests: "id",
      online_test_questions: "id",
      online_test_attempts: "id",
      online_test_answers: "id",
      lesson_plans: "id",
      lesson_plan_weeks: "id",
      lms_modules: "id",
      lms_content: "id",
      lms_live_sessions: "id",
      lms_assignments: "id",
      lms_assignment_submissions: "id",
      lms_discussions: "id",
      lms_messages: "id",
      lms_progress: "id",
      lms_badges: "id",
      lms_student_badges: "id",
      lms_student_points: "id",
      student_backlogs: "id",
      curriculum_subjects: "id",
      timetable_entries: "id",
      attendance_records: "id",
      regulations: "id",
      faculty_workload_assignments: "id",
    });
  }
}

export const localDb = new CampusConnectDB();

// Table name mapping (Supabase uses snake_case)
const TABLE_MAP: Record<string, keyof CampusConnectDB> = {
  profiles: "profiles",
  user_roles: "user_roles",
  departments: "departments",
  programs: "programs",
  institution_settings: "institution_settings",
  academic_years: "academic_years",
  semesters: "semesters",
  batches: "batches",
  sections: "sections",
  courses: "courses",
  course_schedules: "course_schedules",
  enrollments: "enrollments",
  grades: "grades",
  fee_structures: "fee_structures",
  invoices: "invoices",
  payments: "payments",
  fee_component_types: "fee_component_types",
  fee_structure_definitions: "fee_structure_definitions",
  fee_structure_components: "fee_structure_components",
  fee_concessions: "fee_concessions",
  admission_categories: "admission_categories",
  scholarship_schemes: "scholarship_schemes",
  scholarship_applications: "scholarship_applications",
  fee_concession_applications: "fee_concession_applications",
  scholarship_reimbursement_claims: "scholarship_reimbursement_claims",
  scholarship_disbursements: "scholarship_disbursements",
  payment_receipts: "payment_receipts",
  assessment_component_types: "assessment_component_types",
  assessment_component_definitions: "assessment_component_definitions",
  assessment_component_marks: "assessment_component_marks",
  exam_types: "exam_types",
  exams: "exams",
  exam_schedules: "exam_schedules",
  exam_halls: "exam_halls",
  grading_scales: "grading_scales",
  programme_outcomes: "programme_outcomes",
  programme_specific_outcomes: "programme_specific_outcomes",
  course_outcomes: "course_outcomes",
  co_po_mapping: "co_po_mapping",
  co_pso_mapping: "co_pso_mapping",
  assessment_co_mapping: "assessment_co_mapping",
  co_attainment: "co_attainment",
  po_attainment: "po_attainment",
  cbcs_credit_structure: "cbcs_credit_structure",
  credit_transfers: "credit_transfers",
  mooc_credits: "mooc_credits",
  student_credit_summary: "student_credit_summary",
  question_bank_questions: "question_bank_questions",
  question_paper_blueprints: "question_paper_blueprints",
  question_paper_sets: "question_paper_sets",
  question_paper_set_questions: "question_paper_set_questions",
  online_tests: "online_tests",
  online_test_questions: "online_test_questions",
  online_test_attempts: "online_test_attempts",
  online_test_answers: "online_test_answers",
  lesson_plans: "lesson_plans",
  lesson_plan_weeks: "lesson_plan_weeks",
  lms_modules: "lms_modules",
  lms_content: "lms_content",
  lms_live_sessions: "lms_live_sessions",
  lms_assignments: "lms_assignments",
  lms_assignment_submissions: "lms_assignment_submissions",
  lms_discussions: "lms_discussions",
  lms_messages: "lms_messages",
  lms_progress: "lms_progress",
  lms_badges: "lms_badges",
  lms_student_badges: "lms_student_badges",
  lms_student_points: "lms_student_points",
  student_backlogs: "student_backlogs",
  curriculum_subjects: "curriculum_subjects",
  timetable_entries: "timetable_entries",
  attendance_records: "attendance_records",
  regulations: "regulations",
  faculty_workload_assignments: "faculty_workload_assignments",
};

export function getTable(tableName: string): Dexie.Table<LocalRecord, string> | null {
  const key = TABLE_MAP[tableName];
  if (!key) return null;
  const tbl = (localDb as any)[key];
  return tbl && typeof tbl?.toArray === "function" ? tbl : null;
}
