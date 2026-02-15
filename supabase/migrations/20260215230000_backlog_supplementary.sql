-- ============================================
-- Backlog / Supplementary Management
-- ============================================

-- Student backlogs (auto-identified from F grade)
CREATE TABLE IF NOT EXISTS public.student_backlogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attempting', 'cleared')),
  identified_at TIMESTAMPTZ DEFAULT now(),
  cleared_at TIMESTAMPTZ,
  cleared_grade_id UUID REFERENCES public.grades(id),
  UNIQUE(enrollment_id)
);

ALTER TABLE public.student_backlogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own backlogs" ON public.student_backlogs FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage backlogs" ON public.student_backlogs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD view backlogs" ON public.student_backlogs FOR SELECT USING (has_role(auth.uid(), 'hod'));

-- Function to identify backlogs from F grades
CREATE OR REPLACE FUNCTION public.identify_backlogs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin can identify backlogs';
  END IF;
  INSERT INTO public.student_backlogs (student_id, enrollment_id, status)
  SELECT e.student_id, e.id, 'pending'
  FROM public.enrollments e
  JOIN public.grades g ON g.enrollment_id = e.id AND g.letter_grade = 'F'
  WHERE NOT EXISTS (SELECT 1 FROM public.student_backlogs b WHERE b.enrollment_id = e.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.identify_backlogs() TO authenticated;

-- Supplementary exam registration windows
CREATE TABLE IF NOT EXISTS public.supplementary_registration_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fee_per_subject NUMERIC(10,2) NOT NULL DEFAULT 0,
  internal_marks_handling TEXT NOT NULL DEFAULT 'retain_old' CHECK (internal_marks_handling IN ('retain_old', 're_evaluate')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplementary_registration_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supp windows" ON public.supplementary_registration_windows FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage supp windows" ON public.supplementary_registration_windows FOR ALL USING (has_role(auth.uid(), 'hod'));
CREATE POLICY "Students view active supp windows" ON public.supplementary_registration_windows FOR SELECT USING (is_active = true);

-- Supplementary exam schedules (only backlog subjects) - uses existing exam_schedules with exam_type supplementary
-- Add internal_marks_handling to exams for supplementary
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS internal_marks_handling TEXT CHECK (internal_marks_handling IN ('retain_old', 're_evaluate'));

-- Supplementary registrations (student + window)
CREATE TABLE IF NOT EXISTS public.supplementary_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_id UUID NOT NULL REFERENCES public.supplementary_registration_windows(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, window_id)
);

ALTER TABLE public.supplementary_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own supp registrations" ON public.supplementary_registrations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own supp registrations" ON public.supplementary_registrations FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own supp registrations" ON public.supplementary_registrations FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins manage supp registrations" ON public.supplementary_registrations FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage supp registrations" ON public.supplementary_registrations FOR ALL USING (has_role(auth.uid(), 'hod'));

-- Subjects selected for supplementary (backlog per registration)
CREATE TABLE IF NOT EXISTS public.supplementary_registration_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.supplementary_registrations(id) ON DELETE CASCADE,
  backlog_id UUID NOT NULL REFERENCES public.student_backlogs(id) ON DELETE CASCADE,
  UNIQUE(registration_id, backlog_id)
);

ALTER TABLE public.supplementary_registration_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own supp subjects" ON public.supplementary_registration_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.supplementary_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);
CREATE POLICY "Students manage own supp subjects" ON public.supplementary_registration_subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.supplementary_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);
CREATE POLICY "Admins manage supp subjects" ON public.supplementary_registration_subjects FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage supp subjects" ON public.supplementary_registration_subjects FOR ALL USING (has_role(auth.uid(), 'hod'));

-- Hall tickets (generated for registered subjects only)
CREATE TABLE IF NOT EXISTS public.supplementary_hall_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.supplementary_registrations(id) ON DELETE CASCADE,
  exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE SET NULL,
  hall_id UUID REFERENCES public.exam_halls(id) ON DELETE SET NULL,
  seat_number TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(registration_id, exam_schedule_id)
);

ALTER TABLE public.supplementary_hall_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own hall tickets" ON public.supplementary_hall_tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.supplementary_registrations r WHERE r.id = registration_id AND r.student_id = auth.uid())
);
CREATE POLICY "Admins manage hall tickets" ON public.supplementary_hall_tickets FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage hall tickets" ON public.supplementary_hall_tickets FOR ALL USING (has_role(auth.uid(), 'hod'));
