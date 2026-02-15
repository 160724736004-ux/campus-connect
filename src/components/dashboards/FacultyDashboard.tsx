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

      // Today's schedule
      const today = new Date().getDay();
      if (courseIds.length > 0) {
        const { data: schedules } = await supabase
          .from("course_schedules")
          .select("*")
          .in("course_id", courseIds)
          .eq("day_of_week", today)
          .order("start_time");
        const courseMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c]));
        setTodaySchedule((schedules || []).map((s: any) => ({
          ...s,
          courseCode: courseMap[s.course_id]?.code || "",
          courseTitle: courseMap[s.course_id]?.title || "",
        })));
      }

      // Pending condonation requests
      let pendingCondonations = 0;
      if (courseIds.length > 0) {
        const { count: condCount } = await supabase
          .from("attendance_condonations")
          .select("id", { count: "exact", head: true })
          .in("course_id", courseIds)
          .eq("status", "pending");
        pendingCondonations = condCount || 0;
      }

      setStats({ courses: courseIds.length, students: studentCount, pendingGrades, pendingCondonations });

      // Build pending tasks
      const tasks: typeof pendingTasks = [];
      if (pendingGrades > 0) tasks.push({ label: "Pending Marks Entry", count: pendingGrades, path: "/marks-entry", icon: FileSpreadsheet, color: "text-amber-500" });
      if (pendingCondonations > 0) tasks.push({ label: "Condonation Requests", count: pendingCondonations, path: "/attendance", icon: Send, color: "text-blue-500" });
      setPendingTasks(tasks);
    };
    load();
  }, [user]);

  const statCards = [
    { label: "My Courses", value: String(stats.courses), icon: BookOpen, gradient: "from-blue-500 to-blue-600" },
    { label: "Total Students", value: String(stats.students), icon: Users, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Today's Classes", value: String(todaySchedule.length), icon: CalendarDays, gradient: "from-violet-500 to-violet-600" },
    { label: "Pending Grades", value: String(stats.pendingGrades), icon: ClipboardList, gradient: "from-amber-500 to-orange-500" },
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {profile?.full_name || "Faculty"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Your teaching overview for {DAYS[new Date().getDay()]}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
                <CardDescription>{todaySchedule.length} class{todaySchedule.length !== 1 ? "es" : ""} today</CardDescription>
              </div>
              <button onClick={() => navigate("/faculty/schedule")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Full Schedule <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <CalendarDays className="h-5 w-5 mr-2 opacity-50" />
                No classes scheduled for today
              </div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{s.courseCode} — {s.courseTitle}</p>
                      <p className="text-xs text-muted-foreground">{s.room || "Room TBD"}</p>
                    </div>
                    <Badge variant="outline">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pending Tasks</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <ClipboardList className="h-5 w-5 mr-2 opacity-50" />
                No pending tasks — great job!
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <button
                    key={task.path}
                    onClick={() => navigate(task.path)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left w-full hover:bg-accent/50 transition-all duration-200 group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <task.icon className={`h-4 w-4 ${task.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1">{task.label}</span>
                    <Badge variant="secondary">{task.count}</Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Navigate to common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 transition-all duration-200 group text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
