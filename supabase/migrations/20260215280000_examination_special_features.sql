-- ============================================
-- Examination Special Features
-- 50. Revaluation/Rechecking
-- 51. Malpractice/Unfair Means
-- 52. Grade Improvement | 53. Betterment Exam
-- ============================================

-- Add exam types for improvement and betterment
INSERT INTO public.exam_types (code, name, sort_order) VALUES
  ('improvement', 'Grade Improvement', 8),
  ('betterment', 'Betterment', 9)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 50. REVALUATION / RECHECKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.revaluation_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fee_per_subject NUMERIC(10,2) NOT NULL DEFAULT 0,
  revaluation_type TEXT NOT NULL DEFAULT 'retotaling' CHECK (revaluation_type IN ('retotaling', 'full_reevaluation')),
  significant_change_threshold NUMERIC(5,2) DEFAULT 10,
  require_third_evaluator BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revaluation_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view active revaluation_windows" ON public.revaluation_windows FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage revaluation_windows" ON public.revaluation_windows FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage revaluation_windows" ON public.revaluation_windows FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.revaluation_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_id UUID NOT NULL REFERENCES public.revaluation_windows(id) ON DELETE CASCADE,
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'assigned', 'in_progress', 'completed', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ DEFAULT now(),
  result_published_at TIMESTAMPTZ,
  UNIQUE(student_id, window_id)
);

ALTER TABLE public.revaluation_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own revaluation_applications" ON public.revaluation_applications FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own revaluation_applications" ON public.revaluation_applications FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage revaluation_applications" ON public.revaluation_applications FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage revaluation_applications" ON public.revaluation_applications FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.revaluation_application_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.revaluation_applications(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  component_definition_id UUID NOT NULL REFERENCES public.assessment_component_definitions(id) ON DELETE CASCADE,
  fee_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_marks NUMERIC(6,2),
  revaluation_marks NUMERIC(6,2),
  third_evaluator_marks NUMERIC(6,2),
  final_marks NUMERIC(6,2),
  significant_change BOOLEAN DEFAULT false,
  evaluator_id UUID REFERENCES public.profiles(id),
  third_evaluator_id UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  fee_refunded BOOLEAN DEFAULT false,
  refund_amount NUMERIC(10,2),
  UNIQUE(application_id, enrollment_id, component_definition_id)
);

ALTER TABLE public.revaluation_application_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own revaluation_subjects" ON public.revaluation_application_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.revaluation_applications ra WHERE ra.id = application_id AND ra.student_id = auth.uid())
);
CREATE POLICY "Admins manage revaluation_subjects" ON public.revaluation_application_subjects FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage revaluation_subjects" ON public.revaluation_application_subjects FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- ============================================
-- 51. MALPRACTICE / UNFAIR MEANS
-- ============================================

CREATE TABLE IF NOT EXISTS public.malpractice_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL,
  nature TEXT NOT NULL CHECK (nature IN ('copying', 'impersonation', 'forbidden_material', 'communication', 'other')),
  description TEXT,
  evidence_paths TEXT[] DEFAULT '{}',
  reported_by UUID REFERENCES public.profiles(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'enquiry', 'hearing', 'decided', 'appealed', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.malpractice_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own malpractice_cases" ON public.malpractice_cases FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage malpractice_cases" ON public.malpractice_cases FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage malpractice_cases" ON public.malpractice_cases FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.malpractice_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.malpractice_cases(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('chair', 'member', 'convener')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, profile_id)
);

ALTER TABLE public.malpractice_committee_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage malpractice_committee" ON public.malpractice_committee_members FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage malpractice_committee" ON public.malpractice_committee_members FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.malpractice_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.malpractice_cases(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  held_at TIMESTAMPTZ,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.malpractice_hearings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage malpractice_hearings" ON public.malpractice_hearings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage malpractice_hearings" ON public.malpractice_hearings FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.malpractice_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.malpractice_cases(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('penalty', 'exonerated')),
  penalty_type TEXT CHECK (penalty_type IN ('marks_deduction', 'subject_cancellation', 'semester_cancellation', 'expulsion')),
  penalty_details JSONB DEFAULT '{}',
  marks_deducted NUMERIC(6,2),
  enrollment_id UUID REFERENCES public.enrollments(id),
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ DEFAULT now(),
  student_notified_at TIMESTAMPTZ
);

