-- ============================================
-- Payment Collection & Tracking (42 & 43)
-- ============================================

-- Extend payment_method to support all modes
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check CHECK (
  payment_method IN ('cash', 'card', 'bank_transfer', 'bank_deposit', 'online', 'cheque', 'dd', 'upi', 'wallet')
);

-- Extend payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS cheque_dd_number TEXT,
  ADD COLUMN IF NOT EXISTS cheque_dd_date DATE,
  ADD COLUMN IF NOT EXISTS upi_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Late fee on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2);

-- Payment receipts (for generation)
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE UNIQUE,
  receipt_number TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own receipts" ON public.payment_receipts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.payments p JOIN public.invoices i ON i.id = p.invoice_id WHERE p.id = payment_id AND i.student_id = auth.uid())
);
CREATE POLICY "Admins manage receipts" ON public.payment_receipts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function: record payment with receipt and update balance
CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_cheque_dd_number TEXT DEFAULT NULL,
  p_cheque_dd_date DATE DEFAULT NULL,
  p_upi_transaction_id TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment_id UUID;
  v_receipt_num TEXT;
  v_inv RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  v_receipt_num := 'RCP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || REPLACE(SUBSTRING(gen_random_uuid()::TEXT, 1, 8), '-', '');
  INSERT INTO public.payments (invoice_id, amount, payment_method, reference_number, transaction_id, bank_name, cheque_dd_number, cheque_dd_date, upi_transaction_id, remarks, confirmed_at, confirmed_by)
  VALUES (p_invoice_id, p_amount, p_payment_method, p_reference_number, p_transaction_id, p_bank_name, p_cheque_dd_number, p_cheque_dd_date, p_upi_transaction_id, p_remarks, now(), auth.uid())
  RETURNING id INTO v_payment_id;
  UPDATE public.payments SET receipt_number = v_receipt_num WHERE id = v_payment_id;
  INSERT INTO public.payment_receipts (payment_id, receipt_number, generated_by) VALUES (v_payment_id, v_receipt_num, auth.uid());
  UPDATE public.invoices SET
    paid_amount = COALESCE(paid_amount, 0) + p_amount,
    status = CASE
      WHEN COALESCE(paid_amount, 0) + p_amount >= total_amount THEN 'paid'
      WHEN due_date < CURRENT_DATE AND COALESCE(paid_amount, 0) + p_amount < total_amount THEN 'overdue'
      ELSE 'partial'
    END
  WHERE id = p_invoice_id;
  RETURN v_payment_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;

-- Function: add late fee to overdue invoice
CREATE OR REPLACE FUNCTION public.add_late_fee(p_invoice_id UUID, p_late_fee_amount NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.invoices SET
    base_amount = COALESCE(base_amount, total_amount),
    late_fee_amount = COALESCE(late_fee_amount, 0) + p_late_fee_amount,
    total_amount = COALESCE(base_amount, total_amount) + COALESCE(late_fee_amount, 0) + p_late_fee_amount,
    status = 'overdue'
  WHERE id = p_invoice_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_late_fee(UUID, NUMERIC) TO authenticated;
