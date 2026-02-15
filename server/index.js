import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from "./db.js";
import { login, signup, signToken, verifyToken } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:8080", credentials: true }));
app.use(express.json({ limit: "10mb" }));

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  req.user = token ? verifyToken(token) : null;
  next();
}

// Auth: login (Supabase-compatible format)
app.post("/auth/v1/token", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "invalid_request", message: "Email and password required" });
  }
  const user = await login(email, password);
  if (!user) {
    return res.status(400).json({ error: "invalid_grant", message: "Invalid login credentials" });
  }
  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    access_token: token,
    token_type: "bearer",
    expires_in: 604800,
    user: { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } },
  });
});

// Auth: signup
app.post("/auth/v1/signup", async (req, res) => {
  const { email, password, data } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "invalid_request", message: "Email and password required" });
  }
  const result = await signup(email, password, data?.full_name);
  if (result.error) {
    return res.status(400).json({ error: "signup_failed", message: result.error });
  }
  const token = signToken({ sub: result.id, email: result.email });
  res.json({
    access_token: token,
    token_type: "bearer",
    user: { id: result.id, email: result.email, user_metadata: { full_name: result.full_name } },
  });
});

// Auth: get session (Supabase format)
app.get("/auth/v1/user", authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  res.json({ id: req.user.sub, email: req.user.email, aud: "authenticated" });
});

// Auth: sign out (no-op, client clears token)
app.post("/auth/v1/logout", (req, res) => res.status(204).send());

// Rest API: query builder - POST /rest/v1/:table for select/insert/update/upsert
const ALLOWED_TABLES = new Set([
  "profiles", "user_roles", "departments", "programs", "courses", "course_schedules", "enrollments", "grades",
  "fee_structures", "invoices", "payments", "fee_component_types", "fee_structure_definitions", "fee_structure_components",
  "fee_concessions", "admission_categories", "scholarship_schemes", "scholarship_applications", "fee_concession_applications",
  "scholarship_reimbursement_claims", "scholarship_disbursements", "payment_receipts", "academic_years", "batches",
  "sections", "semesters", "assessment_component_types", "assessment_component_definitions", "assessment_component_marks",
  "exam_types", "exams", "exam_schedules", "exam_halls", "grading_scales", "institution_settings", "curriculum_subjects",
  "programme_outcomes", "programme_specific_outcomes", "course_outcomes", "co_po_mapping", "co_pso_mapping",
  "assessment_co_mapping", "co_attainment", "po_attainment", "cbcs_credit_structure", "credit_transfers", "mooc_credits",
  "student_credit_summary", "question_bank_questions", "question_paper_blueprints", "question_paper_sets",
  "question_paper_set_questions", "online_tests", "online_test_questions", "online_test_attempts", "online_test_answers",
  "lesson_plans", "lesson_plan_weeks", "lms_modules", "lms_content", "lms_live_sessions", "lms_assignments",
  "lms_assignment_submissions", "lms_discussions", "lms_messages", "lms_progress", "lms_badges", "lms_student_badges",
  "lms_student_points", "student_backlogs", "timetable_entries", "attendance_records", "regulations",
  "faculty_workload_assignments", "revaluation_windows", "revaluation_applications", "malpractice_cases",
  "improvement_betterment_rules", "improvement_betterment_registrations", "genders", "admissions",
]);

function safeTable(name) {
  if (!ALLOWED_TABLES.has(name)) throw new Error("Table not allowed");
  return name;
}

