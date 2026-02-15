import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart2, Users, AlertTriangle } from "lucide-react";

export default function FacultyAttendanceReports() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("courses").select("id, code, title").eq("faculty_id", user.id).order("code");
      setCourses(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    if (!selectedCourse) { setReport([]); return; }
    const fetch = async () => {
      setLoading(true);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", selectedCourse)
        .eq("status", "enrolled");
      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      if (studentIds.length === 0) { setReport([]); setLoading(false); return; }

      const [profilesRes, recordsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, student_id_number").in("id", studentIds),
        supabase.from("attendance_records").select("student_id, status").eq("course_id", selectedCourse),
      ]);

      const records = recordsRes.data || [];
      const studentReport = (profilesRes.data || []).map((p: any) => {
        const studentRecords = records.filter((r: any) => r.student_id === p.id);
        const total = studentRecords.length;
        const present = studentRecords.filter((r: any) => r.status === "present").length;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        return { ...p, total, present, absent: total - present, percentage };
      }).sort((a: any, b: any) => a.percentage - b.percentage);

      setReport(studentReport);
      setLoading(false);
    };
    fetch();
  }, [selectedCourse]);

  const lowAttendance = report.filter((r) => r.percentage < 75);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-6 w-6" /> Attendance Reports
          </h1>
          <p className="text-muted-foreground">View attendance statistics for your courses</p>
        </div>

        <div className="w-72">
          <Select value={selectedCourse || "__none__"} onValueChange={(v) => setSelectedCourse(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select a course</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedCourse ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Select a course to view reports</CardContent></Card>
        ) : loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : (
          <>
            {lowAttendance.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">{lowAttendance.length} student{lowAttendance.length !== 1 ? "s" : ""} below 75% attendance</span>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student Attendance Summary</CardTitle>
                <CardDescription>{report.length} students</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attendance data</TableCell></TableRow>
                    ) : report.map((r) => (
                      <TableRow key={r.id} className={r.percentage < 75 ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.student_id_number || "—"}</TableCell>
                        <TableCell>{r.present}</TableCell>
                        <TableCell>{r.absent}</TableCell>
                        <TableCell>{r.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.percentage} className="w-16 h-2" />
                            <Badge variant={r.percentage >= 75 ? "default" : "destructive"} className="text-xs">
                              {r.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
