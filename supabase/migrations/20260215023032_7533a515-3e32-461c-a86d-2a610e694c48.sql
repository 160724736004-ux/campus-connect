
-- Fix: restrict alert insertion to authenticated users with proper roles instead of open INSERT
DROP POLICY "System can insert alerts" ON public.attendance_alerts;
CREATE POLICY "Authenticated can insert alerts" ON public.attendance_alerts FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty') OR has_role(auth.uid(), 'hod'));