app.all("/rest/v1/:table", authMiddleware, async (req, res) => {
  try {
    const table = safeTable(req.params.table);
    const prefer = req.headers["prefer"] || "";
    const selectParam = req.query.select || "*";

    if (req.method === "GET") {
      const filters = [];
      const params = [];
      let idx = 1;
      const orParts = [];
      for (const [k, v] of Object.entries(req.query)) {
        if (k === "select" || k === "order" || k === "limit" || k === "offset") continue;
        if (k === "or") {
          const parts = String(v).split(",").map((p) => p.trim());
          for (const p of parts) {
            const mm = p.match(/^(\w+)\.eq\.(.+)$/);
            if (mm) { orParts.push(`${mm[1]} = $${idx}`); params.push(mm[2]); idx++; }
          }
          continue;
        }
        const m = k.match(/^(.+)\.(eq|neq|gt|gte|lt|lte|in|is)$/);
        if (m) {
          const [, col, op] = m;
          if (op === "eq") { filters.push(`${col} = $${idx}`); params.push(v); idx++; }
          else if (op === "neq") { filters.push(`${col} != $${idx}`); params.push(v); idx++; }
          else if (op === "in") { const arr = String(v).split(","); filters.push(`${col} = ANY($${idx}::text[])`); params.push(arr); idx++; }
          else if (op === "is") { filters.push(`${col} IS NULL`); }
          else if (op === "gte") { filters.push(`${col} >= $${idx}`); params.push(v); idx++; }
          else if (op === "lte") { filters.push(`${col} <= $${idx}`); params.push(v); idx++; }
        }
      }
      if (orParts.length) filters.push("(" + orParts.join(" OR ") + ")");
      const order = req.query.order;
      const limit = req.query.limit || "1000";
      const offset = req.query.offset || "0";
      let sql = `SELECT * FROM public.${table}`;
      if (filters.length) sql += " WHERE " + filters.join(" AND ");
      if (order) {
        const [col, dir] = order.split(".");
        sql += ` ORDER BY ${col} ${dir === "asc" ? "ASC" : "DESC"}`;
      }
      sql += ` LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;
      const { rows } = await query(sql, params, { userId: req.user?.sub });
      res.setHeader("Content-Range", `${table} 0-${rows.length - 1}/${rows.length}`);
      return res.json(rows);
    }

    if (req.method === "POST") {
      const body = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      for (const row of body) {
        const cols = Object.keys(row).filter((k) => row[k] !== undefined);
        const vals = cols.map((c) => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const sql = `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`;
        const { rows: ins } = await query(sql, vals, { userId: req.user?.sub });
        results.push(ins[0]);
      }
      const single = prefer.includes("return=representation");
      return res.status(201).json(single && results.length === 1 ? results[0] : results);
    }

    if (req.method === "PATCH") {
      const filters = [];
      const params = [];
      let idx = 1;
      for (const [k, v] of Object.entries(req.query)) {
        if (k === "select") continue;
        const m = k.match(/^(.+)\.(eq|in)$/);
        if (m) {
          const [, col, op] = m;
          if (op === "eq") { filters.push(`${col} = $${idx}`); params.push(v); idx++; }
          else if (op === "in") { const arr = v.split(","); filters.push(`${col} = ANY($${idx}::text[])`); params.push(arr); idx++; }
        }
      }
      const updates = Object.entries(req.body).filter(([, v]) => v !== undefined);
      if (!updates.length) return res.json([]);
      const setClause = updates.map(([c], i) => `${c} = $${idx + i}`).join(", ");
      params.push(...updates.map(([, v]) => v));
      const sql = `UPDATE public.${table} SET ${setClause} WHERE ${filters.length ? filters.join(" AND ") : "true"} RETURNING *`;
      const { rows } = await query(sql, params, { userId: req.user?.sub });
      return res.json(rows);
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RPC - param order must match PostgreSQL function signature
const RPC_PARAM_ORDER = {
  record_payment: ["p_invoice_id", "p_amount", "p_payment_method", "p_transaction_id", "p_reference_number", "p_bank_name", "p_cheque_dd_number", "p_cheque_dd_date", "p_upi_transaction_id", "p_remarks"],
  add_late_fee: ["p_invoice_id", "p_late_fee_amount"],
  submit_scholarship_application: ["p_app_id"],
  review_scholarship_application: ["p_app_id", "p_status", "p_amount", "p_percent", "p_remarks"],
  submit_concession_application: ["p_app_id"],
  approve_concession_application: ["p_app_id", "p_remarks"],
  reject_concession_application: ["p_app_id", "p_remarks"],
  assign_fee_to_student: ["p_student_id", "p_semester", "p_academic_year_id"],
  approve_question_bank_question: ["p_question_id", "p_status", "p_remarks"],
  start_online_test_attempt: ["p_test_id"],
  update_lesson_plan_progress: ["p_lesson_plan_id"],
  approve_credit_transfer: ["p_transfer_id", "p_status", "p_remarks"],
  approve_mooc_credit: ["p_mooc_id", "p_status", "p_remarks"],
  sync_student_credits: ["p_student_id"],
  compute_co_attainment: ["p_course_id", "p_semester_text", "p_academic_year_id"],
};

app.post("/rest/v1/rpc/:fn", authMiddleware, async (req, res) => {
  try {
    const fn = req.params.fn;
    const params = req.body || {};
    const order = RPC_PARAM_ORDER[fn];
    if (!order) return res.status(404).json({ error: "RPC not found" });
    const p = order.map((k) => params[k]);
    const sql = `SELECT ${fn}(${p.map((_, i) => `$${i + 1}`).join(", ")}) AS result`;
    const { rows } = await query(sql, p, { userId: req.user?.sub });
    const val = rows[0]?.result;
    res.json(val);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Storage upload (simple file save)
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}
const upload = multer({ dest: uploadDir });
app.post("/storage/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const relPath = (req.body.path || req.file.originalname).replace(/\.\./g, "");
  const dest = path.join(uploadDir, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(req.file.path, dest);
  res.json({ path: relPath, url: `/storage/${relPath}` });
});
app.use("/storage", express.static(uploadDir));

// Health
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Campus Connect API on http://localhost:${PORT}`);
});
