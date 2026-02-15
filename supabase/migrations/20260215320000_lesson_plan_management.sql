-- ============================================
-- 66. Lesson Plan Management
-- ============================================

-- Main lesson plan (faculty creates at semester start)
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester_text TEXT NOT NULL,
  syllabus_link TEXT,
  syllabus_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  total_hours_planned NUMERIC(8,2) DEFAULT 0,
  total_hours_actual NUMERIC(8,2) DEFAULT 0,
  coverage_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, faculty_id, semester_text)
);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view lesson plans" ON public.lesson_plans FOR SELECT USING (true);
CREATE POLICY "Faculty manage own lesson plans" ON public.lesson_plans FOR ALL
  USING (faculty_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod'))
  WITH CHECK (faculty_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod'));

-- Week-wise topics
CREATE TABLE IF NOT EXISTS public.lesson_plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  topics TEXT NOT NULL,
  hours_planned NUMERIC(6,2) NOT NULL DEFAULT 0,
  hours_actual NUMERIC(6,2) DEFAULT 0,
  teaching_methodology TEXT,
  assessment_tools TEXT,
  references_resources TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  behind_schedule BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_plan_id, week_number)
);

ALTER TABLE public.lesson_plan_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view lesson plan weeks" ON public.lesson_plan_weeks FOR SELECT USING (true);
CREATE POLICY "Faculty manage lesson plan weeks" ON public.lesson_plan_weeks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.lesson_plans lp WHERE lp.id = lesson_plan_id AND (lp.faculty_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lesson_plans lp WHERE lp.id = lesson_plan_id AND (lp.faculty_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')))
  );

-- Function: Recompute lesson plan coverage and behind-schedule flags
CREATE OR REPLACE FUNCTION public.update_lesson_plan_progress(p_lesson_plan_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_planned NUMERIC;
  v_total_actual NUMERIC;
  v_coverage NUMERIC;
  v_week RECORD;
  v_current_week INT;
BEGIN
  SELECT COALESCE(SUM(hours_planned), 0), COALESCE(SUM(hours_actual), 0)
  INTO v_total_planned, v_total_actual
  FROM public.lesson_plan_weeks WHERE lesson_plan_id = p_lesson_plan_id;

  v_coverage := CASE WHEN v_total_planned > 0 THEN LEAST(100, (v_total_actual / v_total_planned) * 100) ELSE 0 END;

  UPDATE public.lesson_plans
  SET total_hours_planned = v_total_planned,
      total_hours_actual = v_total_actual,
      coverage_percent = v_coverage,
      updated_at = now()
  WHERE id = p_lesson_plan_id;

  -- Set behind_schedule: week N not completed but current academic week > N
  v_current_week := EXTRACT(WEEK FROM now())::INT;
  FOR v_week IN
    SELECT id, week_number, is_completed
    FROM public.lesson_plan_weeks
    WHERE lesson_plan_id = p_lesson_plan_id
  LOOP
    IF NOT v_week.is_completed AND v_week.week_number < v_current_week THEN
      UPDATE public.lesson_plan_weeks SET behind_schedule = true WHERE id = v_week.id;
    ELSE
      UPDATE public.lesson_plan_weeks SET behind_schedule = false WHERE id = v_week.id;
    END IF;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_lesson_plan_progress(UUID) TO authenticated;
