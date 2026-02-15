
-- Extend profiles with additional admission fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS admission_number text,
  ADD COLUMN IF NOT EXISTS admission_quota text DEFAULT 'convener',
  ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hostel_allocation text,
  ADD COLUMN IF NOT EXISTS transport_allocation text,
  ADD COLUMN IF NOT EXISTS library_card_number text,
  ADD COLUMN IF NOT EXISTS id_card_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_earned integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backlogs integer DEFAULT 0;

-- Create admissions table for tracking admission workflow
CREATE TABLE public.admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  gender text,
  category text,
  admission_quota text DEFAULT 'convener',
  program_id uuid REFERENCES public.programs(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  merit_score numeric,
  merit_rank integer,
  application_number text UNIQUE,
  status text NOT NULL DEFAULT 'applied',
  seat_allotted boolean DEFAULT false,
  fee_paid boolean DEFAULT false,
  converted_to_student boolean DEFAULT false,
  student_profile_id uuid REFERENCES public.profiles(id),
  documents_verified boolean DEFAULT false,
  remarks text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admissions" ON public.admissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "HODs can view admissions" ON public.admissions FOR SELECT
  USING (has_role(auth.uid(), 'hod'::app_role));

-- Create student_documents table
CREATE TABLE public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES public.profiles(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_documents" ON public.student_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own documents" ON public.student_documents FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can upload own documents" ON public.student_documents FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Create student_status_changes table for status history
CREATE TABLE public.student_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage status_changes" ON public.student_status_changes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own status_changes" ON public.student_status_changes FOR SELECT
  USING (student_id = auth.uid());

-- Create student_promotions table for progression tracking
CREATE TABLE public.student_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_year integer NOT NULL,
  to_year integer NOT NULL,
  from_semester integer,
  to_semester integer,
  promotion_type text NOT NULL DEFAULT 'promoted',
  academic_year_id uuid REFERENCES public.academic_years(id),
  credits_at_promotion integer DEFAULT 0,
  backlogs_at_promotion integer DEFAULT 0,
  remarks text,
  promoted_by uuid REFERENCES public.profiles(id),
  promoted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promotions" ON public.student_promotions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own promotions" ON public.student_promotions FOR SELECT
  USING (student_id = auth.uid());

-- Storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can manage all student documents" ON storage.objects FOR ALL
  USING (bucket_id = 'student-documents' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'student-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can upload own documents to storage" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own documents in storage" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Sequence for admission numbers
CREATE SEQUENCE IF NOT EXISTS admission_number_seq START 1;

-- Function to generate admission number
CREATE OR REPLACE FUNCTION public.generate_admission_number(year_prefix text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val integer;
  prefix text;
BEGIN
  seq_val := nextval('admission_number_seq');
  prefix := COALESCE(year_prefix, to_char(now(), 'YY'));
  RETURN prefix || 'ADM' || lpad(seq_val::text, 5, '0');
END;
$$;
