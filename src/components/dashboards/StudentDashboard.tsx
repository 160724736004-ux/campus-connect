import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

        // Fetch today's schedule
        const today = new Date();
        const dayOfWeek = today.getDay();
        const courseIds = enrollments.map((e: any) => e.course_id);
        const { data: schedules } = await supabase.from("course_schedules").select("*, courses(code, title)").in("course_id", courseIds).eq("day_of_week", dayOfWeek).order("start_time");
        setTodaySchedule(schedules || []);

        // Fetch recent attendance
        const { data: attRecords } = await supabase.from("attendance_records").select("*, courses(code, title)").eq("student_id", user.id).order("date", { ascending: false }).limit(10);
        setRecentAttendance(attRecords || []);
      }
      setStats({ enrolled: enrollments.length, gpa: gpaStr, upcoming: 0, balance, backlogs });
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: "Enrolled Courses", value: String(stats.enrolled), icon: BookOpen, gradient: "from-blue-500 to-blue-600", path: "/courses" },
    { label: "Current GPA", value: stats.gpa, icon: BarChart2, gradient: "from-emerald-500 to-emerald-600", path: "/grades" },
    { label: "Backlogs", value: String(stats.backlogs), icon: AlertTriangle, gradient: stats.backlogs > 0 ? "from-red-500 to-orange-600" : "from-violet-500 to-violet-600", path: "/backlogs" },
    { label: "Fee Balance", value: `₹${stats.balance.toLocaleString()}`, icon: DollarSign, gradient: "from-amber-500 to-orange-500", path: "/finance" },
  ];

  const quickActions = [
    { label: "Timetable", icon: CalendarDays, path: "/student/timetable", color: "bg-blue-500/10 text-blue-600" },
    { label: "Attendance", icon: ClipboardList, path: "/attendance", color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Marks", icon: BarChart2, path: "/grades", color: "bg-purple-500/10 text-purple-600" },
    { label: "Pay Fees", icon: CreditCard, path: "/finance", color: "bg-amber-500/10 text-amber-600" },
    { label: "Hall Ticket", icon: Download, path: "/student/hall-tickets", color: "bg-rose-500/10 text-rose-600" },
    { label: "Certificates", icon: FileText, path: "/student/certificates", color: "bg-cyan-500/10 text-cyan-600" },
    { label: "Leave Apply", icon: Send, path: "/student/leave", color: "bg-orange-500/10 text-orange-600" },
    { label: "Notifications", icon: Bell, path: "/student/notifications", color: "bg-indigo-500/10 text-indigo-600" },
    { label: "Announcements", icon: Megaphone, path: "/student/announcements", color: "bg-pink-500/10 text-pink-600" },
    { label: "Message Faculty", icon: MessageSquare, path: "/student/messages", color: "bg-teal-500/10 text-teal-600" },
    { label: "Feedback", icon: Star, path: "/student/feedback", color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Registration", icon: GraduationCap, path: "/courses", color: "bg-slate-500/10 text-slate-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Welcome, {profile?.full_name?.split(" ")[0] || "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Your academic overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={() => navigate(stat.path)}
            role="button"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.label}</p>
                <p className="text-xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Access all features quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${action.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Alert */}
      {notifications.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                Unread Alerts ({notifications.length})
              </CardTitle>
              <button onClick={() => navigate("/student/notifications")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 3).map((n: any) => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{n.message || `${n.alert_type} alert — ${n.current_percentage}% attendance`}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
                <CardDescription>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardDescription>
              </div>
              <button onClick={() => navigate("/student/timetable")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Full View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <CalendarDays className="h-8 w-8 opacity-30 mb-2" />
                No classes scheduled today
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedule.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.courses?.code} — {s.courses?.title}</p>
                      <p className="text-xs text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} {s.room ? `• ${s.room}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                <CardDescription>Last 10 records</CardDescription>
              </div>
              <button onClick={() => navigate("/attendance")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Full View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <ClipboardList className="h-8 w-8 opacity-30 mb-2" />
                No attendance records yet
              </div>
            ) : (
              <div className="space-y-2">
                {recentAttendance.slice(0, 6).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "present" || r.status === "p" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="text-sm truncate">{r.courses?.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "present" || r.status === "p" ? "default" : "destructive"} className="text-xs">
                        {r.status === "present" || r.status === "p" ? "P" : "A"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backlogs Warning */}
      {stats.backlogs > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{stats.backlogs} subject{stats.backlogs !== 1 ? "s" : ""} pending</p>
                <p className="text-sm text-muted-foreground">Register for supplementary exams before the deadline</p>
              </div>
              <button onClick={() => navigate("/backlogs")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline shrink-0">
                View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
