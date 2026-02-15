-- ============================================
-- 60. Outcome-Based Education (OBE)
-- 61. Choice Based Credit System (CBCS)
-- ============================================

-- ============================================
-- 60. OBE: Programme Outcomes, PSOs, COs, Mapping, Attainment
-- ============================================

CREATE TABLE IF NOT EXISTS public.programme_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  target_attainment NUMERIC(5,2) DEFAULT 70,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, code)
);

ALTER TABLE public.programme_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view POs" ON public.programme_outcomes FOR SELECT USING (true);
CREATE POLICY "Admins manage POs" ON public.programme_outcomes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage POs" ON public.programme_outcomes FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.programme_specific_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  target_attainment NUMERIC(5,2) DEFAULT 70,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, code)
);

ALTER TABLE public.programme_specific_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view PSOs" ON public.programme_specific_outcomes FOR SELECT USING (true);
CREATE POLICY "Admins manage PSOs" ON public.programme_specific_outcomes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage PSOs" ON public.programme_specific_outcomes FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE TABLE IF NOT EXISTS public.course_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, code)
);

ALTER TABLE public.course_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view COs" ON public.course_outcomes FOR SELECT USING (true);
CREATE POLICY "Admins manage COs" ON public.course_outcomes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage COs" ON public.course_outcomes FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- CO to PO mapping (strength 1/2/3)
CREATE TABLE IF NOT EXISTS public.co_po_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_outcome_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  programme_outcome_id UUID NOT NULL REFERENCES public.programme_outcomes(id) ON DELETE CASCADE,
  strength INT NOT NULL DEFAULT 1 CHECK (strength IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_outcome_id, programme_outcome_id)
);

ALTER TABLE public.co_po_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view co_po_mapping" ON public.co_po_mapping FOR SELECT USING (true);
CREATE POLICY "Admins manage co_po_mapping" ON public.co_po_mapping FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage co_po_mapping" ON public.co_po_mapping FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- CO to PSO mapping
CREATE TABLE IF NOT EXISTS public.co_pso_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_outcome_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  pso_id UUID NOT NULL REFERENCES public.programme_specific_outcomes(id) ON DELETE CASCADE,
  strength INT NOT NULL DEFAULT 1 CHECK (strength IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_outcome_id, pso_id)
);

ALTER TABLE public.co_pso_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view co_pso_mapping" ON public.co_pso_mapping FOR SELECT USING (true);
CREATE POLICY "Admins manage co_pso_mapping" ON public.co_pso_mapping FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage co_pso_mapping" ON public.co_pso_mapping FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Map assessment component to COs (for CO attainment calculation)
CREATE TABLE IF NOT EXISTS public.assessment_co_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_definition_id UUID NOT NULL REFERENCES public.assessment_component_definitions(id) ON DELETE CASCADE,
  course_outcome_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  weight_percent NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(component_definition_id, course_outcome_id)
);

ALTER TABLE public.assessment_co_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view assessment_co_mapping" ON public.assessment_co_mapping FOR SELECT USING (true);
CREATE POLICY "Admins manage assessment_co_mapping" ON public.assessment_co_mapping FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage assessment_co_mapping" ON public.assessment_co_mapping FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- CO attainment (course + semester/cohort level: target vs actual)
CREATE TABLE IF NOT EXISTS public.co_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_outcome_id UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  semester_text TEXT NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id),
  target_attainment NUMERIC(5,2) DEFAULT 70,
  actual_attainment NUMERIC(5,2),
  students_above_threshold INT,
  total_students INT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, course_outcome_id, semester_text, academic_year_id)
);

ALTER TABLE public.co_attainment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view co_attainment" ON public.co_attainment FOR SELECT USING (true);
CREATE POLICY "Admins manage co_attainment" ON public.co_attainment FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage co_attainment" ON public.co_attainment FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- PO attainment (from CO attainment via mapping)
CREATE TABLE IF NOT EXISTS public.po_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  programme_outcome_id UUID NOT NULL REFERENCES public.programme_outcomes(id) ON DELETE CASCADE,
  semester_text TEXT NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id),
  target_attainment NUMERIC(5,2) DEFAULT 70,
  actual_attainment NUMERIC(5,2),
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, programme_outcome_id, semester_text, academic_year_id)
);

ALTER TABLE public.po_attainment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view po_attainment" ON public.po_attainment FOR SELECT USING (true);
CREATE POLICY "Admins manage po_attainment" ON public.po_attainment FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage po_attainment" ON public.po_attainment FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Gap analysis & action taken
CREATE TABLE IF NOT EXISTS public.obe_gap_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('CO', 'PO', 'PSO')),
  outcome_id UUID NOT NULL,
  semester_text TEXT NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id),
  target_attainment NUMERIC(5,2),
  actual_attainment NUMERIC(5,2),
  gap NUMERIC(5,2),
  action_taken TEXT,
  improvement_cycle_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.obe_gap_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view obe_gap_actions" ON public.obe_gap_actions FOR SELECT USING (true);
CREATE POLICY "Admins manage obe_gap_actions" ON public.obe_gap_actions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage obe_gap_actions" ON public.obe_gap_actions FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- Continuous improvement cycle
CREATE TABLE IF NOT EXISTS public.obe_improvement_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cycle_from DATE NOT NULL,
  cycle_to DATE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.obe_improvement_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view obe_improvement_cycles" ON public.obe_improvement_cycles FOR SELECT USING (true);
CREATE POLICY "Admins manage obe_improvement_cycles" ON public.obe_improvement_cycles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "HOD manage obe_improvement_cycles" ON public.obe_improvement_cycles FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

