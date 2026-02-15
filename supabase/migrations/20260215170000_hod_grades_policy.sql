-- HOD can view grades and enrollments for their department's courses
CREATE POLICY "HODs can view grades for their department" ON public.grades FOR SELECT USING (
  has_role(auth.uid(), 'hod') AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE e.id = grades.enrollment_id AND c.department_id = p.department_id
  )
);

CREATE POLICY "HODs can view enrollments for their department" ON public.enrollments FOR SELECT USING (
  has_role(auth.uid(), 'hod') AND EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = enrollments.course_id AND c.department_id = p.department_id
  )
);
