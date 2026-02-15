
-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  semester TEXT NOT NULL DEFAULT 'Fall 2026',
  max_students INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- COURSE SCHEDULES TABLE
-- =============================================
CREATE TABLE public.course_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schedules" ON public.course_schedules FOR SELECT USING (true);
CREATE POLICY "Admins can insert schedules" ON public.course_schedules FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update schedules" ON public.course_schedules FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete schedules" ON public.course_schedules FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- ENROLLMENTS TABLE
-- =============================================
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Fall 2026',
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, semester)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view enrollments for their courses" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.faculty_id = auth.uid())
);
CREATE POLICY "Students can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid() AND has_role(auth.uid(), 'student'));
CREATE POLICY "Admins can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update enrollments" ON public.enrollments FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can drop own enrollment" ON public.enrollments FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins can delete enrollments" ON public.enrollments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- GRADES TABLE
-- =============================================
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE UNIQUE,
  letter_grade TEXT CHECK (letter_grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','W','I')),
  numeric_grade NUMERIC(5,2),
  grade_points NUMERIC(3,2),
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own grades" ON public.grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.id = grades.enrollment_id AND enrollments.student_id = auth.uid())
);
CREATE POLICY "Admins can view all grades" ON public.grades FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view grades for their courses" ON public.grades FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = grades.enrollment_id AND c.faculty_id = auth.uid()
  )
);
CREATE POLICY "Faculty can insert grades" ON public.grades FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'faculty') AND (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.id = grades.enrollment_id AND c.faculty_id = auth.uid()
    )
  )
);
CREATE POLICY "Admins can insert grades" ON public.grades FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can update grades" ON public.grades FOR UPDATE USING (
  has_role(auth.uid(), 'faculty') AND (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.id = grades.enrollment_id AND c.faculty_id = auth.uid()
    )
  )
);
CREATE POLICY "Admins can update grades" ON public.grades FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- FEE STRUCTURES TABLE
-- =============================================
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  tuition_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_fees NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fee structures" ON public.fee_structures FOR SELECT USING (true);
CREATE POLICY "Admins can insert fee structures" ON public.fee_structures FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update fee structures" ON public.fee_structures FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete fee structures" ON public.fee_structures FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own invoices" ON public.invoices FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can view all invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert invoices" ON public.invoices FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update invoices" ON public.invoices FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online')),
  reference_number TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND invoices.student_id = auth.uid())
);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- ATTENDANCE RECORDS TABLE
-- =============================================
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  marked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id, date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance" ON public.attendance_records FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can view all attendance" ON public.attendance_records FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view attendance for their courses" ON public.attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = attendance_records.course_id AND courses.faculty_id = auth.uid())
);
CREATE POLICY "Faculty can mark attendance" ON public.attendance_records FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'faculty') AND (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = attendance_records.course_id AND courses.faculty_id = auth.uid())
  )
);
CREATE POLICY "Admins can insert attendance" ON public.attendance_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can update attendance" ON public.attendance_records FOR UPDATE USING (
  has_role(auth.uid(), 'faculty') AND (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = attendance_records.course_id AND courses.faculty_id = auth.uid())
  )
);
CREATE POLICY "Admins can update attendance" ON public.attendance_records FOR UPDATE USING (has_role(auth.uid(), 'admin'));
