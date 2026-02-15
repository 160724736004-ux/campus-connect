-- Total marks config and pass rules per course
-- Internal (30) + External (70), pass 40% each, detained if not met

CREATE TABLE IF NOT EXISTS public.course_pass_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE UNIQUE,
  internal_out_of NUMERIC(5,2) DEFAULT 30,
  external_out_of NUMERIC(5,2) DEFAULT 70,
  pass_pct_external NUMERIC(5,2) DEFAULT 40,
  pass_pct_total NUMERIC(5,2) DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_pass_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all course_pass_rules" ON public.course_pass_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
