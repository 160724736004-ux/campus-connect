import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Building2, ClipboardList, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function HodDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, faculty: 0, students: 0, programs: 0 });

  useEffect(() => {
    if (!user || !profile?.department_id) return;
    const fetch = async () => {
      const deptId = profile.department_id;
      const [coursesRes, programsRes] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("department_id", deptId),
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("department_id", deptId),
      ]);
      const { data: deptProfiles } = await supabase.from("profiles").select("id").eq("department_id", deptId);
      const profileIds = (deptProfiles || []).map((p: any) => p.id);
      let facultyCount = 0;
      let studentCount = 0;
      if (profileIds.length > 0) {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", profileIds);
        facultyCount = (roles || []).filter((r: any) => r.role === "faculty").length;
        studentCount = (roles || []).filter((r: any) => r.role === "student").length;
      }
      setStats({
        courses: coursesRes.count || 0,
        faculty: facultyCount,
        students: studentCount,
        programs: programsRes.count || 0,
      });
    };
    fetch();
  }, [user, profile]);

  const cards = [
    { label: "Department Courses", value: String(stats.courses), icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Faculty Members", value: String(stats.faculty), icon: Users, color: "bg-success/10 text-success" },
    { label: "Students", value: String(stats.students), icon: Users, color: "bg-accent/10 text-accent" },
    { label: "Programs", value: String(stats.programs), icon: Building2, color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
          Department Overview 🏛️
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your department operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-fade">
        {cards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Department Management</CardTitle>
          <CardDescription>Quick access to department resources</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1.5 sm:grid-cols-2">
          {[
            { label: "Manage Faculty", path: "/faculty", icon: Users, desc: "View and manage faculty" },
            { label: "View Students", path: "/students", icon: Users, desc: "Student directory" },
            { label: "Courses", path: "/courses", icon: BookOpen, desc: "Course catalog" },
            { label: "Attendance", path: "/attendance", icon: ClipboardList, desc: "Track attendance" },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="action-card"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
