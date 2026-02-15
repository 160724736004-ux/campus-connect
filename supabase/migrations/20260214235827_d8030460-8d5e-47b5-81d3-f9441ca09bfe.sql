
-- Add prerequisites to courses (stores comma-separated course codes)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prerequisites TEXT;

-- Allow faculty to also manage course schedules for their own courses
CREATE POLICY "Faculty can insert schedules for own courses" ON public.course_schedules 
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'faculty') AND EXISTS (
    SELECT 1 FROM public.courses WHERE courses.id = course_schedules.course_id AND courses.faculty_id = auth.uid()
  )
);

CREATE POLICY "Faculty can update schedules for own courses" ON public.course_schedules 
FOR UPDATE USING (
  has_role(auth.uid(), 'faculty') AND EXISTS (
    SELECT 1 FROM public.courses WHERE courses.id = course_schedules.course_id AND courses.faculty_id = auth.uid()
  )
);

CREATE POLICY "Faculty can delete schedules for own courses" ON public.course_schedules 
FOR DELETE USING (
  has_role(auth.uid(), 'faculty') AND EXISTS (
    SELECT 1 FROM public.courses WHERE courses.id = course_schedules.course_id AND courses.faculty_id = auth.uid()
  )
);

-- HOD policies for course_schedules
CREATE POLICY "HOD can manage schedules" ON public.course_schedules 
FOR INSERT WITH CHECK (has_role(auth.uid(), 'hod'));

CREATE POLICY "HOD can update schedules" ON public.course_schedules 
FOR UPDATE USING (has_role(auth.uid(), 'hod'));

CREATE POLICY "HOD can delete schedules" ON public.course_schedules 
FOR DELETE USING (has_role(auth.uid(), 'hod'));
