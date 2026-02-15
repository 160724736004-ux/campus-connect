-- Grading System: scale definition, marks-to-grade mapping, auto-assign, manual override, modification tracking

-- Grading scale (O, A+, A, B+, B, C, D, F with points 10, 9, 8, 7, 6, 5, 4, 0)
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default',
  grade TEXT NOT NULL,
  min_marks_pct NUMERIC(5,2) NOT NULL,
  max_marks_pct NUMERIC(5,2) NOT NULL,
  grade_points NUMERIC(4,2) NOT NULL,
  is_pass BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, grade)
);

INSERT INTO public.grading_scales (name, grade, min_marks_pct, max_marks_pct, grade_points, is_pass, sort_order) VALUES
  ('Default', 'O', 90, 100, 10, true, 1),
  ('Default', 'A+', 80, 89.99, 9, true, 2),
  ('Default', 'A', 70, 79.99, 8, true, 3),
  ('Default', 'B+', 60, 69.99, 7, true, 4),
  ('Default', 'B', 50, 59.99, 6, true, 5),
  ('Default', 'C', 40, 49.99, 5, true, 6),
  ('Default', 'D', 30, 39.99, 4, true, 7),
  ('Default', 'F', 0, 29.99, 0, false, 8)
ON CONFLICT (name, grade) DO NOTHING;

-- Extend grades for auto-assign and manual override
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS auto_assigned_grade TEXT,
  ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMPTZ;

-- Drop old CHECK to allow O and new scale
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_letter_grade_check;
ALTER TABLE public.grades ADD CONSTRAINT grades_letter_grade_check 
  CHECK (letter_grade IS NULL OR letter_grade IN ('O','A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','W','I'));

-- Grade modification history
CREATE TABLE IF NOT EXISTS public.grade_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  old_letter_grade TEXT,
  new_letter_grade TEXT NOT NULL,
  old_grade_points NUMERIC(3,2),
  new_grade_points NUMERIC(3,2),
  modified_by UUID NOT NULL REFERENCES public.profiles(id),
  modified_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  is_override BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ
);

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_modification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all grading_scales" ON public.grading_scales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all grade_modification_history" ON public.grade_modification_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