ALTER TABLE public.malpractice_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage malpractice_decisions" ON public.malpractice_decisions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage malpractice_decisions" ON public.malpractice_decisions FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Students view own malpractice_decisions" ON public.malpractice_decisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.malpractice_cases mc WHERE mc.id = case_id AND mc.student_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.malpractice_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.malpractice_cases(id) ON DELETE CASCADE,
  filed_at TIMESTAMPTZ DEFAULT now(),
  appeal_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'upheld', 'rejected')),
  final_decision TEXT,
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.malpractice_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own appeals" ON public.malpractice_appeals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.malpractice_cases mc WHERE mc.id = case_id AND mc.student_id = auth.uid())
);
CREATE POLICY "Students insert own appeals" ON public.malpractice_appeals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.malpractice_cases mc WHERE mc.id = case_id AND mc.student_id = auth.uid())
);
CREATE POLICY "Admins manage malpractice_appeals" ON public.malpractice_appeals FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage malpractice_appeals" ON public.malpractice_appeals FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- ============================================
-- 52. GRADE IMPROVEMENT | 53. BETTERMENT
-- ============================================

CREATE TABLE IF NOT EXISTS public.improvement_betterment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default',
  exam_type TEXT NOT NULL CHECK (exam_type IN ('improvement', 'betterment')),
  grade_policy TEXT NOT NULL DEFAULT 'best_only' CHECK (grade_policy IN ('best_only', 'replace', 'average')),
  max_attempts_per_subject INT NOT NULL DEFAULT 2,
  max_subjects_per_registration INT DEFAULT 6,
  fee_per_subject NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.improvement_betterment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view improvement_rules" ON public.improvement_betterment_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage improvement_rules" ON public.improvement_betterment_rules FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.improvement_betterment_rules (name, exam_type, grade_policy, max_attempts_per_subject)
SELECT 'Grade Improvement Default', 'improvement', 'best_only', 2 WHERE NOT EXISTS (SELECT 1 FROM public.improvement_betterment_rules WHERE exam_type = 'improvement' LIMIT 1);
INSERT INTO public.improvement_betterment_rules (name, exam_type, grade_policy, max_attempts_per_subject)
SELECT 'Betterment Default', 'betterment', 'replace', 1 WHERE NOT EXISTS (SELECT 1 FROM public.improvement_betterment_rules WHERE exam_type = 'betterment' LIMIT 1);

CREATE TABLE IF NOT EXISTS public.improvement_betterment_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.improvement_betterment_rules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fee_per_subject NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.improvement_betterment_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view active improvement_windows" ON public.improvement_betterment_windows FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage improvement_windows" ON public.improvement_betterment_windows FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage improvement_windows" ON public.improvement_betterment_windows FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.improvement_betterment_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_id UUID NOT NULL REFERENCES public.improvement_betterment_windows(id) ON DELETE CASCADE,
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, window_id)
);

ALTER TABLE public.improvement_betterment_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own improvement_registrations" ON public.improvement_betterment_registrations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own improvement_registrations" ON public.improvement_betterment_registrations FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own improvement_registrations" ON public.improvement_betterment_registrations FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins manage improvement_registrations" ON public.improvement_betterment_registrations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage improvement_registrations" ON public.improvement_betterment_registrations FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.improvement_betterment_registration_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.improvement_betterment_registrations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  UNIQUE(registration_id, enrollment_id)
);

