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
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Attendance", url: "/attendance", icon: CalendarDays },
  { title: "Grading", url: "/grading", icon: ClipboardList },
  { title: "Assessment Components", url: "/assessment-components", icon: FileCheck },
  { title: "Marks Entry", url: "/marks-entry", icon: FileSpreadsheet },
  { title: "External Marks Entry", url: "/external-marks-entry", icon: FileSpreadsheet },
  { title: "Marks Reports", url: "/marks-reports", icon: BarChart2 },
  { title: "Question Bank", url: "/question-bank", icon: BookOpen },
  { title: "Lesson Plan", url: "/lesson-plan", icon: FileText },
  { title: "LMS", url: "/lms", icon: BookOpen },
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
    <Sidebar>
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shadow-md">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">UniERP</span>
            <span className="text-xs text-muted-foreground capitalize">{roleLabel}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent"
                      activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-sidebar-foreground">{profile?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
