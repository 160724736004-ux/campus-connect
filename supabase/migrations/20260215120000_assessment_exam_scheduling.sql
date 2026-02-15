-- ============================================
-- Feature 19: Assessment Component Definition
-- Internal Assessment / Marks Management
-- ============================================

-- Assessment component types (Mid-I, Mid-II, Assignment, Quiz, etc.)
CREATE TABLE IF NOT EXISTS public.assessment_component_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.assessment_component_types (code, name, sort_order) VALUES
  ('mid_i', 'Mid-I', 1),
  ('mid_ii', 'Mid-II', 2),
  ('assignment', 'Assignment', 3),
  ('quiz', 'Quiz', 4),
  ('attendance', 'Attendance', 5),
  ('seminar', 'Seminar', 6),
  ('project', 'Project', 7),
  ('viva', 'Viva', 8),
  ('practical', 'Practical', 9),
  ('lab', 'Lab', 10),
  ('semester_end', 'Semester End', 11),
  ('supplementary', 'Supplementary', 12),
  ('makeup', 'Makeup', 13)
ON CONFLICT (code) DO NOTHING;

-- Assessment component definitions per course (per semester/year)
CREATE TABLE IF NOT EXISTS public.assessment_component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  semester_id UUID REFERENCES public.semesters(id),
  component_type_id UUID NOT NULL REFERENCES public.assessment_component_types(id),
  name TEXT NOT NULL,
  max_marks NUMERIC(6,2) NOT NULL,
  weightage_percent NUMERIC(5,2) DEFAULT 0,
  calculation_formula TEXT CHECK (calculation_formula IN ('sum', 'average', 'best_of_n', 'weighted_average')),
  best_of_n_count INT,
  auto_calculation_rules JSONB,
  is_manual_entry BOOLEAN DEFAULT true,
  calendar_event_id UUID REFERENCES public.academic_calendar_events(id),
  entry_start_date DATE,
  entry_deadline DATE,
  grace_period_hours INT DEFAULT 0,
  hard_lock_date TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT false,
  depends_on_component_id UUID REFERENCES public.assessment_component_definitions(id),
  round_off_rule TEXT CHECK (round_off_rule IN ('none', 'ceiling', 'floor', 'nearest', 'nearest_half')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Component marks (per enrollment)
CREATE TABLE IF NOT EXISTS public.assessment_component_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  component_definition_id UUID NOT NULL REFERENCES public.assessment_component_definitions(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(6,2),
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ DEFAULT now(),
  remarks TEXT,
  UNIQUE(enrollment_id, component_definition_id)
);

ALTER TABLE public.assessment_component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_component_marks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Feature 20: Exam Scheduling
-- ============================================

-- Exam types
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

INSERT INTO public.exam_types (code, name, sort_order) VALUES
  ('mid_i', 'Mid-I', 1),
  ('mid_ii', 'Mid-II', 2),
  ('semester_end', 'Semester End', 3),
  ('supplementary', 'Supplementary', 4),
  ('makeup', 'Makeup', 5),
  ('practical', 'Practical', 6),
  ('viva', 'Viva', 7)
ON CONFLICT (code) DO NOTHING;

-- Exams (master)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id),
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id),
  name TEXT NOT NULL,
  exam_pattern TEXT CHECK (exam_pattern IN ('mcq', 'descriptive', 'mixed')),
  marks_distribution JSONB,
  question_paper_pattern TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exam schedules (subject-wise: date, time, duration, hall)
CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT,
  session TEXT CHECK (session IN ('morning', 'afternoon', 'full')),
  applicable_year INT,
  applicable_semester_number INT,
  section_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exam halls
CREATE TABLE IF NOT EXISTS public.exam_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT,
  capacity INT NOT NULL,
  rows_count INT,
  cols_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hall allocation for exam schedules
CREATE TABLE IF NOT EXISTS public.exam_hall_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  hall_id UUID NOT NULL REFERENCES public.exam_halls(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seating arrangements
CREATE TABLE IF NOT EXISTS public.exam_seating_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_allocation_id UUID NOT NULL REFERENCES public.exam_hall_allocations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  row_num INT,
  col_num INT,
  seat_number TEXT,
  UNIQUE(hall_allocation_id, student_id)
);

-- Invigilators
CREATE TABLE IF NOT EXISTS public.exam_invigilators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES auth.users(id),
  hall_id UUID REFERENCES public.exam_halls(id),
  role TEXT CHECK (role IN ('chief', 'invigilator', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Squads (flying squads)
CREATE TABLE IF NOT EXISTS public.exam_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  member_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (allow authenticated users; refine per role in app)
CREATE POLICY "Allow all assessment_component_types" ON public.assessment_component_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all assessment_component_definitions" ON public.assessment_component_definitions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all assessment_component_marks" ON public.assessment_component_marks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exams" ON public.exams FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_schedules" ON public.exam_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_halls" ON public.exam_halls FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_hall_allocations" ON public.exam_hall_allocations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_seating_arrangements" ON public.exam_seating_arrangements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_invigilators" ON public.exam_invigilators FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_squads" ON public.exam_squads FOR ALL TO authenticated USING (true);

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_halls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all exam_types" ON public.exam_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all exam_halls" ON public.exam_halls FOR ALL TO authenticated USING (true);