ALTER TABLE public.improvement_betterment_registration_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own improvement_subjects" ON public.improvement_betterment_registration_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.improvement_betterment_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);
CREATE POLICY "Students manage own improvement_subjects" ON public.improvement_betterment_registration_subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.improvement_betterment_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);
CREATE POLICY "Admins manage improvement_subjects" ON public.improvement_betterment_registration_subjects FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage improvement_subjects" ON public.improvement_betterment_registration_subjects FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Results: old vs new grade, better grade for CGPA, transcript note
CREATE TABLE IF NOT EXISTS public.improvement_betterment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_subject_id UUID NOT NULL REFERENCES public.improvement_betterment_registration_subjects(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  old_letter_grade TEXT,
  old_grade_points NUMERIC(4,2),
  new_letter_grade TEXT,
  new_grade_points NUMERIC(4,2),
  new_marks NUMERIC(6,2),
  better_grade_used_for_cgpa BOOLEAN DEFAULT false,
  transcript_note TEXT,
  result_declared_at TIMESTAMPTZ,
  UNIQUE(registration_subject_id)
);

ALTER TABLE public.improvement_betterment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own improvement_results" ON public.improvement_betterment_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.improvement_betterment_registration_subjects rs
    JOIN public.improvement_betterment_registrations r ON r.id = rs.registration_id
    WHERE rs.id = registration_subject_id AND r.student_id = auth.uid())
);
CREATE POLICY "Admins manage improvement_results" ON public.improvement_betterment_results FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage improvement_results" ON public.improvement_betterment_results FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Extend grades for improvement/betterment transcript note
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS improvement_attempt INT;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS is_improvement_betterment BOOLEAN DEFAULT false;

-- RPC: Approve revaluation application
CREATE OR REPLACE FUNCTION public.approve_revaluation_application(p_app_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.revaluation_applications
  SET status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = p_app_id AND status = 'submitted' AND payment_status = 'paid';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not eligible for approval';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_revaluation_application(UUID) TO authenticated;

-- RPC: Apply revaluation result - update marks, grade, trigger SGPA/CGPA recalculation
CREATE OR REPLACE FUNCTION public.apply_revaluation_result(
  p_subject_id UUID,
  p_final_marks NUMERIC,
  p_refund_amount NUMERIC DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sub RECORD;
  v_enrollment_id UUID;
  v_old_marks NUMERIC;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_sub FROM public.revaluation_application_subjects WHERE id = p_subject_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revaluation subject not found'; END IF;
  v_enrollment_id := v_sub.enrollment_id;
  v_old_marks := v_sub.original_marks;
  UPDATE public.assessment_component_marks SET marks_obtained = p_final_marks, entered_at = now()
  WHERE enrollment_id = v_sub.enrollment_id AND component_definition_id = v_sub.component_definition_id;
  UPDATE public.revaluation_application_subjects
  SET final_marks = p_final_marks, completed_at = now(),
      fee_refunded = (p_refund_amount IS NOT NULL AND p_refund_amount > 0),
      refund_amount = COALESCE(p_refund_amount, 0)
  WHERE id = p_subject_id;
  UPDATE public.revaluation_applications SET status = 'completed'
  WHERE id = v_sub.application_id AND NOT EXISTS (SELECT 1 FROM public.revaluation_application_subjects ras WHERE ras.application_id = v_sub.application_id AND ras.completed_at IS NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_revaluation_result(UUID, NUMERIC, NUMERIC) TO authenticated;

-- RPC: Declare malpractice penalty (marks deduction)
CREATE OR REPLACE FUNCTION public.apply_malpractice_penalty(
  p_case_id UUID,
  p_penalty_type TEXT,
  p_marks_deducted NUMERIC DEFAULT NULL,
  p_enrollment_id UUID DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.malpractice_decisions (case_id, decision, penalty_type, marks_deducted, enrollment_id, decided_by)
  VALUES (p_case_id, 'penalty', p_penalty_type, p_marks_deducted, p_enrollment_id, auth.uid());
  UPDATE public.malpractice_cases SET status = 'decided', updated_at = now() WHERE id = p_case_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_malpractice_penalty(UUID, TEXT, NUMERIC, UUID) TO authenticated;
