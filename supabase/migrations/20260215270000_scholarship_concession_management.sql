-- ============================================
-- Scholarship Management (46) & Fee Concession/Waiver (47)
-- ============================================

-- Scholarship scheme types
CREATE TABLE IF NOT EXISTS public.scholarship_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scheme_type TEXT NOT NULL CHECK (scheme_type IN ('government', 'institutional', 'merit', 'sports', 'need_based')),
  fee_reimbursement BOOLEAN DEFAULT false,
  eligibility_criteria JSONB DEFAULT '{}',
  max_amount NUMERIC(12,2),
  max_percent NUMERIC(5,2),
  description TEXT,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scholarship_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view scholarship_schemes" ON public.scholarship_schemes FOR SELECT USING (true);
CREATE POLICY "Admins manage scholarship_schemes" ON public.scholarship_schemes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Scholarship applications
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheme_id UUID NOT NULL REFERENCES public.scholarship_schemes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  semester_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  amount_approved NUMERIC(12,2),
  percent_approved NUMERIC(5,2),
  supporting_doc_paths TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own scholarship_applications" ON public.scholarship_applications FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own scholarship_applications" ON public.scholarship_applications FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own draft applications" ON public.scholarship_applications FOR UPDATE USING (student_id = auth.uid() AND status = 'draft') WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage scholarship_applications" ON public.scholarship_applications FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Reimbursement claims (for fee reimbursement schemes)
CREATE TABLE IF NOT EXISTS public.scholarship_reimbursement_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  claim_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'rejected')),
  claimed_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scholarship_reimbursement_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reimbursement_claims" ON public.scholarship_reimbursement_claims FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own reimbursement via app" ON public.scholarship_reimbursement_claims FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scholarship_applications sa WHERE sa.id = scholarship_application_id AND sa.student_id = auth.uid())
);

-- Scholarship disbursements (fee reduction applied or cash disbursed)
CREATE TABLE IF NOT EXISTS public.scholarship_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  reimbursement_claim_id UUID REFERENCES public.scholarship_reimbursement_claims(id) ON DELETE SET NULL,
  disbursement_type TEXT NOT NULL CHECK (disbursement_type IN ('fee_reduction', 'cash_reimbursement')),
  amount NUMERIC(12,2) NOT NULL,
  disbursed_at TIMESTAMPTZ DEFAULT now(),
  disbursement_ref TEXT,
  payment_ref TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scholarship_disbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage disbursements" ON public.scholarship_disbursements FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own disbursements" ON public.scholarship_disbursements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scholarship_applications sa WHERE sa.id = scholarship_application_id AND sa.student_id = auth.uid())
);

-- Fee concession/waiver applications (student-initiated)
CREATE TABLE IF NOT EXISTS public.fee_concession_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concession_type TEXT NOT NULL CHECK (concession_type IN ('waiver', 'concession')),
  amount NUMERIC(12,2),
  percent NUMERIC(5,2),
  full_waiver BOOLEAN DEFAULT false,
  fee_structure_id UUID REFERENCES public.fee_structure_definitions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id),
  semester_text TEXT,
  description TEXT,
  supporting_doc_paths TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  remarks TEXT,
  concession_id UUID REFERENCES public.fee_concessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fee_concession_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own concession_applications" ON public.fee_concession_applications FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own concession_applications" ON public.fee_concession_applications FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own draft concession_applications" ON public.fee_concession_applications FOR UPDATE USING (student_id = auth.uid() AND status = 'draft') WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage concession_applications" ON public.fee_concession_applications FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Extend fee_concessions: link to application
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.fee_concession_applications(id) ON DELETE SET NULL;

