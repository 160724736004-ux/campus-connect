import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Faculty from "./pages/Faculty";
import Departments from "./pages/Departments";
import Programs from "./pages/Programs";
import Courses from "./pages/Courses";
import Grading from "./pages/Grading";
import Grades from "./pages/Grades";
import Finance from "./pages/Finance";
import HRPayroll from "./pages/HRPayroll";
import Attendance from "./pages/Attendance";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import InstitutionSetup from "./pages/InstitutionSetup";
import AcademicYears from "./pages/AcademicYears";
import Batches from "./pages/Batches";
import AcademicStructure from "./pages/AcademicStructure";
import AssessmentComponents from "./pages/AssessmentComponents";
import ExamScheduling from "./pages/ExamScheduling";
import MarksEntry from "./pages/MarksEntry";
import ExternalMarksEntry from "./pages/ExternalMarksEntry";
import MarksApproval from "./pages/MarksApproval";
import MarksPublication from "./pages/MarksPublication";
import MarksReports from "./pages/MarksReports";
import Backlogs from "./pages/Backlogs";
import BacklogRegistration from "./pages/BacklogRegistration";
import ExamSpecialFeatures from "./pages/ExamSpecialFeatures";
import OBEAndCBCS from "./pages/OBEAndCBCS";
import QuestionBankAndOnlineExam from "./pages/QuestionBankAndOnlineExam";
import LessonPlan from "./pages/LessonPlan";
import LMS from "./pages/LMS";
import OnlineExamTake from "./pages/OnlineExamTake";
import StudentTimetable from "./pages/StudentTimetable";
import StudentNotifications from "./pages/StudentNotifications";
import StudentLeave from "./pages/StudentLeave";
import StudentHallTickets from "./pages/StudentHallTickets";
import StudentCertificates from "./pages/StudentCertificates";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import StudentMessages from "./pages/StudentMessages";
import StudentFeedback from "./pages/StudentFeedback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/institution" element={<ProtectedRoute allowedRoles={["admin"]}><InstitutionSetup /></ProtectedRoute>} />
            <Route path="/academic-years" element={<ProtectedRoute allowedRoles={["admin"]}><AcademicYears /></ProtectedRoute>} />
            <Route path="/batches" element={<ProtectedRoute allowedRoles={["admin"]}><Batches /></ProtectedRoute>} />
            <Route path="/academic-structure" element={<ProtectedRoute><AcademicStructure /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><Students /></ProtectedRoute>} />
            <Route path="/faculty" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><Faculty /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute allowedRoles={["admin"]}><Departments /></ProtectedRoute>} />
            <Route path="/programs" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><Programs /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/grading" element={<ProtectedRoute allowedRoles={["admin", "faculty", "hod"]}><Grading /></ProtectedRoute>} />
            <Route path="/assessment-components" element={<ProtectedRoute allowedRoles={["admin", "faculty", "hod"]}><AssessmentComponents /></ProtectedRoute>} />
            <Route path="/exam-scheduling" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><ExamScheduling /></ProtectedRoute>} />
            <Route path="/marks-entry" element={<ProtectedRoute allowedRoles={["admin", "faculty", "hod"]}><MarksEntry /></ProtectedRoute>} />
            <Route path="/external-marks-entry" element={<ProtectedRoute allowedRoles={["admin", "faculty", "hod"]}><ExternalMarksEntry /></ProtectedRoute>} />
            <Route path="/marks-approval" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><MarksApproval /></ProtectedRoute>} />
            <Route path="/marks-publication" element={<ProtectedRoute allowedRoles={["admin", "hod"]}><MarksPublication /></ProtectedRoute>} />
            <Route path="/marks-reports" element={<ProtectedRoute allowedRoles={["admin", "hod", "faculty"]}><MarksReports /></ProtectedRoute>} />
            <Route path="/grades" element={<ProtectedRoute allowedRoles={["student"]}><Grades /></ProtectedRoute>} />
            <Route path="/backlogs" element={<ProtectedRoute allowedRoles={["student", "admin", "hod"]}><Backlogs /></ProtectedRoute>} />
            <Route path="/backlog-registration" element={<ProtectedRoute allowedRoles={["student"]}><BacklogRegistration /></ProtectedRoute>} />
            <Route path="/exam-features" element={<ProtectedRoute allowedRoles={["admin", "hod", "student"]}><ExamSpecialFeatures /></ProtectedRoute>} />
            <Route path="/obe-cbcs" element={<ProtectedRoute allowedRoles={["admin", "hod", "student"]}><OBEAndCBCS /></ProtectedRoute>} />
            <Route path="/question-bank" element={<ProtectedRoute allowedRoles={["admin", "hod", "faculty", "student"]}><QuestionBankAndOnlineExam /></ProtectedRoute>} />
            <Route path="/lesson-plan" element={<ProtectedRoute allowedRoles={["admin", "hod", "faculty", "student"]}><LessonPlan /></ProtectedRoute>} />
            <Route path="/lms" element={<ProtectedRoute allowedRoles={["admin", "hod", "faculty", "student"]}><LMS /></ProtectedRoute>} />
            <Route path="/online-exam/:testId" element={<ProtectedRoute allowedRoles={["student"]}><OnlineExamTake /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={["admin", "student"]}><Finance /></ProtectedRoute>} />
            <Route path="/hr-payroll" element={<ProtectedRoute allowedRoles={["admin", "faculty", "hod"]}><HRPayroll /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute allowedRoles={["student", "faculty", "admin", "hod"]}><Schedule /></ProtectedRoute>} />
            <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={["student"]}><StudentTimetable /></ProtectedRoute>} />
            <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={["student"]}><StudentNotifications /></ProtectedRoute>} />
            <Route path="/student/leave" element={<ProtectedRoute allowedRoles={["student"]}><StudentLeave /></ProtectedRoute>} />
            <Route path="/student/hall-tickets" element={<ProtectedRoute allowedRoles={["student"]}><StudentHallTickets /></ProtectedRoute>} />
            <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={["student"]}><StudentCertificates /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={["student"]}><StudentAnnouncements /></ProtectedRoute>} />
            <Route path="/student/messages" element={<ProtectedRoute allowedRoles={["student"]}><StudentMessages /></ProtectedRoute>} />
            <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={["student"]}><StudentFeedback /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
