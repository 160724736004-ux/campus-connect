import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, CalendarDays, ClipboardList, ArrowUpRight,
  FileSpreadsheet, MessageSquare, Bell, Send, BarChart2, Upload, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function FacultyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, students: 0, pendingGrades: 0, pendingCondonations: 0 });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<{ label: string; count: number; path: string; icon: any; color: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: courses } = await supabase.from("courses").select("id, code, title").eq("faculty_id", user.id);
      const courseIds = (courses || []).map((c: any) => c.id);

      let studentCount = 0;
      let pendingGrades = 0;
      if (courseIds.length > 0) {
        const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).in("course_id", courseIds).eq("status", "enrolled");
        studentCount = count || 0;

        const { data: enrollments } = await supabase.from("enrollments").select("id").in("course_id", courseIds).eq("status", "enrolled");
        const enrollmentIds = (enrollments || []).map((e: any) => e.id);
        if (enrollmentIds.length > 0) {
          const { data: grades } = await supabase.from("grades").select("enrollment_id").in("enrollment_id", enrollmentIds);
          const gradedIds = new Set((grades || []).map((g: any) => g.enrollment_id));
          pendingGrades = enrollmentIds.filter((id: string) => !gradedIds.has(id)).length;
        }
      }

      const today = new Date().getDay();
      if (courseIds.length > 0) {
        const { data: schedules } = await supabase
          .from("course_schedules").select("*").in("course_id", courseIds).eq("day_of_week", today).order("start_time");
        const courseMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c]));
        setTodaySchedule((schedules || []).map((s: any) => ({
          ...s,
          courseCode: courseMap[s.course_id]?.code || "",
          courseTitle: courseMap[s.course_id]?.title || "",
        })));
      }

      let pendingCondonations = 0;
      if (courseIds.length > 0) {
        const { count: condCount } = await supabase
          .from("attendance_condonations").select("id", { count: "exact", head: true }).in("course_id", courseIds).eq("status", "pending");
        pendingCondonations = condCount || 0;
      }

      setStats({ courses: courseIds.length, students: studentCount, pendingGrades, pendingCondonations });

      const tasks: typeof pendingTasks = [];
      if (pendingGrades > 0) tasks.push({ label: "Pending Marks Entry", count: pendingGrades, path: "/marks-entry", icon: FileSpreadsheet, color: "text-warning" });
      if (pendingCondonations > 0) tasks.push({ label: "Condonation Requests", count: pendingCondonations, path: "/attendance", icon: Send, color: "text-primary" });
      setPendingTasks(tasks);
    };
    load();
  }, [user]);

  const statCards = [
    { label: "My Courses", value: String(stats.courses), icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Total Students", value: String(stats.students), icon: Users, color: "bg-success/10 text-success" },
    { label: "Today's Classes", value: String(todaySchedule.length), icon: CalendarDays, color: "bg-accent/10 text-accent" },
    { label: "Pending Grades", value: String(stats.pendingGrades), icon: ClipboardList, color: "bg-warning/10 text-warning" },
  ];

  const quickActions = [
    { label: "Mark Attendance", path: "/attendance", icon: CalendarDays },
    { label: "Enter Marks", path: "/marks-entry", icon: FileSpreadsheet },
    { label: "My Schedule", path: "/faculty/schedule", icon: Clock },
    { label: "Student Details", path: "/faculty/students", icon: Users },
    { label: "Course Materials", path: "/lms", icon: Upload },
    { label: "Student Messages", path: "/faculty/messages", icon: MessageSquare },
    { label: "Attendance Reports", path: "/faculty/reports", icon: BarChart2 },
    { label: "Leave Application", path: "/faculty/leave", icon: Send },
    { label: "Notifications", path: "/faculty/notifications", icon: Bell },
    { label: "My Courses", path: "/courses", icon: BookOpen },
    { label: "Lesson Plan", path: "/lesson-plan", icon: ClipboardList },
    { label: "Question Bank", path: "/question-bank", icon: BookOpen },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
          Welcome, {profile?.full_name || "Faculty"} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Your teaching overview for {DAYS[new Date().getDay()]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-fade">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">{stat.value}</p>
              </div>
              <div className={`h-11 w-11 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Today's Schedule</CardTitle>
                <CardDescription>{todaySchedule.length} class{todaySchedule.length !== 1 ? "es" : ""} today</CardDescription>
              </div>
              <button onClick={() => navigate("/faculty/schedule")} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                Full Schedule <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <CalendarDays className="h-10 w-10 opacity-20 mb-3" />
                No classes scheduled for today
              </div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30">
                    <div>
                      <p className="text-sm font-semibold">{s.courseCode} — {s.courseTitle}</p>
                      <p className="text-xs text-muted-foreground">{s.room || "Room TBD"}</p>
                    </div>
                    <Badge variant="outline" className="rounded-lg text-xs">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display">Pending Tasks</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <ClipboardList className="h-10 w-10 opacity-20 mb-3" />
                No pending tasks — great job!
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingTasks.map((task) => (
                  <button key={task.path} onClick={() => navigate(task.path)} className="action-card w-full">
                    <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <task.icon className={`h-4 w-4 ${task.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-foreground flex-1 text-left">{task.label}</span>
                    <Badge variant="secondary" className="rounded-lg">{task.count}</Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          <CardDescription>Navigate to common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button key={action.path} onClick={() => navigate(action.path)} className="quick-tile">
                <div className="tile-icon bg-primary/8">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[11px] font-medium text-foreground/80">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