-- RPC: Submit scholarship application
CREATE OR REPLACE FUNCTION public.submit_scholarship_application(p_app_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.scholarship_applications WHERE id = p_app_id AND student_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized or not found';
  END IF;
  UPDATE public.scholarship_applications
  SET status = 'submitted', submitted_at = now(), updated_at = now()
  WHERE id = p_app_id AND status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already submitted';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_scholarship_application(UUID) TO authenticated;

-- RPC: Approve/reject scholarship application (admin)
CREATE OR REPLACE FUNCTION public.review_scholarship_application(
  p_app_id UUID, p_status TEXT, p_amount NUMERIC DEFAULT NULL, p_percent NUMERIC DEFAULT NULL, p_remarks TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_status NOT IN ('approved', 'rejected', 'under_review') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.scholarship_applications
  SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now(),
      amount_approved = COALESCE(p_amount, amount_approved), percent_approved = COALESCE(p_percent, percent_approved), remarks = COALESCE(p_remarks, remarks)
  WHERE id = p_app_id AND status IN ('submitted', 'under_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not in reviewable state';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_scholarship_application(UUID, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- RPC: Submit fee concession application
CREATE OR REPLACE FUNCTION public.submit_concession_application(p_app_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fee_concession_applications WHERE id = p_app_id AND student_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized or not found';
  END IF;
  UPDATE public.fee_concession_applications
  SET status = 'submitted', submitted_at = now(), updated_at = now()
  WHERE id = p_app_id AND status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already submitted';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_concession_application(UUID) TO authenticated;

-- RPC: Approve concession and create fee_concession
CREATE OR REPLACE FUNCTION public.approve_concession_application(
  p_app_id UUID, p_remarks TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app RECORD;
  v_concession_id UUID;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_app FROM public.fee_concession_applications WHERE id = p_app_id AND status IN ('submitted', 'under_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not in reviewable state';
  END IF;
  INSERT INTO public.fee_concessions (student_id, fee_structure_id, concession_type, amount, percent, description, valid_from, valid_until, is_active, application_id)
  VALUES (
    v_app.student_id, v_app.fee_structure_id,
    CASE v_app.concession_type WHEN 'waiver' THEN 'fee_waiver' ELSE 'discount' END,
    CASE WHEN v_app.full_waiver THEN NULL ELSE v_app.amount END,
    CASE WHEN v_app.full_waiver THEN 100 ELSE v_app.percent END,
    v_app.description,
    CURRENT_DATE, (SELECT end_date FROM public.academic_years WHERE id = v_app.academic_year_id) OR (CURRENT_DATE + interval '1 year'),
    true, p_app_id
  )
  RETURNING id INTO v_concession_id;
  UPDATE public.fee_concession_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), concession_id = v_concession_id, remarks = COALESCE(p_remarks, remarks), updated_at = now()
  WHERE id = p_app_id;
  RETURN v_concession_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_concession_application(UUID, TEXT) TO authenticated;

-- RPC: Reject concession application
CREATE OR REPLACE FUNCTION public.reject_concession_application(p_app_id UUID, p_remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.fee_concession_applications
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), remarks = COALESCE(p_remarks, remarks), updated_at = now()
  WHERE id = p_app_id AND status IN ('submitted', 'under_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not in reviewable state';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_concession_application(UUID, TEXT) TO authenticated;

-- Seed some scholarship schemes
INSERT INTO public.scholarship_schemes (code, name, scheme_type, fee_reimbursement, max_percent, eligibility_criteria) VALUES
  ('govt-post-matric', 'Government Post-Matric Scholarship', 'government', true, 100, '{"min_income": "below_limit", "category": ["sc","st","obc"]}'),
  ('merit-top', 'Merit Scholarship (Top Rank)', 'merit', false, 50, '{"min_cgpa": 8.5}'),
  ('sports-quota', 'Sports Scholarship', 'sports', false, 25, '{"sports_level": "state_national"}'),
  ('need-based', 'Need-Based Financial Aid', 'need_based', false, 30, '{"income_limit": true}'),
  ('inst-merit', 'Institutional Merit Scholarship', 'institutional', false, 20, '{"min_cgpa": 7.5}')
ON CONFLICT (code) DO NOTHING;
