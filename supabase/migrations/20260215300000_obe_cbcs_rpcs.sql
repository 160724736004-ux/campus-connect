-- ============================================
-- OBE & CBCS RPCs: Compute attainment, sync credits, approve/reject
-- ============================================

-- RPC: Approve or reject credit transfer
CREATE OR REPLACE FUNCTION public.approve_credit_transfer(p_transfer_id UUID, p_status TEXT, p_remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO v_transfer FROM public.credit_transfers WHERE id = p_transfer_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not pending';
  END IF;
  UPDATE public.credit_transfers SET status = p_status, approved_by = auth.uid(), approved_at = now(), remarks = COALESCE(p_remarks, remarks) WHERE id = p_transfer_id;
  IF p_status = 'approved' THEN
    INSERT INTO public.student_credit_summary (student_id, credits_earned, credits_transferred, credits_mooc, updated_at)
    SELECT v_transfer.student_id, COALESCE((SELECT credits_earned FROM public.student_credit_summary WHERE student_id = v_transfer.student_id LIMIT 1), 0), COALESCE((SELECT credits_transferred FROM public.student_credit_summary WHERE student_id = v_transfer.student_id LIMIT 1), 0) + v_transfer.credits, COALESCE((SELECT credits_mooc FROM public.student_credit_summary WHERE student_id = v_transfer.student_id LIMIT 1), 0), now()
    ON CONFLICT (student_id) DO UPDATE SET credits_transferred = public.student_credit_summary.credits_transferred + v_transfer.credits, updated_at = now();
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_credit_transfer(UUID, TEXT, TEXT) TO authenticated;

-- RPC: Approve or reject MOOC credit
CREATE OR REPLACE FUNCTION public.approve_mooc_credit(p_mooc_id UUID, p_status TEXT, p_remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mooc RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO v_mooc FROM public.mooc_credits WHERE id = p_mooc_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOOC credit not found or not pending';
  END IF;
  UPDATE public.mooc_credits SET status = p_status, approved_by = auth.uid(), approved_at = now(), remarks = COALESCE(p_remarks, remarks) WHERE id = p_mooc_id;
  IF p_status = 'approved' THEN
    INSERT INTO public.student_credit_summary (student_id, credits_earned, credits_transferred, credits_mooc, updated_at)
    SELECT v_mooc.student_id, COALESCE((SELECT credits_earned FROM public.student_credit_summary WHERE student_id = v_mooc.student_id LIMIT 1), 0), COALESCE((SELECT credits_transferred FROM public.student_credit_summary WHERE student_id = v_mooc.student_id LIMIT 1), 0), COALESCE((SELECT credits_mooc FROM public.student_credit_summary WHERE student_id = v_mooc.student_id LIMIT 1), 0) + v_mooc.credits, now()
    ON CONFLICT (student_id) DO UPDATE SET credits_mooc = public.student_credit_summary.credits_mooc + v_mooc.credits, updated_at = now();
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_mooc_credit(UUID, TEXT, TEXT) TO authenticated;

-- RPC: Sync student credits from grades (credits_earned)
CREATE OR REPLACE FUNCTION public.sync_student_credits(p_student_id UUID DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  v_updated INT := 0;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  FOR r IN
    SELECT e.student_id,
           COALESCE(SUM(c.credits), 0)::NUMERIC(8,2) AS earned
    FROM public.enrollments e
    JOIN public.grades g ON g.enrollment_id = e.id AND g.letter_grade IS NOT NULL AND g.letter_grade != 'F' AND g.letter_grade != 'W' AND g.letter_grade != 'I' AND g.letter_grade != ''
    JOIN public.courses c ON c.id = e.course_id
    WHERE (p_student_id IS NULL OR e.student_id = p_student_id)
    GROUP BY e.student_id
  LOOP
    INSERT INTO public.student_credit_summary (student_id, credits_earned, credits_transferred, credits_mooc, updated_at)
    VALUES (r.student_id, r.earned,
      COALESCE((SELECT credits_transferred FROM public.student_credit_summary WHERE student_id = r.student_id LIMIT 1), 0),
      COALESCE((SELECT credits_mooc FROM public.student_credit_summary WHERE student_id = r.student_id LIMIT 1), 0),
      now())
    ON CONFLICT (student_id) DO UPDATE SET credits_earned = r.earned, updated_at = now();
    v_updated := v_updated + 1;
  END LOOP;
  RETURN v_updated;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_student_credits(UUID) TO authenticated;

-- RPC: Compute CO attainment for a course/semester
CREATE OR REPLACE FUNCTION public.compute_co_attainment(
  p_course_id UUID,
  p_semester_text TEXT,
  p_academic_year_id UUID DEFAULT NULL,
  p_target NUMERIC DEFAULT 70
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_co RECORD;
  v_mapping RECORD;
  v_total_students INT;
  v_above_threshold INT;
  v_actual NUMERIC;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  FOR v_co IN SELECT co.id, co.course_id FROM public.course_outcomes co WHERE co.course_id = p_course_id
  LOOP
    SELECT COUNT(DISTINCT e.id) INTO v_total_students
    FROM public.enrollments e
    WHERE e.course_id = p_course_id AND e.semester = p_semester_text AND e.status IN ('enrolled', 'completed');
    IF v_total_students = 0 THEN CONTINUE; END IF;
    SELECT COUNT(*) INTO v_above_threshold
    FROM (
      SELECT e.id, AVG((acm.marks_obtained / NULLIF(acd.max_marks, 0)) * 100) AS pct
      FROM public.enrollments e
      JOIN public.assessment_component_marks acm ON acm.enrollment_id = e.id
      JOIN public.assessment_component_definitions acd ON acd.id = acm.component_definition_id
      JOIN public.assessment_co_mapping aco ON aco.component_definition_id = acd.id AND aco.course_outcome_id = v_co.id
      WHERE e.course_id = p_course_id AND e.semester = p_semester_text AND e.status IN ('enrolled', 'completed') AND acm.marks_obtained IS NOT NULL
      GROUP BY e.id
      HAVING AVG((acm.marks_obtained / NULLIF(acd.max_marks, 0)) * 100) >= p_target
    ) sub;
    v_actual := CASE WHEN v_total_students > 0 THEN (v_above_threshold::NUMERIC / v_total_students) * 100 ELSE NULL END;
    INSERT INTO public.co_attainment (course_id, course_outcome_id, semester_text, academic_year_id, target_attainment, actual_attainment, students_above_threshold, total_students)
    VALUES (p_course_id, v_co.id, p_semester_text, p_academic_year_id, p_target, v_actual, v_above_threshold, v_total_students)
    ON CONFLICT (course_id, course_outcome_id, semester_text, academic_year_id) DO UPDATE
    SET actual_attainment = EXCLUDED.actual_attainment, students_above_threshold = EXCLUDED.students_above_threshold, total_students = EXCLUDED.total_students, computed_at = now();
  END LOOP;
  RETURN (SELECT COUNT(*) FROM public.course_outcomes WHERE course_id = p_course_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.compute_co_attainment(UUID, TEXT, UUID, NUMERIC) TO authenticated;
