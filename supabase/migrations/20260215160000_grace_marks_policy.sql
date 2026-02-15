-- Grace marks policy for internal marks calculation
CREATE TABLE IF NOT EXISTS public.grace_marks_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  max_grace_marks NUMERIC(5,2) DEFAULT 0,
  max_percentage NUMERIC(5,2),
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.grace_marks_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all grace_marks_policies" ON public.grace_marks_policies FOR ALL TO authenticated USING (true);
