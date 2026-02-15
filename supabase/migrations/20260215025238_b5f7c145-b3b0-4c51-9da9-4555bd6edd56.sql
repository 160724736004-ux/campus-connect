
-- Custom fields system: allows admin to add dynamic fields to any entity
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'student', 'faculty', 'course', 'department', 'program', 'admission', 'batch'
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select', 'textarea', 'checkbox', 'email', 'phone', 'url'
  field_options JSONB DEFAULT '[]'::jsonb, -- for select type: ["Option1","Option2"]
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  default_value TEXT,
  validation_regex TEXT,
  section_group TEXT DEFAULT 'Custom Fields', -- grouping label in UI
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, field_name)
);

CREATE TABLE public.custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- the id of the student/faculty/course/etc.
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(custom_field_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- Policies for custom_fields (admin manages, everyone can view)
CREATE POLICY "Admins can manage custom_fields"
  ON public.custom_fields FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view custom_fields"
  ON public.custom_fields FOR SELECT
  USING (true);

-- Policies for custom_field_values
CREATE POLICY "Admins can manage custom_field_values"
  ON public.custom_field_values FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HODs can manage custom_field_values"
  ON public.custom_field_values FOR ALL
  USING (public.has_role(auth.uid(), 'hod'))
  WITH CHECK (public.has_role(auth.uid(), 'hod'));

CREATE POLICY "Faculty can view custom_field_values"
  ON public.custom_field_values FOR SELECT
  USING (public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can view own custom_field_values"
  ON public.custom_field_values FOR SELECT
  USING (entity_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_custom_field_values_entity ON public.custom_field_values(entity_id);
CREATE INDEX idx_custom_fields_entity_type ON public.custom_fields(entity_type);
