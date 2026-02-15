-- ============================================
-- Fee Management (40 & 41)
-- ============================================

-- Fee component types (Tuition, Lab, Library, etc.)
CREATE TABLE IF NOT EXISTS public.fee_component_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_special BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

INSERT INTO public.fee_component_types (code, name, sort_order, is_special) VALUES
  ('tuition', 'Tuition', 1, false),
  ('lab', 'Lab', 2, false),
  ('library', 'Library', 3, false),
  ('development', 'Development', 4, false),
  ('sports', 'Sports', 5, false),
  ('exam', 'Exam', 6, false),
  ('miscellaneous', 'Miscellaneous', 7, false),
  ('admission', 'Admission', 8, false),
  ('caution_deposit', 'Caution Deposit', 9, false),
  ('exam_fee', 'Exam Fee', 10, true),
  ('late_fee', 'Late Fee', 11, true),
  ('reevaluation_fee', 'Re-evaluation Fee', 12, true),
  ('certificate_fee', 'Certificate Fee', 13, true)
ON CONFLICT (code) DO NOTHING;
ALTER TABLE public.fee_component_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view fee_component_types" ON public.fee_component_types FOR SELECT USING (true);

-- Admission categories
CREATE TABLE IF NOT EXISTS public.admission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

INSERT INTO public.admission_categories (code, name) VALUES
  ('convener', 'Convener'),
  ('management', 'Management'),
  ('nri', 'NRI'),
  ('sports', 'Sports'),
  ('minority', 'Minority')
ON CONFLICT (code) DO NOTHING;
ALTER TABLE public.admission_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view admission_categories" ON public.admission_categories FOR SELECT USING (true);

-- Extend profiles with admission_category and fee_frozen
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admission_category_id UUID REFERENCES public.admission_categories(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fee_frozen BOOLEAN DEFAULT false;

-- Fee structures (multi-dimensional)
CREATE TABLE IF NOT EXISTS public.fee_structure_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  admission_category_id UUID REFERENCES public.admission_categories(id) ON DELETE SET NULL,
  year_of_study INT,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  semester_text TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  fee_freeze_for_continuing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fee_structure_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view fee_structure_definitions" ON public.fee_structure_definitions FOR SELECT USING (true);
CREATE POLICY "Admins manage fee_structure_definitions" ON public.fee_structure_definitions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fee structure components (breakdown)
CREATE TABLE IF NOT EXISTS public.fee_structure_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structure_definitions(id) ON DELETE CASCADE,
  component_type_id UUID NOT NULL REFERENCES public.fee_component_types(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(fee_structure_id, component_type_id)
);

ALTER TABLE public.fee_structure_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view fee_structure_components" ON public.fee_structure_components FOR SELECT USING (true);
CREATE POLICY "Admins manage fee_structure_components" ON public.fee_structure_components FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Extend invoices for fee assignment
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fee_structure_id UUID REFERENCES public.fee_structure_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_frozen BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_number INT,
  ADD COLUMN IF NOT EXISTS total_installments INT;

-- Installment plans (due dates per semester/installment)
CREATE TABLE IF NOT EXISTS public.fee_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structure_definitions(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(10,2),
  UNIQUE(fee_structure_id, installment_number)
);

ALTER TABLE public.fee_installment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view fee_installment_plans" ON public.fee_installment_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage fee_installment_plans" ON public.fee_installment_plans FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Scholarships / concessions
CREATE TABLE IF NOT EXISTS public.fee_concessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structure_definitions(id) ON DELETE SET NULL,
  concession_type TEXT NOT NULL CHECK (concession_type IN ('scholarship', 'fee_waiver', 'discount', 'other')),
  amount NUMERIC(10,2),
  percent NUMERIC(5,2),
  description TEXT,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own concessions" ON public.fee_concessions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage fee_concessions" ON public.fee_concessions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Auto-assign fee to student (function)
CREATE OR REPLACE FUNCTION public.assign_fee_to_student(
  p_student_id UUID,
  p_semester TEXT,
  p_academic_year_id UUID DEFAULT NULL,
  p_installment_number INT DEFAULT 1
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student RECORD;
  v_fee RECORD;
  v_total NUMERIC;
  v_concession NUMERIC := 0;
  v_inv_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT program_id, batch_id, department_id, admission_category_id, year_of_study, fee_frozen
    INTO v_student FROM public.profiles WHERE id = p_student_id;
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
  SELECT fsd.* INTO v_fee
  FROM public.fee_structure_definitions fsd
  WHERE fsd.is_active = true
    AND (fsd.semester_text = p_semester OR fsd.semester_id IN (SELECT id FROM public.semesters WHERE name = p_semester))
    AND (p_academic_year_id IS NULL OR fsd.academic_year_id = p_academic_year_id)
    AND (fsd.program_id IS NULL OR fsd.program_id = v_student.program_id)
    AND (fsd.batch_id IS NULL OR fsd.batch_id = v_student.batch_id)
    AND (fsd.department_id IS NULL OR fsd.department_id = v_student.department_id)
    AND (fsd.admission_category_id IS NULL OR fsd.admission_category_id = v_student.admission_category_id)
    AND (fsd.year_of_study IS NULL OR fsd.year_of_study = v_student.year_of_study)
  ORDER BY (fsd.program_id IS NOT NULL)::int DESC, (fsd.batch_id IS NOT NULL)::int DESC
  LIMIT 1;
  IF v_fee IS NULL THEN
    RAISE EXCEPTION 'No matching fee structure found';
  END IF;
  v_total := v_fee.total_amount;
  SELECT COALESCE(SUM(CASE WHEN fc.percent IS NOT NULL THEN v_total * fc.percent / 100 ELSE fc.amount END), 0)
    INTO v_concession FROM public.fee_concessions fc
  WHERE fc.student_id = p_student_id AND fc.is_active AND (fc.fee_structure_id IS NULL OR fc.fee_structure_id = v_fee.id)
    AND (fc.valid_from IS NULL OR fc.valid_from <= CURRENT_DATE) AND (fc.valid_until IS NULL OR fc.valid_until >= CURRENT_DATE);
  v_total := GREATEST(0, v_total - v_concession);
  INSERT INTO public.invoices (student_id, semester, total_amount, fee_structure_id, installment_number, total_installments, fee_frozen)
  VALUES (p_student_id, p_semester, v_total, v_fee.id, p_installment_number, 1, COALESCE(v_student.fee_frozen, false))
  RETURNING id INTO v_inv_id;
  RETURN v_inv_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.assign_fee_to_student(UUID, TEXT, UUID, INT) TO authenticated;
