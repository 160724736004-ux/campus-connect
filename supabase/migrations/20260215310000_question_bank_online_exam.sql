-- ============================================
-- 64. Question Bank Management
-- 65. Online Examination
-- ============================================

-- ============================================
-- 64. QUESTION BANK
-- ============================================

CREATE TABLE IF NOT EXISTS public.question_bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'descriptive', 'numerical', 'coding')),
  unit TEXT,
  topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  blooms_level TEXT CHECK (blooms_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  course_outcome_id UUID REFERENCES public.course_outcomes(id) ON DELETE SET NULL,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  solution_text TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  version INT DEFAULT 1,
  parent_question_id UUID REFERENCES public.question_bank_questions(id) ON DELETE SET NULL,
  plagiarism_checked BOOLEAN DEFAULT false,
  plagiarism_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.question_bank_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Faculty view own questions" ON public.question_bank_questions FOR SELECT USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR status = 'approved'
);
CREATE POLICY "Faculty insert questions" ON public.question_bank_questions FOR INSERT WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty update own draft" ON public.question_bank_questions FOR UPDATE USING (created_by = auth.uid() AND status = 'draft') WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins manage questions" ON public.question_bank_questions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage questions" ON public.question_bank_questions FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Question paper blueprints (template for paper generation)
CREATE TABLE IF NOT EXISTS public.question_paper_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_marks NUMERIC(8,2) NOT NULL,
  unit_distribution JSONB DEFAULT '{}',
  difficulty_distribution JSONB DEFAULT '{"easy": 20, "medium": 50, "hard": 30}',
  co_distribution JSONB DEFAULT '{}',
  num_sets INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.question_paper_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view blueprints" ON public.question_paper_blueprints FOR SELECT USING (true);
CREATE POLICY "Admins manage blueprints" ON public.question_paper_blueprints FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage blueprints" ON public.question_paper_blueprints FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Generated question paper sets (A, B, C)
CREATE TABLE IF NOT EXISTS public.question_paper_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.question_paper_blueprints(id) ON DELETE CASCADE,
  set_label TEXT NOT NULL,
  exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(blueprint_id, set_label)
);

ALTER TABLE public.question_paper_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view paper sets" ON public.question_paper_sets FOR SELECT USING (true);
CREATE POLICY "Admins manage paper sets" ON public.question_paper_sets FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage paper sets" ON public.question_paper_sets FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Questions in a paper set
CREATE TABLE IF NOT EXISTS public.question_paper_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_set_id UUID NOT NULL REFERENCES public.question_paper_sets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  sequence INT DEFAULT 0,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  UNIQUE(paper_set_id, question_id)
);

ALTER TABLE public.question_paper_set_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view set questions" ON public.question_paper_set_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage set questions" ON public.question_paper_set_questions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage set questions" ON public.question_paper_set_questions FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- ============================================
-- 65. ONLINE EXAMINATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.online_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'mcq' CHECK (test_type IN ('mcq', 'descriptive', 'coding', 'mixed')),
  total_marks NUMERIC(8,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_options BOOLEAN DEFAULT true,
  auto_submit BOOLEAN DEFAULT true,
  proctoring_enabled BOOLEAN DEFAULT false,
  allow_tab_switch BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  semester_text TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.online_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view scheduled tests" ON public.online_tests FOR SELECT USING (
  status IN ('scheduled', 'active', 'completed') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')
);
CREATE POLICY "Admins manage online tests" ON public.online_tests FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage online tests" ON public.online_tests FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Faculty manage online tests" ON public.online_tests FOR ALL USING (has_role(auth.uid(), 'faculty')) WITH CHECK (has_role(auth.uid(), 'faculty'));

CREATE TABLE IF NOT EXISTS public.online_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.online_tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  sequence INT DEFAULT 0,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  UNIQUE(test_id, question_id)
);

ALTER TABLE public.online_test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view test questions" ON public.online_test_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage test questions" ON public.online_test_questions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage test questions" ON public.online_test_questions FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Faculty manage test questions" ON public.online_test_questions FOR ALL USING (has_role(auth.uid(), 'faculty')) WITH CHECK (has_role(auth.uid(), 'faculty'));

CREATE TABLE IF NOT EXISTS public.online_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.online_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  score NUMERIC(8,2),
  max_score NUMERIC(8,2),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated')),
  flagged_suspicious BOOLEAN DEFAULT false,
  flag_reason TEXT,
  proctoring_data JSONB DEFAULT '{}',
  tab_switch_count INT DEFAULT 0,
  UNIQUE(test_id, student_id)
);

ALTER TABLE public.online_test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own attempts" ON public.online_test_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own attempts" ON public.online_test_attempts FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own in_progress" ON public.online_test_attempts FOR UPDATE USING (student_id = auth.uid() AND status = 'in_progress') WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage attempts" ON public.online_test_attempts FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage attempts" ON public.online_test_attempts FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Faculty manage attempts" ON public.online_test_attempts FOR ALL USING (has_role(auth.uid(), 'faculty')) WITH CHECK (has_role(auth.uid(), 'faculty'));

CREATE TABLE IF NOT EXISTS public.online_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.online_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_json JSONB,
  marks_awarded NUMERIC(6,2),
  evaluated_at TIMESTAMPTZ,
  evaluated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  time_spent_seconds INT,
  flagged BOOLEAN DEFAULT false,
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.online_test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own answers" ON public.online_test_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.online_test_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
);
CREATE POLICY "Students insert own answers" ON public.online_test_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.online_test_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
);
CREATE POLICY "Students update own answers" ON public.online_test_answers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.online_test_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
) WITH CHECK (true);
CREATE POLICY "Admins manage answers" ON public.online_test_answers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty manage answers" ON public.online_test_answers FOR ALL USING (has_role(auth.uid(), 'faculty')) WITH CHECK (has_role(auth.uid(), 'faculty'));

-- RPC: Approve question
CREATE OR REPLACE FUNCTION public.approve_question_bank_question(p_question_id UUID, p_status TEXT, p_remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.question_bank_questions SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), review_remarks = COALESCE(p_remarks, review_remarks), updated_at = now()
  WHERE id = p_question_id AND status IN ('draft', 'submitted');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found or not in reviewable state';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_question_bank_question(UUID, TEXT, TEXT) TO authenticated;

-- RPC: Start online test attempt
CREATE OR REPLACE FUNCTION public.start_online_test_attempt(p_test_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_test RECORD;
  v_attempt RECORD;
  v_attempt_id UUID;
BEGIN
  SELECT * INTO v_test FROM public.online_tests WHERE id = p_test_id AND status IN ('scheduled', 'active');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found or not available';
  END IF;
  IF now() < v_test.start_time THEN
    RAISE EXCEPTION 'Test has not started yet';
  END IF;
  IF now() > v_test.end_time THEN
    RAISE EXCEPTION 'Test has ended';
  END IF;
  IF NOT has_role(auth.uid(), 'student') THEN
    RAISE EXCEPTION 'Only students can attempt tests';
  END IF;
  SELECT * INTO v_attempt FROM public.online_test_attempts WHERE test_id = p_test_id AND student_id = auth.uid();
  IF FOUND THEN
    IF v_attempt.status = 'in_progress' THEN RETURN v_attempt.id; END IF;
    RAISE EXCEPTION 'You have already submitted this test';
  END IF;
  INSERT INTO public.online_test_attempts (test_id, student_id) VALUES (p_test_id, auth.uid()) RETURNING id INTO v_attempt_id;
  RETURN v_attempt_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_online_test_attempt(UUID) TO authenticated;