-- ============================================
-- 61. CBCS: Credit structure, transfer, MOOC, exit points
-- ============================================

CREATE TABLE IF NOT EXISTS public.cbcs_credit_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  min_credits_degree NUMERIC(8,2) NOT NULL DEFAULT 120,
  credits_certificate NUMERIC(8,2),
  credits_diploma NUMERIC(8,2),
  credits_honours NUMERIC(8,2),
  min_credits_per_semester INT DEFAULT 16,
  max_credits_per_semester INT DEFAULT 26,
  allow_overload BOOLEAN DEFAULT false,
  max_overload_credits INT DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id)
);

ALTER TABLE public.cbcs_credit_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cbcs_credit_structure" ON public.cbcs_credit_structure FOR SELECT USING (true);
CREATE POLICY "Admins manage cbcs_credit_structure" ON public.cbcs_credit_structure FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Student credit summary (earned, transferred, MOOC, total)
CREATE TABLE IF NOT EXISTS public.student_credit_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_earned NUMERIC(8,2) NOT NULL DEFAULT 0,
  credits_transferred NUMERIC(8,2) DEFAULT 0,
  credits_mooc NUMERIC(8,2) DEFAULT 0,
  credits_total NUMERIC(8,2) GENERATED ALWAYS AS (credits_earned + COALESCE(credits_transferred, 0) + COALESCE(credits_mooc, 0)) STORED,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_credit_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own credit_summary" ON public.student_credit_summary FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage student_credit_summary" ON public.student_credit_summary FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Credit transfer from other institutions
CREATE TABLE IF NOT EXISTS public.credit_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  external_course_code TEXT,
  external_course_name TEXT NOT NULL,
  credits NUMERIC(5,2) NOT NULL,
  equivalent_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  equivalence_mapping_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own credit_transfers" ON public.credit_transfers FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage credit_transfers" ON public.credit_transfers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- SWAYAM/NPTEL/MOOC credit recognition
CREATE TABLE IF NOT EXISTS public.mooc_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SWAYAM', 'NPTEL', 'Coursera', 'edX', 'other')),
  course_code TEXT,
  course_name TEXT NOT NULL,
  credits NUMERIC(5,2) NOT NULL,
  equivalent_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  credit_bank_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mooc_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own mooc_credits" ON public.mooc_credits FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage mooc_credits" ON public.mooc_credits FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Credit bank entries (generic credit bank system)
CREATE TABLE IF NOT EXISTS public.credit_bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('transfer', 'mooc', 'lateral', 'other')),
  source_ref_id UUID,
  credits NUMERIC(5,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'applied', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_bank_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own credit_bank" ON public.credit_bank_entries FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage credit_bank" ON public.credit_bank_entries FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Multiple entry-multiple exit: exit points (certificate 1yr, diploma 2yr, degree 3yr, honours 4yr)
CREATE TABLE IF NOT EXISTS public.cbcs_exit_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  exit_type TEXT NOT NULL CHECK (exit_type IN ('certificate', 'diploma', 'degree', 'honours')),
  min_years INT NOT NULL,
  min_credits NUMERIC(8,2) NOT NULL,
  award_title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, exit_type)
);

ALTER TABLE public.cbcs_exit_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cbcs_exit_points" ON public.cbcs_exit_points FOR SELECT USING (true);
CREATE POLICY "Admins manage cbcs_exit_points" ON public.cbcs_exit_points FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Programme variant: fast-track (overload) / extended
CREATE TABLE IF NOT EXISTS public.cbcs_programme_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL CHECK (variant_type IN ('regular', 'fast_track', 'extended')),
  description TEXT,
  max_semesters INT,
  min_credits_per_semester INT,
  max_credits_per_semester INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cbcs_programme_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view cbcs_programme_variants" ON public.cbcs_programme_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage cbcs_programme_variants" ON public.cbcs_programme_variants FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Extend profiles for CBCS variant and exit
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cbcs_variant_id UUID REFERENCES public.cbcs_programme_variants(id),
  ADD COLUMN IF NOT EXISTS exit_point_claimed TEXT;

-- Credit equivalence mapping (external course → internal course)
CREATE TABLE IF NOT EXISTS public.credit_equivalence_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  external_source TEXT NOT NULL CHECK (external_source IN ('transfer', 'SWAYAM', 'NPTEL', 'other')),
  external_course_code TEXT,
  external_course_name TEXT,
  internal_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  credits NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_equivalence_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view credit_equivalence" ON public.credit_equivalence_mapping FOR SELECT USING (true);
CREATE POLICY "Admins manage credit_equivalence" ON public.credit_equivalence_mapping FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed exit points for reference (one per program per exit type)
INSERT INTO public.cbcs_exit_points (program_id, exit_type, min_years, min_credits, award_title)
SELECT p.id, 'certificate', 1, 40, 'Certificate' FROM public.programs p
ON CONFLICT (program_id, exit_type) DO NOTHING;
INSERT INTO public.cbcs_exit_points (program_id, exit_type, min_years, min_credits, award_title)
SELECT p.id, 'diploma', 2, 80, 'Diploma' FROM public.programs p
ON CONFLICT (program_id, exit_type) DO NOTHING;
INSERT INTO public.cbcs_exit_points (program_id, exit_type, min_years, min_credits, award_title)
SELECT p.id, 'degree', 3, 120, 'Degree' FROM public.programs p
ON CONFLICT (program_id, exit_type) DO NOTHING;
INSERT INTO public.cbcs_exit_points (program_id, exit_type, min_years, min_credits, award_title)
SELECT p.id, 'honours', 4, 160, 'Honours' FROM public.programs p
ON CONFLICT (program_id, exit_type) DO NOTHING;
