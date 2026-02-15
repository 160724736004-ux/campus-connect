
-- Salary structures: one record per staff member
CREATE TABLE public.salary_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  designation TEXT NOT NULL DEFAULT '',
  base_salary NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage salary_structures" ON public.salary_structures FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view own salary" ON public.salary_structures FOR SELECT USING (user_id = auth.uid());

-- Allowance types
CREATE TABLE public.allowance_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  default_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.allowance_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage allowance_types" ON public.allowance_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view allowance_types" ON public.allowance_types FOR SELECT USING (true);

-- Deduction types
CREATE TABLE public.deduction_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  default_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage deduction_types" ON public.deduction_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view deduction_types" ON public.deduction_types FOR SELECT USING (true);

-- Leave types
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  max_days_per_year INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leave_types" ON public.leave_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view leave_types" ON public.leave_types FOR SELECT USING (true);

-- Leave requests
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INT NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leave_requests" ON public.leave_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view own leave_requests" ON public.leave_requests FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "Staff can insert own leave_requests" ON public.leave_requests FOR INSERT WITH CHECK (staff_id = auth.uid());

-- Payroll runs
CREATE TABLE public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INT NOT NULL,
  year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payroll_runs" ON public.payroll_runs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Payslips
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id),
  base_salary NUMERIC NOT NULL DEFAULT 0,
  total_allowances NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payslips" ON public.payslips FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view own payslips" ON public.payslips FOR SELECT USING (staff_id = auth.uid());
