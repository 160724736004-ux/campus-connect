import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  CalendarDays,
  Building2,
  ClipboardList,
  Settings,
  LogOut,
  Briefcase,
  School,
  Calendar,
  Layers,
  Library,
  FileCheck,
  FileText,
  CalendarCheck,
  FileSpreadsheet,
  ClipboardCheck,
  Send,
  BarChart2,
  RefreshCw,
  Target,
  Bell,
  MessageSquare,
  Star,
  Award,
  Download,
  Megaphone,
  CreditCard,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const adminNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Institution Setup", url: "/institution", icon: School },
  { title: "Academic Years", url: "/academic-years", icon: Calendar },
  { title: "Departments", url: "/departments", icon: Building2 },
  { title: "Programs", url: "/programs", icon: ClipboardList },
  { title: "Batches & Sections", url: "/batches", icon: Layers },
  { title: "Academic Structure", url: "/academic-structure", icon: Library },
  { title: "Students", url: "/students", icon: Users },
  { title: "Faculty", url: "/faculty", icon: GraduationCap },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Grading", url: "/grading", icon: ClipboardList },
  { title: "Assessment Components", url: "/assessment-components", icon: FileCheck },
  { title: "Exam Scheduling", url: "/exam-scheduling", icon: CalendarCheck },
  { title: "Marks Entry", url: "/marks-entry", icon: FileSpreadsheet },
  { title: "External Marks Entry", url: "/external-marks-entry", icon: FileSpreadsheet },
  { title: "Marks Approval", url: "/marks-approval", icon: ClipboardCheck },
  { title: "Marks Publication", url: "/marks-publication", icon: Send },
  { title: "Marks Reports", url: "/marks-reports", icon: BarChart2 },
  { title: "Backlogs", url: "/backlogs", icon: ClipboardCheck },
  { title: "Exam Features", url: "/exam-features", icon: RefreshCw },
  { title: "OBE & CBCS", url: "/obe-cbcs", icon: Target },
  { title: "Question Bank", url: "/question-bank", icon: BookOpen },
  { title: "Lesson Plan", url: "/lesson-plan", icon: FileText },
  { title: "LMS", url: "/lms", icon: BookOpen },
  { title: "Timetable", url: "/schedule", icon: CalendarDays },
  { title: "Finance", url: "/finance", icon: DollarSign },
  { title: "HR & Payroll", url: "/hr-payroll", icon: Briefcase },
  { title: "Attendance", url: "/attendance", icon: CalendarDays },
  { title: "User Management", url: "/user-management", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

const hodNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Backlogs", url: "/backlogs", icon: ClipboardCheck },
  { title: "Exam Features", url: "/exam-features", icon: RefreshCw },
  { title: "OBE & CBCS", url: "/obe-cbcs", icon: Target },
  { title: "Question Bank", url: "/question-bank", icon: BookOpen },
  { title: "Lesson Plan", url: "/lesson-plan", icon: FileText },
  { title: "LMS", url: "/lms", icon: BookOpen },
  { title: "Students", url: "/students", icon: Users },
  { title: "Faculty", url: "/faculty", icon: GraduationCap },
  { title: "Programs", url: "/programs", icon: ClipboardList },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Grading", url: "/grading", icon: ClipboardList },
  { title: "Assessment Components", url: "/assessment-components", icon: FileCheck },
  { title: "Exam Scheduling", url: "/exam-scheduling", icon: CalendarCheck },
  { title: "Marks Entry", url: "/marks-entry", icon: FileSpreadsheet },
  { title: "External Marks Entry", url: "/external-marks-entry", icon: FileSpreadsheet },
  { title: "Marks Approval", url: "/marks-approval", icon: ClipboardCheck },
  { title: "Marks Publication", url: "/marks-publication", icon: Send },
  { title: "Marks Reports", url: "/marks-reports", icon: BarChart2 },
  { title: "Timetable", url: "/schedule", icon: CalendarDays },
  { title: "Attendance", url: "/attendance", icon: CalendarDays },
  { title: "Settings", url: "/settings", icon: Settings },
];

const facultyNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Schedule", url: "/faculty/schedule", icon: CalendarDays },
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Mark Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Attendance Reports", url: "/faculty/reports", icon: BarChart2 },
  { title: "Marks Entry", url: "/marks-entry", icon: FileSpreadsheet },
  { title: "External Marks Entry", url: "/external-marks-entry", icon: FileSpreadsheet },
  { title: "Marks Reports", url: "/marks-reports", icon: BarChart2 },
  { title: "Student Details", url: "/faculty/students", icon: Users },
  { title: "Student Messages", url: "/faculty/messages", icon: MessageSquare },
  { title: "Notifications", url: "/faculty/notifications", icon: Bell },
  { title: "Leave Application", url: "/faculty/leave", icon: Send },
  { title: "Assessment Components", url: "/assessment-components", icon: FileCheck },
  { title: "Grading", url: "/grading", icon: ClipboardList },
  { title: "Lesson Plan", url: "/lesson-plan", icon: FileText },
  { title: "Course Materials", url: "/lms", icon: BookOpen },
  { title: "Question Bank", url: "/question-bank", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

const studentNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Timetable", url: "/student/timetable", icon: CalendarDays },
  { title: "Attendance", url: "/attendance", icon: ClipboardList },
  { title: "Grades & Results", url: "/grades", icon: BarChart2 },
  { title: "Backlogs", url: "/backlogs", icon: ClipboardCheck },
  { title: "Leave / Condonation", url: "/student/leave", icon: Send },
  { title: "Hall Tickets", url: "/student/hall-tickets", icon: Download },
  { title: "Pay Fees", url: "/finance", icon: CreditCard },
  { title: "Certificates", url: "/student/certificates", icon: Award },
  { title: "Notifications", url: "/student/notifications", icon: Bell },
  { title: "Announcements", url: "/student/announcements", icon: Megaphone },
  { title: "Message Faculty", url: "/student/messages", icon: MessageSquare },
  { title: "Feedback", url: "/student/feedback", icon: Star },
  { title: "Question Bank", url: "/question-bank", icon: BookOpen },
  { title: "LMS", url: "/lms", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();

  const navItems = role === "admin" ? adminNav : role === "hod" ? hodNav : role === "faculty" ? facultyNav : studentNav;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleLabel = role === "hod" ? "Head of Dept" : role || "User";

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-sidebar-foreground font-display">UniERP</span>
            <span className="text-[10px] text-sidebar-muted capitalize font-medium tracking-wider uppercase">{roleLabel}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-10" />

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-muted font-semibold px-3 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="sidebar-nav-item text-sidebar-foreground/70"
                      activeClassName="sidebar-nav-item active"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 pt-2">
        <SidebarSeparator className="mb-3 opacity-10" />
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-sidebar-accent transition-all duration-200">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-accent">
            <AvatarFallback className="gradient-bg text-primary-foreground text-[11px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-sidebar-foreground">{profile?.full_name || "User"}</p>
            <p className="text-[10px] text-sidebar-muted truncate">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-sidebar-muted hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
