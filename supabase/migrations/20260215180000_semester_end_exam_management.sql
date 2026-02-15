-- ============================================
-- Semester End Examination / Exam Management
-- Extends exam scheduling with full lifecycle
-- ============================================

-- Exam nature on schedules (theory, practical, project, viva)
ALTER TABLE public.exam_schedules
  ADD COLUMN IF NOT EXISTS exam_nature TEXT DEFAULT 'theory'
    CHECK (exam_nature IN ('theory', 'practical', 'project', 'viva'));

-- External examiners appointment
CREATE TABLE IF NOT EXISTS public.exam_external_examiners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  institution TEXT,
  email TEXT,
  phone TEXT,
  subject_area TEXT,
  appointment_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Squad duty roster (when/where squad members are on duty)
CREATE TABLE IF NOT EXISTS public.exam_squad_duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.exam_squads(id) ON DELETE CASCADE,
  duty_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  halls_coverage UUID[],
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exam materials (question papers, distribution tracking)
CREATE TABLE IF NOT EXISTS public.exam_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('question_paper', 'answer_sheet', 'supplementary', 'instructions')),
  version TEXT,
  quantity_ordered INT DEFAULT 0,
  quantity_distributed INT DEFAULT 0,
  distributed_at TIMESTAMPTZ,
  distributed_by UUID REFERENCES public.profiles(id),
  hall_id UUID REFERENCES public.exam_halls(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'distributed', 'collected')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Question paper distribution tracking per hall
CREATE TABLE IF NOT EXISTS public.exam_question_paper_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  hall_id UUID NOT NULL REFERENCES public.exam_halls(id) ON DELETE CASCADE,
  quantity_distributed INT NOT NULL DEFAULT 0,
  distributed_at TIMESTAMPTZ,
  distributed_by UUID REFERENCES public.profiles(id),
  UNIQUE(exam_schedule_id, hall_id)
);

-- Answer script collection & bundling
CREATE TABLE IF NOT EXISTS public.exam_script_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES public.exam_halls(id),
  bundle_number INT,
  subject_code TEXT,
  total_scripts INT DEFAULT 0,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'collected' CHECK (status IN ('collected', 'bundled', 'handed_over')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Script bundle contents (optional: link scripts to bundle)
CREATE TABLE IF NOT EXISTS public.exam_script_bundle_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.exam_script_bundles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence_number INT,
  UNIQUE(bundle_id, student_id)
);

-- Seating arrangement: add mixing_strategy for anti-copying
ALTER TABLE public.exam_seating_arrangements
  ADD COLUMN IF NOT EXISTS mixing_strategy TEXT,
  ADD COLUMN IF NOT EXISTS mixed_with_section_ids UUID[];

-- RLS
ALTER TABLE public.exam_external_examiners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_squad_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_question_paper_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_script_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_script_bundle_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all exam_external_examiners" ON public.exam_external_examiners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all exam_squad_duties" ON public.exam_squad_duties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all exam_materials" ON public.exam_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all exam_question_paper_distribution" ON public.exam_question_paper_distribution FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all exam_script_bundles" ON public.exam_script_bundles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all exam_script_bundle_contents" ON public.exam_script_bundle_contents FOR ALL TO authenticated USING (true) WITH CHECK (true);
