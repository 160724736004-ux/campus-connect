-- ============================================
-- Backlog Exam Conduct & Rules
-- ============================================

-- Backlog rules (institutional config)
CREATE TABLE IF NOT EXISTS public.backlog_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default',
  max_backlog_limit INT NOT NULL DEFAULT 20,
  max_attempts_per_subject INT NOT NULL DEFAULT 6,
  detention_if_exceeds_backlog BOOLEAN DEFAULT true,
  max_backlogs_for_year_progression INT,  -- null = no restriction
  backlog_clearance_deadline_semesters INT,  -- e.g. 4 = must clear within 4 semesters
  supplementary_fee_per_subject NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.backlog_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view backlog_rules" ON public.backlog_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage backlog_rules" ON public.backlog_rules FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.backlog_rules (name, max_backlog_limit, max_attempts_per_subject, detention_if_exceeds_backlog, max_backlogs_for_year_progression, supplementary_fee_per_subject)
SELECT 'Default', 20, 6, true, 5, 0 WHERE NOT EXISTS (SELECT 1 FROM public.backlog_rules LIMIT 1);

-- Add attempt_count and attempt metadata to student_backlogs
ALTER TABLE public.student_backlogs ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.student_backlogs ADD COLUMN IF NOT EXISTS last_attempt_registration_id UUID REFERENCES public.supplementary_registrations(id);
ALTER TABLE public.student_backlogs ADD COLUMN IF NOT EXISTS is_detained BOOLEAN DEFAULT false;
ALTER TABLE public.student_backlogs ADD COLUMN IF NOT EXISTS detained_reason TEXT;

-- Link component marks to exam schedule (for supplementary)
ALTER TABLE public.assessment_component_definitions ADD COLUMN IF NOT EXISTS exam_schedule_id UUID REFERENCES public.exam_schedules(id);
ALTER TABLE public.assessment_component_marks ADD COLUMN IF NOT EXISTS supplementary_registration_id UUID REFERENCES public.supplementary_registrations(id);

-- Supplementary result declarations (batch per exam/window)
CREATE TABLE IF NOT EXISTS public.supplementary_result_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  window_id UUID REFERENCES public.supplementary_registration_windows(id) ON DELETE SET NULL,
  declared_at TIMESTAMPTZ DEFAULT now(),
  declared_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('draft', 'declared'))
);

ALTER TABLE public.supplementary_result_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supp results" ON public.supplementary_result_declarations FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage supp results" ON public.supplementary_result_declarations FOR ALL USING (has_role(auth.uid(), 'hod'));

-- Declare supplementary result: update grade, clear or retain backlog
CREATE OR REPLACE FUNCTION public.declare_supplementary_result(
  p_registration_id UUID,
  p_enrollment_id UUID,
  p_letter_grade TEXT,
  p_grade_points NUMERIC,
  p_backlog_id UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_passed BOOLEAN;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_passed := (p_letter_grade IS NOT NULL AND p_letter_grade != 'F' AND p_letter_grade != '' AND p_letter_grade != '—');
  IF v_passed THEN
    UPDATE public.grades SET letter_grade = p_letter_grade, grade_points = p_grade_points, graded_at = now() WHERE enrollment_id = p_enrollment_id;
    UPDATE public.student_backlogs SET status = 'cleared', cleared_at = now(), cleared_grade_id = (SELECT id FROM public.grades WHERE enrollment_id = p_enrollment_id LIMIT 1)
    WHERE id = p_backlog_id;
  ELSE
    UPDATE public.student_backlogs SET attempt_count = COALESCE(attempt_count, 0) + 1, last_attempt_registration_id = p_registration_id WHERE id = p_backlog_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.declare_supplementary_result(UUID, UUID, TEXT, NUMERIC, UUID) TO authenticated;

-- Generate hall tickets for paid supplementary registrations
CREATE OR REPLACE FUNCTION public.generate_supplementary_hall_tickets(p_registration_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  sched RECORD;
  v_window_id UUID;
  v_hall_id UUID;
  v_seat TEXT;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF (SELECT payment_status FROM public.supplementary_registrations WHERE id = p_registration_id) != 'paid' THEN
    RAISE EXCEPTION 'Registration must be paid before hall tickets';
  END IF;
  SELECT window_id INTO v_window_id FROM public.supplementary_registrations WHERE id = p_registration_id;
  FOR r IN
    SELECT DISTINCT e.course_id
    FROM public.supplementary_registration_subjects srs
    JOIN public.student_backlogs sb ON sb.id = srs.backlog_id
    JOIN public.enrollments e ON e.id = sb.enrollment_id
    WHERE srs.registration_id = p_registration_id
  LOOP
    FOR sched IN
      SELECT es.id, es.exam_date
      FROM public.exam_schedules es
      JOIN public.supplementary_registration_windows srw ON srw.exam_id = es.exam_id
      WHERE srw.id = v_window_id AND es.course_id = r.course_id
    LOOP
      SELECT eha.hall_id INTO v_hall_id FROM public.exam_hall_allocations eha WHERE eha.exam_schedule_id = sched.id LIMIT 1;
      v_seat := 'A' || (SELECT COUNT(*) + 1 FROM public.supplementary_hall_tickets WHERE exam_schedule_id = sched.id);
      INSERT INTO public.supplementary_hall_tickets (registration_id, exam_schedule_id, hall_id, seat_number)
      VALUES (p_registration_id, sched.id, v_hall_id, v_seat)
      ON CONFLICT (registration_id, exam_schedule_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_supplementary_hall_tickets(UUID) TO authenticated;
