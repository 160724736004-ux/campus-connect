import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, CalendarDays, ClipboardList, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function FacultyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, students: 0, upcoming: 0, pendingGrades: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: courses } = await supabase.from("courses").select("id").eq("faculty_id", user.id);
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
      setStats({ courses: courseIds.length, students: studentCount, upcoming: 0, pendingGrades });
    };
    fetch();
  }, [user]);

  const cards = [
    { label: "My Courses", value: String(stats.courses), icon: BookOpen, gradient: "from-blue-500 to-blue-600" },
    { label: "Total Students", value: String(stats.students), icon: Users, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Upcoming Classes", value: "—", icon: CalendarDays, gradient: "from-violet-500 to-violet-600" },
    { label: "Pending Grades", value: String(stats.pendingGrades), icon: ClipboardList, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {profile?.full_name || "Faculty"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Your teaching overview</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Manage your courses and grading</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { label: "My Courses", path: "/courses", icon: BookOpen },
              { label: "Grade Students", path: "/grading", icon: ClipboardList },
              { label: "Mark Attendance", path: "/attendance", icon: CalendarDays },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 p-3 rounded-xl text-left hover:bg-accent/50 transition-all duration-200 group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
