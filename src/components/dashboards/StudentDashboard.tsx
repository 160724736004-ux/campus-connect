import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ClipboardList, CalendarDays, DollarSign, ArrowUpRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ enrolled: 0, gpa: "—", upcoming: 0, balance: 0, backlogs: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [enrollRes, invoicesRes, backlogsRes] = await Promise.all([
        supabase.from("enrollments").select("id, course_id").eq("student_id", user.id).eq("status", "enrolled"),
        supabase.from("invoices").select("total_amount, paid_amount").eq("student_id", user.id),
        supabase.from("student_backlogs" as any).select("id").eq("student_id", user.id).eq("status", "pending"),
      ]);
      const enrollments = enrollRes.data || [];
      const balance = (invoicesRes.data || []).reduce((sum: number, i: any) => sum + (parseFloat(i.total_amount) - parseFloat(i.paid_amount)), 0);
      const backlogs = (backlogsRes.data || []).length;
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
      }
      setStats({ enrolled: enrollments.length, gpa: gpaStr, upcoming: 0, balance, backlogs });
    };
    fetch();
  }, [user]);

  const cards = [
    { label: "Enrolled Courses", value: String(stats.enrolled), icon: BookOpen, gradient: "from-blue-500 to-blue-600" },
    { label: "Current GPA", value: stats.gpa, icon: ClipboardList, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Backlogs", value: String(stats.backlogs), icon: AlertTriangle, gradient: stats.backlogs > 0 ? "from-red-500 to-orange-600" : "from-violet-500 to-violet-600", onClick: () => navigate("/backlogs") },
    { label: "Fee Balance", value: `$${stats.balance.toLocaleString()}`, icon: DollarSign, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {profile?.full_name || "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Your academic overview</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}`} onClick={stat.onClick} role={stat.onClick ? "button" : undefined}>
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
                <CardDescription>Your classes for today</CardDescription>
              </div>
              <button onClick={() => navigate("/schedule")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <CalendarDays className="h-5 w-5 mr-2 opacity-50" />
              No classes scheduled for today
            </div>
          </CardContent>
        </Card>
        <Card className={stats.backlogs > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Backlogs</CardTitle>
                <CardDescription>Failed subjects — register for supplementary exams</CardDescription>
              </div>
              {stats.backlogs > 0 && (
                <button onClick={() => navigate("/backlogs")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  View & Register <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stats.backlogs > 0 ? (
              <div className="flex items-center gap-3 py-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">{stats.backlogs} subject{stats.backlogs !== 1 ? "s" : ""} pending</p>
                  <p className="text-sm text-muted-foreground">Register for supplementary exams before the deadline</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No backlogs — you're all clear
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
