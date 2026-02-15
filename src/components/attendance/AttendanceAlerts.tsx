import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, AlertTriangle, CheckCircle } from "lucide-react";

export function AttendanceAlerts() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [alertsRes, coursesRes] = await Promise.all([
        role === "student"
          ? supabase.from("attendance_alerts").select("*").eq("student_id", user.id).order("sent_at", { ascending: false })
          : supabase.from("attendance_alerts").select("*, profiles!attendance_alerts_student_id_fkey(full_name, student_id_number)").order("sent_at", { ascending: false }).limit(100),
        supabase.from("courses").select("id, code, title"),
      ]);
      setAlerts(alertsRes.data || []);
      setCourses(coursesRes.data || []);
    };
    fetch();
  }, [user, role]);

  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.title || "—";
  const getCourseCode = (id: string) => courses.find((c) => c.id === id)?.code || "";

  const markRead = async (alertId: string) => {
    await supabase.from("attendance_alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    if (!user) return;
    const ids = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (ids.length === 0) return;
    await supabase.from("attendance_alerts").update({ is_read: true }).in("id", ids);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    toast({ title: "All alerts marked as read" });
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const severityColor = (type: string) => {
    switch (type) {
      case "critical": return "destructive";
      case "warning": return "secondary";
      case "shortage": return "destructive";
      case "daily_absence": return "secondary";
      default: return "outline";
    }
  };

  const severityIcon = (type: string) => {
    switch (type) {
      case "critical": case "shortage": return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{unreadCount} unread alerts</span>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCircle className="h-4 w-4 mr-1" />Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Alerts</CardTitle>
          <CardDescription>
            {role === "student" ? "Your attendance alerts and notifications" : "All attendance alerts across students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                {role !== "student" && <TableHead>Student</TableHead>}
                <TableHead>Course</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Sent Via</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow><TableCell colSpan={role === "student" ? 6 : 7} className="text-center py-8 text-muted-foreground">
                  <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No alerts
                </TableCell></TableRow>
              ) : alerts.map((a) => (
                <TableRow key={a.id} className={!a.is_read ? "bg-accent/50" : ""}>
                  <TableCell>
                    <Badge variant={severityColor(a.alert_type) as any} className="gap-1 capitalize">
                      {severityIcon(a.alert_type)}
                      {a.alert_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {role !== "student" && (
                    <TableCell className="font-medium">{a.profiles?.full_name || "—"}</TableCell>
                  )}
                  <TableCell>
                    <span className="font-mono text-sm">{getCourseCode(a.course_id)}</span>
                    <br /><span className="text-xs text-muted-foreground">{getCourseName(a.course_id)}</span>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">{a.message}</TableCell>
                  <TableCell>
                    {a.current_percentage != null && (
                      <Badge variant={a.current_percentage < 65 ? "destructive" : "secondary"}>
                        {a.current_percentage}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(Array.isArray(a.sent_via) ? a.sent_via : []).map((v: string) => (
                        <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(a.sent_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {!a.is_read && (
                      <Button variant="ghost" size="icon" onClick={() => markRead(a.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
