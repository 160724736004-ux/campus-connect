import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, MapPin } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentTimetable() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().getDay();

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "enrolled");
      const courseIds = (enrollments || []).map((e: any) => e.course_id);
      if (courseIds.length > 0) {
        const { data } = await supabase.from("course_schedules").select("*, courses(code, title, faculty_id)").in("course_id", courseIds).order("start_time");
        setSchedules(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getScheduleForDay = (day: number) => schedules.filter((s) => s.day_of_week === day);

  const DaySchedule = ({ day }: { day: number }) => {
    const daySchedules = getScheduleForDay(day);
    const isToday = day === today;
    return (
      <div className={`space-y-2 ${isToday ? "" : ""}`}>
        {daySchedules.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            No classes
          </div>
        ) : (
          daySchedules.map((s: any, idx: number) => (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isToday ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"}`}>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isToday ? "bg-primary/20" : "bg-muted"}`}>
                <Clock className={`h-5 w-5 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.courses?.code} — {s.courses?.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>
                  {s.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</span>}
                </div>
              </div>
              {isToday && <Badge variant="default" className="text-xs shrink-0">Today</Badge>}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> My Timetable
          </h1>
          <p className="text-muted-foreground">View your class schedule</p>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : (
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Today</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{DAYS[today]}'s Schedule</CardTitle>
                  <CardDescription>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <DaySchedule day={today} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const daySchedules = getScheduleForDay(day);
                  if (daySchedules.length === 0 && day !== today) return null;
                  return (
                    <Card key={day} className={day === today ? "ring-2 ring-primary/30" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {DAYS[day]}
                          {day === today && <Badge variant="default" className="text-xs">Today</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DaySchedule day={day} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
