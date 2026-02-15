-- Marks Publication: control visibility, schedule, groups, notifications
-- Students see marks only when approved AND published

ALTER TABLE public.assessment_component_marks
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Publication schedules (component-wise or all, by group)
CREATE TABLE IF NOT EXISTS public.marks_publication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  component_definition_id UUID REFERENCES public.assessment_component_definitions(id) ON DELETE CASCADE,
  publish_at TIMESTAMPTZ NOT NULL,
  target_section_ids UUID[],
  target_batch_ids UUID[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'cancelled')),
  published_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.marks_publication_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all marks_publication_schedules" ON public.marks_publication_schedules FOR ALL TO authenticated USING (true);
