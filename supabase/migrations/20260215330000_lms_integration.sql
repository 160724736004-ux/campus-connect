-- ============================================
-- 67. Learning Management System (LMS) Integration
-- ============================================

-- Storage bucket for LMS content
INSERT INTO storage.buckets (id, name, public) VALUES ('lms-content', 'lms-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for LMS content
CREATE POLICY "LMS content upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lms-content' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')));
CREATE POLICY "LMS content read" ON storage.objects FOR SELECT
  USING (bucket_id = 'lms-content');

-- Modules/Units for organizing course content
CREATE TABLE IF NOT EXISTS public.lms_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, sequence)
);

ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view modules" ON public.lms_modules FOR SELECT USING (true);
CREATE POLICY "Faculty manage modules" ON public.lms_modules FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Course content repository (notes, PDFs, videos, links)
CREATE TABLE IF NOT EXISTS public.lms_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.lms_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('notes', 'pdf', 'video', 'link', 'recorded_lecture')),
  file_url TEXT,
  embed_url TEXT,
  external_url TEXT,
  duration_minutes INT,
  description TEXT,
  sequence INT DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view content" ON public.lms_content FOR SELECT USING (true);
CREATE POLICY "Faculty manage content" ON public.lms_content FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Live class sessions (Zoom, Teams, Google Meet)
CREATE TABLE IF NOT EXISTS public.lms_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_url TEXT NOT NULL,
  meeting_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('zoom', 'teams', 'google_meet', 'other')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view live sessions" ON public.lms_live_sessions FOR SELECT USING (true);
CREATE POLICY "Faculty manage live sessions" ON public.lms_live_sessions FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Assignments
CREATE TABLE IF NOT EXISTS public.lms_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.lms_modules(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_marks NUMERIC(8,2) DEFAULT 100,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view assignments" ON public.lms_assignments FOR SELECT USING (true);
CREATE POLICY "Faculty manage assignments" ON public.lms_assignments FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Assignment submissions
CREATE TABLE IF NOT EXISTS public.lms_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  marks_awarded NUMERIC(8,2),
  feedback TEXT,
  graded_by UUID REFERENCES public.profiles(id),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.lms_assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own submissions" ON public.lms_assignment_submissions FOR SELECT USING (student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty'));
CREATE POLICY "Students insert own" ON public.lms_assignment_submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own" ON public.lms_assignment_submissions FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Faculty grade" ON public.lms_assignment_submissions FOR UPDATE USING (has_role(auth.uid(), 'faculty') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'admin'));

-- Discussion forums
CREATE TABLE IF NOT EXISTS public.lms_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.lms_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view discussions" ON public.lms_discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated post discussions" ON public.lms_discussions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author edit own" ON public.lms_discussions FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

-- Student-faculty messaging
CREATE TABLE IF NOT EXISTS public.lms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own messages" ON public.lms_messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Send messages" ON public.lms_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Recipient mark read" ON public.lms_messages FOR UPDATE USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

-- Progress tracking (content completion)
CREATE TABLE IF NOT EXISTS public.lms_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.lms_content(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, content_id)
);

ALTER TABLE public.lms_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own progress" ON public.lms_progress FOR SELECT USING (student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty'));
CREATE POLICY "Update own progress" ON public.lms_progress FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Gamification: badges
CREATE TABLE IF NOT EXISTS public.lms_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view badges" ON public.lms_badges FOR SELECT USING (true);
CREATE POLICY "Faculty manage badges" ON public.lms_badges FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lms_student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.lms_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  awarded_by UUID REFERENCES public.profiles(id),
  UNIQUE(student_id, badge_id)
);

ALTER TABLE public.lms_student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View badges" ON public.lms_student_badges FOR SELECT USING (true);
CREATE POLICY "Faculty award badges" ON public.lms_student_badges FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Leaderboard / points
CREATE TABLE IF NOT EXISTS public.lms_student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id)
);

ALTER TABLE public.lms_student_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View points" ON public.lms_student_points FOR SELECT USING (true);
CREATE POLICY "Update points" ON public.lms_student_points FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty')) WITH CHECK (true);

-- Engagement analytics
CREATE TABLE IF NOT EXISTS public.lms_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.lms_content(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'complete', 'download', 'quiz_attempt', 'assignment_submit', 'discussion_post')),
  duration_seconds INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_engagement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own engagement" ON public.lms_engagement FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Faculty view engagement" ON public.lms_engagement FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hod') OR has_role(auth.uid(), 'faculty'));
