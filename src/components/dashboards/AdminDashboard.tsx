import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, DollarSign, AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, revenue: 0 });
  const [financeStats, setFinanceStats] = useState({
    totalBilled: 0, totalCollected: 0, collectionRate: 0,
    overdueCount: 0, overdueAmount: 0, pendingCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, facultyRes, coursesRes, paymentsRes, invoicesRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "faculty"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
        supabase.from("invoices").select("total_amount, paid_amount, status, due_date"),
      ]);
      const totalRevenue = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      setStats({
        students: studentsRes.count || 0,
        faculty: facultyRes.count || 0,
        courses: coursesRes.count || 0,
        revenue: totalRevenue,
      });

      const invoices = invoicesRes.data || [];
      const totalBilled = invoices.reduce((s: number, i: any) => s + parseFloat(i.total_amount), 0);
      const totalCollected = invoices.reduce((s: number, i: any) => s + parseFloat(i.paid_amount), 0);
      const today = new Date().toISOString().split("T")[0];
      const overdue = invoices.filter((i: any) => i.status !== "paid" && i.due_date && i.due_date < today);
      const pending = invoices.filter((i: any) => i.status === "pending");
      setFinanceStats({
        totalBilled, totalCollected,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((s: number, i: any) => s + (parseFloat(i.total_amount) - parseFloat(i.paid_amount)), 0),
        pendingCount: pending.length,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Students", value: String(stats.students), icon: Users, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-700" },
    { label: "Faculty Members", value: String(stats.faculty), icon: GraduationCap, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-700" },
    { label: "Active Courses", value: String(stats.courses), icon: BookOpen, gradient: "from-violet-500 to-violet-600", bg: "bg-violet-50", text: "text-violet-700" },
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-700" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of university operations</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Live
        </Badge>
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
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" /> Fee Collection</CardTitle>
                <CardDescription>Collection rates and outstanding balances</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/finance")}>
                View All <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Collection Rate</span>
                <span className="font-bold text-foreground">{financeStats.collectionRate.toFixed(1)}%</span>
              </div>
              <Progress value={financeStats.collectionRate} className="h-3 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Collected: ${financeStats.totalCollected.toLocaleString()}</span>
                <span>Billed: ${financeStats.totalBilled.toLocaleString()}</span>
              </div>
            </div>
            {financeStats.overdueCount > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-destructive">{financeStats.overdueCount} overdue</span>
                  <span className="text-muted-foreground"> — ${financeStats.overdueAmount.toLocaleString()} outstanding</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-muted/50">{financeStats.pendingCount} pending</Badge>
              <Badge variant="secondary">{financeStats.overdueCount} overdue</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { label: "Manage Students", path: "/students", icon: Users, desc: "Admissions, profiles & enrollment" },
              { label: "Manage Faculty", path: "/faculty", icon: GraduationCap, desc: "Profiles, workload & duties" },
              { label: "View Courses", path: "/courses", icon: BookOpen, desc: "Course catalog & assignments" },
              { label: "Attendance", path: "/attendance", icon: Users, desc: "Mark & track attendance" },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-4 p-3 rounded-xl text-left hover:bg-accent/50 transition-all duration-200 group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
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
    </div>
  );
}
