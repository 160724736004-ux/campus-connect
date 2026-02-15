import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, User } from "lucide-react";

export default function StudentAnnouncements() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("academic_calendar_events")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(50);
      setEvents(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getEventColor = (type: string) => {
    switch (type) {
      case "exam": return "bg-red-500/10 text-red-600 border-red-200";
      case "holiday": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      case "event": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "deadline": return "bg-amber-500/10 text-amber-600 border-amber-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Announcements
          </h1>
          <p className="text-muted-foreground">Latest academic announcements and events</p>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isPast = new Date(event.end_date) < new Date();
              return (
                <Card key={event.id} className={isPast ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getEventColor(event.event_type)}`}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{event.title}</p>
                          <Badge variant="outline" className="text-xs capitalize shrink-0">{event.event_type}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {event.start_date !== event.end_date && ` — ${new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                          </span>
                          {event.is_holiday && <Badge variant="secondary" className="text-xs">Holiday</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
