import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";

export default function StudentNotifications() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("attendance_alerts")
        .select("*")
        .eq("student_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(50);
      setAlerts(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    await supabase.from("attendance_alerts").update({ is_read: true }).eq("student_id", user!.id).eq("is_read", false);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("attendance_alerts").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const getIcon = (type: string) => {
    if (type.includes("critical") || type.includes("danger")) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (type.includes("warning")) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" /> Notifications
            </h1>
            <p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle className="h-4 w-4 mr-1" /> Mark All Read
            </Button>
          )}
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className={`cursor-pointer transition-all ${!alert.is_read ? "border-primary/30 bg-primary/5" : "opacity-70"}`}
                onClick={() => !alert.is_read && markRead(alert.id)}
              >
                <CardContent className="py-3 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{getIcon(alert.alert_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!alert.is_read ? "font-semibold" : "font-medium"}`}>
                      {alert.message || `${alert.alert_type} — Attendance at ${alert.current_percentage}%`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!alert.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
