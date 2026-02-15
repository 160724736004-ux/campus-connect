-- Marks Entry: draft/submit, absent, deadline enforcement
ALTER TABLE public.assessment_component_marks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);
