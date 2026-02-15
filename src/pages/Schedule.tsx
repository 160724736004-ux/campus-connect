import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Schedule() {
  const { user, role } = useAuth();
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin/Faculty schedule management
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCourse, setFormCourse] = useState("");
  const [formDay, setFormDay] = useState("1");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formRoom, setFormRoom] = useState("");

  const canManage = role === "admin" || role === "hod";

  useEffect(() => {
    if (!user) return;
    const fetchSchedule = async () => {
      setLoading(true);
      let courseIds: string[] = [];

      if (role === "student") {
        const { data } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "enrolled");
        courseIds = (data || []).map((e: any) => e.course_id);
      } else if (role === "faculty") {
        const { data } = await supabase.from("courses").select("id").eq("faculty_id", user.id);
        courseIds = (data || []).map((c: any) => c.id);
      } else if (canManage) {
        // Admin/HOD sees all
        const { data } = await supabase.from("courses").select("*").order("code");
        setAllCourses(data || []);
        courseIds = (data || []).map((c: any) => c.id);
      }

      if (courseIds.length === 0) { setScheduleItems([]); setLoading(false); return; }

      const [schedulesRes, coursesRes] = await Promise.all([
        supabase.from("course_schedules").select("*").in("course_id", courseIds).order("day_of_week").order("start_time"),
        supabase.from("courses").select("id, code, title").in("id", courseIds),
      ]);

      const coursesMap = Object.fromEntries((coursesRes.data || []).map((c: any) => [c.id, c]));
      setCourses(coursesRes.data || []);
      const items = (schedulesRes.data || []).map((s: any) => ({
        ...s,
        courseCode: coursesMap[s.course_id]?.code || "—",
        courseTitle: coursesMap[s.course_id]?.title || "—",
        dayName: DAYS[s.day_of_week],
      }));
      setScheduleItems(items);
      setAllSchedules(schedulesRes.data || []);
      setLoading(false);
    };
    fetchSchedule();
  }, [user, role]);

  const groupedByDay = DAYS.reduce((acc, day, idx) => {
    const items = scheduleItems.filter((s) => s.day_of_week === idx);
    if (items.length > 0) acc.push({ day, items });
    return acc;
  }, [] as { day: string; items: any[] }[]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {canManage ? "Timetable Management" : "My Schedule"}
            </h1>
            <p className="text-muted-foreground">
              {canManage ? "Create and manage weekly class schedules" : "Your weekly class timetable"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : groupedByDay.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {role === "student" ? "No schedule available. Enroll in courses to see your timetable." : "No schedules created yet. Add class schedules from the Courses page."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groupedByDay.map(({ day, items }) => (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{day}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium">{item.courseCode} — {item.courseTitle}</div>
                          <div className="text-sm text-muted-foreground">{item.room || "Room TBD"}</div>
                        </div>
                        <Badge variant="outline">
                          {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
                        </Badge>
                      </div>
                    ))}
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
