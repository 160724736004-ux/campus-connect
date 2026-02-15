-- External / Semester End Exam Marks Entry
-- Theory (70), Practical, Viva, Project, External evaluator, Absent, Malpractice, Verification, Exam cell approval

ALTER TABLE public.assessment_component_marks
  ADD COLUMN IF NOT EXISTS is_malpractice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS malpractice_remarks TEXT,
  ADD COLUMN IF NOT EXISTS entered_by_type TEXT DEFAULT 'internal' CHECK (entered_by_type IN ('internal', 'external')),
  ADD COLUMN IF NOT EXISTS external_evaluator_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS appointed_external_examiner_id UUID REFERENCES public.exam_external_examiners(id),
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exam_cell_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exam_cell_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS exam_cell_approved_at TIMESTAMPTZ;
