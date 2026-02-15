import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function FacultySchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().getDay();

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: courses } = await supabase.from("courses").select("id, code, title").eq("faculty_id", user.id);
      const courseIds = (courses || []).map((c: any) => c.id);
      if (courseIds.length === 0) { setSchedule([]); setLoading(false); return; }

      const { data: schedules } = await supabase
        .from("course_schedules")
        .select("*")
        .in("course_id", courseIds)
        .order("day_of_week")
        .order("start_time");

      const courseMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c]));
      setSchedule((schedules || []).map((s: any) => ({
        ...s,
        courseCode: courseMap[s.course_id]?.code || "",
        courseTitle: courseMap[s.course_id]?.title || "",
      })));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const todayItems = schedule.filter((s) => s.day_of_week === today);

  const groupedByDay = DAYS.reduce((acc, day, idx) => {
    const items = schedule.filter((s) => s.day_of_week === idx);
    if (items.length > 0) acc.push({ day, items, idx });
    return acc;
  }, [] as { day: string; items: any[]; idx: number }[]);

  const totalWeeklyHours = schedule.reduce((acc, s) => {
    const start = s.start_time?.split(":").map(Number) || [0, 0];
    const end = s.end_time?.split(":").map(Number) || [0, 0];
    return acc + (end[0] - start[0]) + (end[1] - start[1]) / 60;
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Teaching Schedule
          </h1>
          <p className="text-muted-foreground">
            {schedule.length} classes/week · ~{totalWeeklyHours.toFixed(1)} hours
          </p>
        </div>

        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today ({DAYS[today]})</TabsTrigger>
            <TabsTrigger value="weekly">Full Week</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : todayItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No classes scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {todayItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.courseCode} — {item.courseTitle}</p>
                          <p className="text-xs text-muted-foreground">{item.room || "Room TBD"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            {loading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : groupedByDay.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No schedule configured</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {groupedByDay.map(({ day, items, idx }) => (
                  <Card key={day} className={idx === today ? "border-primary/30 bg-primary/5" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {day}
                        {idx === today && <Badge variant="default" className="text-xs">Today</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{item.courseCode} — {item.courseTitle}</p>
                              <p className="text-xs text-muted-foreground">{item.room || "Room TBD"}</p>
                            </div>
                            <Badge variant="outline">{item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
