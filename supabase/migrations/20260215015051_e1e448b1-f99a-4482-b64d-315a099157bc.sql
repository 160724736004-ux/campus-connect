
-- Extend profiles with faculty-specific fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_id text,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS date_of_joining date,
ADD COLUMN IF NOT EXISTS qualifications text,
ADD COLUMN IF NOT EXISTS specialization text,
ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_ifsc text,
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS research_interests text,
ADD COLUMN IF NOT EXISTS publications text,
ADD COLUMN IF NOT EXISTS professional_memberships text;

-- Faculty workload assignments
CREATE TABLE public.faculty_workload_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  section_id uuid REFERENCES public.sections(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  semester text NOT NULL DEFAULT 'Fall 2026',
  hours_per_week integer NOT NULL DEFAULT 0,
  max_hours_per_week integer DEFAULT 18,
  status text NOT NULL DEFAULT 'active',
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_workload_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workload" ON public.faculty_workload_assignments
FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can manage workload" ON public.faculty_workload_assignments
FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE POLICY "Faculty can view own workload" ON public.faculty_workload_assignments
FOR SELECT USING (faculty_id = auth.uid());

-- Faculty duties
CREATE TABLE public.faculty_duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.profiles(id),
  duty_type text NOT NULL,
  title text NOT NULL,
  description text,
  related_entity_id uuid,
  related_entity_type text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_duties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage duties" ON public.faculty_duties
FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can manage duties" ON public.faculty_duties
FOR ALL USING (has_role(auth.uid(), 'hod')) WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE POLICY "Faculty can view own duties" ON public.faculty_duties
FOR SELECT USING (faculty_id = auth.uid());

-- Employee ID sequence
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_employee_id(prefix text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val integer;
  yr text;
BEGIN
  seq_val := nextval('employee_id_seq');
  yr := COALESCE(prefix, to_char(now(), 'YY'));
  RETURN yr || 'EMP' || lpad(seq_val::text, 5, '0');
END;
$$;
