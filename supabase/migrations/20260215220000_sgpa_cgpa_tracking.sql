-- SGPA/CGPA historical tracking
-- Updated after each semester for analytics and backlog clearance

CREATE TABLE IF NOT EXISTS public.student_sgpa_cgpa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  sgpa NUMERIC(5,2) NOT NULL,
  total_credit_points NUMERIC(8,2) NOT NULL,
  total_credits NUMERIC(6,2) NOT NULL,
  cgpa_up_to_semester NUMERIC(5,2),
  cumulative_credit_points NUMERIC(10,2),
  cumulative_credits NUMERIC(8,2),
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester)
);

ALTER TABLE public.student_sgpa_cgpa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own sgpa_cgpa" ON public.student_sgpa_cgpa FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage sgpa_cgpa" ON public.student_sgpa_cgpa FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
