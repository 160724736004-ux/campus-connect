
-- 1. Institution Settings (single-row config table)
CREATE TABLE public.institution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  logo_url text,
  address text,
  accreditation text,
  affiliation text,
  license_number text,
  phone text,
  email text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage institution" ON public.institution_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view institution" ON public.institution_settings FOR SELECT USING (true);

-- 2. Academic Years
CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage academic_years" ON public.academic_years FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view academic_years" ON public.academic_years FOR SELECT USING (true);

-- 3. Semesters
CREATE TABLE public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  semester_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage semesters" ON public.semesters FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view semesters" ON public.semesters FOR SELECT USING (true);

-- 4. Extend departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS hod_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS building text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 5. Extend programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS total_credits integer DEFAULT 160,
  ADD COLUMN IF NOT EXISTS degree_type text DEFAULT 'undergraduate',
  ADD COLUMN IF NOT EXISTS intake_capacity integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS eligibility text,
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS accreditation text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 6. Extend courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_type text NOT NULL DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS contact_hours integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS theory_credits integer,
  ADD COLUMN IF NOT EXISTS lab_credits integer;

-- 7. Batches
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  admission_year integer NOT NULL,
  passout_year integer NOT NULL,
  academic_year_id uuid REFERENCES public.academic_years(id),
  total_intake integer NOT NULL DEFAULT 60,
  current_year integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage batches" ON public.batches FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view batches" ON public.batches FOR SELECT USING (true);

-- 8. Sections
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT 1,
  semester integer NOT NULL DEFAULT 1,
  capacity integer NOT NULL DEFAULT 60,
  classroom text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view sections" ON public.sections FOR SELECT USING (true);

-- 9. Extend profiles with additional student fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS aadhar_number text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_mobile text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS mother_mobile text,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_mobile text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS communication_address text,
  ADD COLUMN IF NOT EXISTS admission_date date,
  ADD COLUMN IF NOT EXISTS admission_type text DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS fee_category text DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id),
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id),
  ADD COLUMN IF NOT EXISTS previous_education text,
  ADD COLUMN IF NOT EXISTS scholarship_status text;

-- 10. Curriculum mapping: link courses to programs and semesters
CREATE TABLE public.curriculum_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_number integer NOT NULL DEFAULT 1,
  is_elective boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, course_id)
);
ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage curriculum" ON public.curriculum_subjects FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view curriculum" ON public.curriculum_subjects FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_institution_settings_updated_at BEFORE UPDATE ON public.institution_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
