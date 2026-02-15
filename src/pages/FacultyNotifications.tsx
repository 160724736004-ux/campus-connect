import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, Clock, Send } from "lucide-react";

export default function FacultyNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get pending condonation requests for faculty's courses
      const { data: courses } = await supabase.from("courses").select("id, code, title").eq("faculty_id", user.id);
      const courseIds = (courses || []).map((c: any) => c.id);
      const courseMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c]));

      const items: any[] = [];

      if (courseIds.length > 0) {
        // Pending condonation requests
        const { data: condonations } = await supabase
          .from("attendance_condonations")
          .select("*, profiles!attendance_condonations_student_id_fkey(full_name)")
          .in("course_id", courseIds)
          .eq("status", "pending")
          .order("applied_at", { ascending: false })
          .limit(20);

        (condonations || []).forEach((c: any) => {
          items.push({
            id: c.id,
            type: "condonation",
            message: `Condonation request from ${c.profiles?.full_name || "Student"} for ${courseMap[c.course_id]?.code || "Course"}`,
            time: c.applied_at,
            icon: Send,
            color: "text-blue-500",
          });
        });

        // Pending attendance corrections
        const { data: corrections } = await supabase
          .from("attendance_corrections")
          .select("*, profiles!attendance_corrections_requested_by_fkey(full_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20);

        (corrections || []).forEach((c: any) => {
          items.push({
            id: c.id,
            type: "correction",
            message: `Attendance correction request from ${c.profiles?.full_name || "Student"}`,
            time: c.created_at,
            icon: AlertTriangle,
            color: "text-amber-500",
          });
        });
      }

      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(items);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </h1>
          <p className="text-muted-foreground">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications — all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card key={n.id} className="border-border/50">
                <CardContent className="py-3 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <n.icon className={`h-5 w-5 ${n.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(n.time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{n.type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
