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
    { label: "Department Courses", value: String(stats.courses), icon: BookOpen, gradient: "from-blue-500 to-blue-600" },
    { label: "Faculty Members", value: String(stats.faculty), icon: Users, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Students", value: String(stats.students), icon: Users, gradient: "from-violet-500 to-violet-600" },
    { label: "Programs", value: String(stats.programs), icon: Building2, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Department Overview 🏛️
        </h1>
        <p className="text-muted-foreground mt-1">Manage your department operations</p>
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Department Management</CardTitle>
          <CardDescription>Quick access to department resources</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Manage Faculty", path: "/faculty", icon: Users, desc: "View and manage faculty" },
            { label: "View Students", path: "/students", icon: Users, desc: "Student directory" },
            { label: "Courses", path: "/courses", icon: BookOpen, desc: "Course catalog" },
            { label: "Attendance", path: "/attendance", icon: ClipboardList, desc: "Track attendance" },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 p-3 rounded-xl text-left hover:bg-accent/50 transition-all duration-200 group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
