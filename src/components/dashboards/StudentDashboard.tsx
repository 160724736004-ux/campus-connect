import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, ClipboardList, CalendarDays, DollarSign, ArrowUpRight, AlertTriangle,
  Bell, MessageSquare, FileText, Download, CreditCard, BarChart2,
  Clock, CheckCircle, GraduationCap, Megaphone, Star, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ enrolled: 0, gpa: "—", upcoming: 0, balance: 0, backlogs: 0 });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [enrollRes, invoicesRes, backlogsRes, alertsRes] = await Promise.all([
        supabase.from("enrollments").select("id, course_id").eq("student_id", user.id).eq("status", "enrolled"),
        supabase.from("invoices").select("total_amount, paid_amount").eq("student_id", user.id),
        supabase.from("student_backlogs" as any).select("id").eq("student_id", user.id).eq("status", "pending"),
        supabase.from("attendance_alerts").select("*").eq("student_id", user.id).eq("is_read", false).order("sent_at", { ascending: false }).limit(5),
      ]);
      const enrollments = enrollRes.data || [];
      const balance = (invoicesRes.data || []).reduce((sum: number, i: any) => sum + (parseFloat(i.total_amount) - parseFloat(i.paid_amount)), 0);
      const backlogs = (backlogsRes.data || []).length;
      setNotifications(alertsRes.data || []);

      let gpaStr = "—";
      if (enrollments.length > 0) {
        const { data: grades } = await supabase.from("grades").select("letter_grade, grade_points, enrollment_id").in("enrollment_id", enrollments.map((e: any) => e.id));
        const { data: courses } = await supabase.from("courses").select("id, credits").in("id", enrollments.map((e: any) => e.course_id));
        const creditsMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c.credits]));
        const enrollCourseMap = Object.fromEntries(enrollments.map((e: any) => [e.id, e.course_id]));
        if (grades && grades.length > 0) {
          const valid = grades.filter((g: any) => g.grade_points !== null && !["W", "I"].includes(g.letter_grade));
          if (valid.length > 0) {
            const totalPoints = valid.reduce((sum: number, g: any) => sum + g.grade_points * (creditsMap[enrollCourseMap[g.enrollment_id]] || 3), 0);
            const totalCredits = valid.reduce((sum: number, g: any) => sum + (creditsMap[enrollCourseMap[g.enrollment_id]] || 3), 0);
            gpaStr = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";
          }
        }

        const today = new Date();
        const dayOfWeek = today.getDay();
        const courseIds = enrollments.map((e: any) => e.course_id);
        const { data: schedules } = await supabase.from("course_schedules").select("*, courses(code, title)").in("course_id", courseIds).eq("day_of_week", dayOfWeek).order("start_time");
        setTodaySchedule(schedules || []);

        const { data: attRecords } = await supabase.from("attendance_records").select("*, courses(code, title)").eq("student_id", user.id).order("date", { ascending: false }).limit(10);
        setRecentAttendance(attRecords || []);
      }
      setStats({ enrolled: enrollments.length, gpa: gpaStr, upcoming: 0, balance, backlogs });
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: "Enrolled Courses", value: String(stats.enrolled), icon: BookOpen, color: "bg-primary/10 text-primary", path: "/courses" },
    { label: "Current GPA", value: stats.gpa, icon: BarChart2, color: "bg-success/10 text-success", path: "/grades" },
    { label: "Backlogs", value: String(stats.backlogs), icon: AlertTriangle, color: stats.backlogs > 0 ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent", path: "/backlogs" },
    { label: "Fee Balance", value: `₹${stats.balance.toLocaleString()}`, icon: DollarSign, color: "bg-warning/10 text-warning", path: "/finance" },
  ];

  const quickActions = [
    { label: "Timetable", icon: CalendarDays, path: "/student/timetable", color: "bg-primary/10 text-primary" },
    { label: "Attendance", icon: ClipboardList, path: "/attendance", color: "bg-success/10 text-success" },
    { label: "Marks", icon: BarChart2, path: "/grades", color: "bg-accent/10 text-accent" },
    { label: "Pay Fees", icon: CreditCard, path: "/finance", color: "bg-warning/10 text-warning" },
    { label: "Hall Ticket", icon: Download, path: "/student/hall-tickets", color: "bg-destructive/10 text-destructive" },
    { label: "Certificates", icon: FileText, path: "/student/certificates", color: "bg-primary/10 text-primary" },
    { label: "Leave Apply", icon: Send, path: "/student/leave", color: "bg-warning/10 text-warning" },
    { label: "Notifications", icon: Bell, path: "/student/notifications", color: "bg-accent/10 text-accent" },
    { label: "Announcements", icon: Megaphone, path: "/student/announcements", color: "bg-destructive/10 text-destructive" },
    { label: "Message Faculty", icon: MessageSquare, path: "/student/messages", color: "bg-success/10 text-success" },
    { label: "Feedback", icon: Star, path: "/student/feedback", color: "bg-warning/10 text-warning" },
    { label: "Registration", icon: GraduationCap, path: "/courses", color: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
          Welcome, {profile?.full_name?.split(" ")[0] || "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Your academic overview</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger-fade">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="stat-card cursor-pointer"
            onClick={() => navigate(stat.path)}
            role="button"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1 sm:space-y-1.5 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight font-display">{stat.value}</p>
              </div>
              <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          <CardDescription>Access all features quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="quick-tile"
              >
                <div className={`tile-icon ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight text-foreground/80">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {notifications.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                <Bell className="h-4 w-4 text-warning" />
                Unread Alerts ({notifications.length})
              </CardTitle>
              <button onClick={() => navigate("/student/notifications")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 3).map((n: any) => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{n.message || `${n.alert_type} alert — ${n.current_percentage}% attendance`}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Today's Schedule</CardTitle>
                <CardDescription>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardDescription>
              </div>
              <button onClick={() => navigate("/student/timetable")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                Full View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <CalendarDays className="h-10 w-10 opacity-20 mb-3" />
                No classes scheduled today
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaySchedule.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.courses?.code} — {s.courses?.title}</p>
                      <p className="text-xs text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} {s.room ? `• ${s.room}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Recent Attendance</CardTitle>
                <CardDescription>Last 10 records</CardDescription>
              </div>
              <button onClick={() => navigate("/attendance")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                Full View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <ClipboardList className="h-10 w-10 opacity-20 mb-3" />
                No attendance records yet
              </div>
            ) : (
              <div className="space-y-1">
                {recentAttendance.slice(0, 6).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "present" || r.status === "p" ? (
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{r.courses?.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "present" || r.status === "p" ? "default" : "destructive"} className="text-[10px] px-2 rounded-md">
                        {r.status === "present" || r.status === "p" ? "P" : "A"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.backlogs > 0 && (
        <Card className="border-warning/30 shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{stats.backlogs} subject{stats.backlogs !== 1 ? "s" : ""} pending</p>
                <p className="text-sm text-muted-foreground">Register for supplementary exams before the deadline</p>
              </div>
              <button onClick={() => navigate("/backlogs")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline shrink-0">
                View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
