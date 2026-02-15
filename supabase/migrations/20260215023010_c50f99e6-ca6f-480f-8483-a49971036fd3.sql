
-- =============================================
-- ATTENDANCE MANAGEMENT SYSTEM - Full Schema
-- =============================================

-- 1. Attendance Types (P, A, L, OD, ML, AA, custom)
CREATE TABLE public.attendance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  counts_as_present boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  color text DEFAULT '#6b7280',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance_types" ON public.attendance_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage attendance_types" ON public.attendance_types FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed default attendance types
INSERT INTO public.attendance_types (code, name, counts_as_present, is_default, color, sort_order) VALUES
  ('P', 'Present', true, true, '#16a34a', 1),
  ('A', 'Absent', false, true, '#dc2626', 2),
  ('L', 'Late', true, false, '#d97706', 3),
  ('OD', 'On Duty', true, false, '#2563eb', 4),
  ('ML', 'Medical Leave', false, false, '#7c3aed', 5),
  ('AA', 'Authorized Absence', false, false, '#0891b2', 6);

-- 2. Attendance Configuration (per-program/department/course overrides)
CREATE TABLE public.attendance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  min_attendance_overall numeric NOT NULL DEFAULT 75,
  min_attendance_theory numeric DEFAULT 75,
  min_attendance_lab numeric DEFAULT 75,
  alert_threshold_warning numeric DEFAULT 75,
  alert_threshold_critical numeric DEFAULT 70,
  alert_threshold_danger numeric DEFAULT 65,
  detention_threshold numeric DEFAULT 65,
  condonation_limit_percent numeric DEFAULT 5,
  grace_period_minutes integer DEFAULT 10,
  late_marking_window_minutes integer DEFAULT 15,
  marking_deadline_hours integer DEFAULT 48,
  allow_past_date_days integer DEFAULT 3,
  session_type text NOT NULL DEFAULT 'subject' CHECK (session_type IN ('period', 'session', 'subject')),
  track_theory_lab_separately boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_config UNIQUE NULLS NOT DISTINCT (program_id, department_id, course_id)
);

ALTER TABLE public.attendance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance_config" ON public.attendance_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage attendance_config" ON public.attendance_config FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Attendance Periods/Sessions (for period-wise tracking)
CREATE TABLE public.attendance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  session_label text DEFAULT 'morning' CHECK (session_label IN ('morning', 'afternoon')),
  is_lab_slot boolean DEFAULT false,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance_periods" ON public.attendance_periods FOR SELECT USING (true);
CREATE POLICY "Admins can manage attendance_periods" ON public.attendance_periods FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Extend attendance_records with new fields
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS attendance_type_id uuid REFERENCES public.attendance_types(id),
  ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.attendance_periods(id),
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_theory boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5. Class Sessions (for tracking classes conducted)
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  date date NOT NULL,
  period_id uuid REFERENCES public.attendance_periods(id),
  faculty_id uuid REFERENCES public.profiles(id),
  is_conducted boolean DEFAULT true,
  not_conducted_reason text,
  is_makeup boolean DEFAULT false,
  is_guest_lecture boolean DEFAULT false,
  guest_lecturer_name text,
  is_combined_section boolean DEFAULT false,
  is_divided_batch boolean DEFAULT false,
  is_theory boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view class_sessions" ON public.class_sessions FOR SELECT USING (true);
CREATE POLICY "Admins can manage class_sessions" ON public.class_sessions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can manage own class_sessions" ON public.class_sessions FOR ALL
  USING (has_role(auth.uid(), 'faculty') AND faculty_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'faculty') AND faculty_id = auth.uid());
CREATE POLICY "HODs can manage class_sessions" ON public.class_sessions FOR ALL
  USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- 6. Attendance Condonation
CREATE TABLE public.attendance_condonations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  condone_dates jsonb NOT NULL DEFAULT '[]',
  reason text NOT NULL,
  document_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'faculty_approved', 'class_teacher_approved', 'hod_approved', 'approved', 'rejected', 'partially_approved')),
  faculty_remarks text,
  class_teacher_remarks text,
  hod_remarks text,
  approved_dates jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_condonations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own condonations" ON public.attendance_condonations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert own condonations" ON public.attendance_condonations FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Faculty can view condonations" ON public.attendance_condonations FOR SELECT USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "Faculty can update condonations" ON public.attendance_condonations FOR UPDATE USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "HODs can manage condonations" ON public.attendance_condonations FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Admins can manage condonations" ON public.attendance_condonations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 7. Attendance Corrections
CREATE TABLE public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  original_status text NOT NULL,
  corrected_status text NOT NULL,
  original_type_id uuid REFERENCES public.attendance_types(id),
  corrected_type_id uuid REFERENCES public.attendance_types(id),
  reason text NOT NULL,
  proof_url text,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_bulk boolean DEFAULT false,
  correction_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own corrections" ON public.attendance_corrections FOR SELECT USING (requested_by = auth.uid());
CREATE POLICY "Students can request corrections" ON public.attendance_corrections FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Faculty can view corrections" ON public.attendance_corrections FOR SELECT USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "Faculty can update corrections" ON public.attendance_corrections FOR UPDATE USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "HODs can manage corrections" ON public.attendance_corrections FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Admins can manage corrections" ON public.attendance_corrections FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. Attendance Alerts
CREATE TABLE public.attendance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('shortage', 'warning', 'critical', 'daily_absence', 'weekly_summary', 'pending_marking', 'section_performance')),
  threshold numeric,
  current_percentage numeric,
  message text,
  sent_via jsonb DEFAULT '["in_app"]',
  is_read boolean DEFAULT false,
  recipient_type text DEFAULT 'student' CHECK (recipient_type IN ('student', 'parent', 'faculty', 'hod')),
  parent_phone text,
  parent_email text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own alerts" ON public.attendance_alerts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Faculty can view alerts" ON public.attendance_alerts FOR SELECT USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "HODs can view alerts" ON public.attendance_alerts FOR SELECT USING (has_role(auth.uid(), 'hod'));
CREATE POLICY "Admins can manage alerts" ON public.attendance_alerts FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert alerts" ON public.attendance_alerts FOR INSERT WITH CHECK (true);

-- 9. Trigger for updated_at on attendance tables
CREATE OR REPLACE FUNCTION public.update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_attendance_config_updated_at BEFORE UPDATE ON public.attendance_config FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();
CREATE TRIGGER update_attendance_condonations_updated_at BEFORE UPDATE ON public.attendance_condonations FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();
CREATE TRIGGER update_attendance_corrections_updated_at BEFORE UPDATE ON public.attendance_corrections FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();

-- 10. HOD policy for attendance_records (currently missing)
CREATE POLICY "HODs can view all attendance" ON public.attendance_records FOR SELECT USING (has_role(auth.uid(), 'hod'));
CREATE POLICY "HODs can insert attendance" ON public.attendance_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "HODs can update attendance" ON public.attendance_records FOR UPDATE USING (has_role(auth.uid(), 'hod'));
