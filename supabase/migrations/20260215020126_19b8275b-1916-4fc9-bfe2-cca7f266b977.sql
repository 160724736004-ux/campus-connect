
-- Regulations table
CREATE TABLE public.regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  effective_from_year integer NOT NULL DEFAULT 2022,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage regulations" ON public.regulations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view regulations" ON public.regulations FOR SELECT USING (true);

-- Link batches to regulations
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS regulation_id uuid REFERENCES public.regulations(id);

-- Extend courses with L-T-P and subject category
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS ltp_lecture integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS ltp_tutorial integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS ltp_practical integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS subject_category text DEFAULT 'core';

-- Elective groups
CREATE TABLE public.elective_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid REFERENCES public.regulations(id),
  program_id uuid REFERENCES public.programs(id),
  name text NOT NULL,
  semester_number integer NOT NULL DEFAULT 1,
  min_select integer NOT NULL DEFAULT 1,
  max_select integer NOT NULL DEFAULT 1,
  group_type text NOT NULL DEFAULT 'professional_elective',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.elective_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage elective_groups" ON public.elective_groups FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view elective_groups" ON public.elective_groups FOR SELECT USING (true);

-- Elective group courses (many-to-many)
CREATE TABLE public.elective_group_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_group_id uuid NOT NULL REFERENCES public.elective_groups(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(elective_group_id, course_id)
);
ALTER TABLE public.elective_group_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage elective_group_courses" ON public.elective_group_courses FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view elective_group_courses" ON public.elective_group_courses FOR SELECT USING (true);

-- Subject prerequisites (proper mapping table)
CREATE TABLE public.subject_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id)
);
ALTER TABLE public.subject_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage subject_prerequisites" ON public.subject_prerequisites FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view subject_prerequisites" ON public.subject_prerequisites FOR SELECT USING (true);

-- Subject corequisites
CREATE TABLE public.subject_corequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  corequisite_course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, corequisite_course_id)
);
ALTER TABLE public.subject_corequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage subject_corequisites" ON public.subject_corequisites FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view subject_corequisites" ON public.subject_corequisites FOR SELECT USING (true);

-- Subject equivalents (for lateral entry)
CREATE TABLE public.subject_equivalents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  equivalent_course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, equivalent_course_id)
);
ALTER TABLE public.subject_equivalents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage subject_equivalents" ON public.subject_equivalents FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view subject_equivalents" ON public.subject_equivalents FOR SELECT USING (true);

-- Add regulation_id to curriculum_subjects
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS regulation_id uuid REFERENCES public.regulations(id);
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS subject_category text DEFAULT 'core';
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS elective_group_id uuid REFERENCES public.elective_groups(id);
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS ltp_lecture integer DEFAULT 3;
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS ltp_tutorial integer DEFAULT 1;
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS ltp_practical integer DEFAULT 0;
ALTER TABLE public.curriculum_subjects ADD COLUMN IF NOT EXISTS credits integer DEFAULT 3;

-- Academic Calendar Events
CREATE TABLE public.academic_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES public.academic_years(id),
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'general',
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments(id),
  program_id uuid REFERENCES public.programs(id),
  applicable_year integer,
  section_id uuid REFERENCES public.sections(id),
  is_holiday boolean DEFAULT false,
  is_working_day boolean DEFAULT true,
  recurrence text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage calendar_events" ON public.academic_calendar_events FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HODs can manage calendar_events" ON public.academic_calendar_events FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Authenticated can view calendar_events" ON public.academic_calendar_events FOR SELECT USING (true);

-- Registration Windows
CREATE TABLE public.registration_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES public.academic_years(id),
  semester_id uuid REFERENCES public.semesters(id),
  window_type text NOT NULL DEFAULT 'regular',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  min_credits integer DEFAULT 16,
  max_credits integer DEFAULT 26,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage registration_windows" ON public.registration_windows FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view registration_windows" ON public.registration_windows FOR SELECT USING (true);

-- Course Registrations (distinct from enrollments — this is the formal registration process)
CREATE TABLE public.course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  registration_window_id uuid REFERENCES public.registration_windows(id),
  status text NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage course_registrations" ON public.course_registrations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can register courses" ON public.course_registrations FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can view own registrations" ON public.course_registrations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Faculty can view registrations" ON public.course_registrations FOR SELECT USING (has_role(auth.uid(), 'faculty'));
CREATE POLICY "HODs can manage registrations" ON public.course_registrations FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Registration Waitlists
CREATE TABLE public.registration_waitlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  position integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_waitlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage waitlists" ON public.registration_waitlists FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can join waitlist" ON public.registration_waitlists FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can view own waitlist" ON public.registration_waitlists FOR SELECT USING (student_id = auth.uid());

-- Time Slots
CREATE TABLE public.time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_type text NOT NULL DEFAULT 'theory',
  day_of_week integer,
  is_break boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage time_slots" ON public.time_slots FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view time_slots" ON public.time_slots FOR SELECT USING (true);

-- Timetable Entries (replacing simple course_schedules with richer model)
CREATE TABLE public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.sections(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  faculty_id uuid REFERENCES public.profiles(id),
  time_slot_id uuid REFERENCES public.time_slots(id),
  day_of_week integer NOT NULL,
  room text,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  is_substitute boolean DEFAULT false,
  original_faculty_id uuid REFERENCES public.profiles(id),
  entry_type text NOT NULL DEFAULT 'regular',
  version integer DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  academic_year_id uuid REFERENCES public.academic_years(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage timetable" ON public.timetable_entries FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HODs can manage timetable" ON public.timetable_entries FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));
CREATE POLICY "Faculty can manage own timetable" ON public.timetable_entries FOR ALL USING (has_role(auth.uid(), 'faculty') AND faculty_id = auth.uid()) WITH CHECK (has_role(auth.uid(), 'faculty') AND faculty_id = auth.uid());
CREATE POLICY "Authenticated can view timetable" ON public.timetable_entries FOR SELECT USING (true);

-- Student section allocations tracking
CREATE TABLE public.section_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  section_id uuid NOT NULL REFERENCES public.sections(id),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocation_method text NOT NULL DEFAULT 'manual',
  allocated_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.section_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage section_allocations" ON public.section_allocations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view own allocation" ON public.section_allocations FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Authenticated can view allocations" ON public.section_allocations FOR SELECT USING (true);
