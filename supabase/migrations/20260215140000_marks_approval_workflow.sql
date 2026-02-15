-- Marks Approval Workflow
-- Faculty submits → pending; HOD/Coordinator approves/rejects/sends back
-- Students see marks only when approved

-- Add approval workflow to component definitions
ALTER TABLE public.assessment_component_definitions
  ADD COLUMN IF NOT EXISTS approval_deadline DATE,
  ADD COLUMN IF NOT EXISTS auto_approval_rules JSONB;

-- Add approval workflow to component marks
ALTER TABLE public.assessment_component_marks
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', 'sent_back')),
  ADD COLUMN IF NOT EXISTS approval_comments TEXT;

