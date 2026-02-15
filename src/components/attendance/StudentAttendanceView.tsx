import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingDown } from "lucide-react";

export function StudentAttendanceView() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [attendanceTypes, setAttendanceTypes] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: enrollData } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "enrolled");
      const courseIds = (enrollData || []).map((e: any) => e.course_id);

      if (courseIds.length > 0) {
        const [coursesRes, attRes, typesRes, configsRes] = await Promise.all([
          supabase.from("courses").select("*").in("id", courseIds),
          supabase.from("attendance_records").select("*").eq("student_id", user.id).order("date", { ascending: false }),
          supabase.from("attendance_types").select("*").order("sort_order"),
          supabase.from("attendance_config").select("*"),
        ]);
        setCourses(coursesRes.data || []);
        setRecords(attRes.data || []);
        setAttendanceTypes(typesRes.data || []);
        setConfigs(configsRes.data || []);
      }
    };
    fetch();
  }, [user]);

  const minAtt = configs[0]?.min_attendance_overall || 75;
  const warningThreshold = configs[0]?.alert_threshold_warning || 75;
  const criticalThreshold = configs[0]?.alert_threshold_critical || 70;
  const dangerThreshold = configs[0]?.alert_threshold_danger || 65;

  const getSummary = (courseId: string) => {
    const recs = records.filter((r) => r.course_id === courseId);
    const total = recs.length;
    const theoryRecs = recs.filter((r) => r.is_theory !== false);
    const labRecs = recs.filter((r) => r.is_theory === false);

    const countPresent = (rs: any[]) => rs.filter((r) => {
      if (r.attendance_type_id) {
        const t = attendanceTypes.find((at) => at.id === r.attendance_type_id);
        return t?.counts_as_present;
      }
      return r.status === "present" || r.status === "late" || r.status === "p" || r.status === "l" || r.status === "od";
    }).length;

    const present = countPresent(recs);
    const theoryPresent = countPresent(theoryRecs);
    const labPresent = countPresent(labRecs);

    return {
      total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      theoryTotal: theoryRecs.length, theoryPresent,
      theoryPct: theoryRecs.length > 0 ? Math.round((theoryPresent / theoryRecs.length) * 100) : 0,
      labTotal: labRecs.length, labPresent,
      labPct: labRecs.length > 0 ? Math.round((labPresent / labRecs.length) * 100) : 0,
    };
  };

  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.title || "—";
  const getCourseCode = (id: string) => courses.find((c) => c.id === id)?.code || "";

  const getStatusDisplay = (record: any) => {
    if (record.attendance_type_id) {
      const t = attendanceTypes.find((at) => at.id === record.attendance_type_id);
      if (t) return { code: t.code, color: t.color, name: t.name };
    }
    switch (record.status) {
      case "present": case "p": return { code: "P", color: "#16a34a", name: "Present" };
      case "absent": case "a": return { code: "A", color: "#dc2626", name: "Absent" };
      case "late": case "l": return { code: "L", color: "#d97706", name: "Late" };
      default: return { code: record.status, color: "#6b7280", name: record.status };
    }
  };

  const lowCourses = courses.filter((c) => {
    const s = getSummary(c.id);
    return s.total > 0 && s.percentage < warningThreshold;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Attendance</h1>
        <p className="text-muted-foreground">View attendance, alerts, and apply for condonation</p>
      </div>

      {/* Alerts */}
      {lowCourses.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 space-y-2">
            {lowCourses.map((c) => {
              const s = getSummary(c.id);
              const severity = s.percentage < dangerThreshold ? "critical" : s.percentage < criticalThreshold ? "warning" : "caution";
              return (
                <div key={c.id} className="flex items-center gap-2">
                  {severity === "critical" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-amber-600" />}
                  <span className="text-sm font-medium">{c.code}: {s.percentage}% attendance</span>
                  <Badge variant={severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                    {severity === "critical" ? "Below 65%" : severity === "warning" ? "Below 70%" : "Below 75%"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Recent Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {courses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No enrolled courses</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => {
                const s = getSummary(c.id);
                const isLow = s.total > 0 && s.percentage < warningThreshold;
                const isCritical = s.total > 0 && s.percentage < dangerThreshold;
                return (
                  <Card key={c.id} className={isCritical ? "border-destructive/50" : isLow ? "border-amber-500/50" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{c.code} — {c.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div className="text-3xl font-bold">{s.percentage}%</div>
                        {isCritical && <AlertTriangle className="h-5 w-5 text-destructive" />}
                        {isLow && !isCritical && <TrendingDown className="h-5 w-5 text-amber-600" />}
                      </div>
                      <Progress value={s.percentage} className="h-2" />
                      <p className="text-sm text-muted-foreground">{s.present}/{s.total} classes attended</p>
                      {s.theoryTotal > 0 && s.labTotal > 0 && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Theory: {s.theoryPct}%</span>
                          <span>Lab: {s.labPct}%</span>
                        </div>
                      )}
                      {isCritical && <Badge variant="destructive">Below {dangerThreshold}% — Detention risk</Badge>}
                      {isLow && !isCritical && <Badge variant="secondary">Below {warningThreshold}% threshold</Badge>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="records">
          {records.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No records yet</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 50).map((r) => {
                      const display = getStatusDisplay(r);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{getCourseCode(r.course_id)} — {getCourseName(r.course_id)}</TableCell>
                          <TableCell><Badge variant="outline">{r.is_theory !== false ? "Theory" : "Lab"}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: display.color }} />
                              <span className="text-sm font-medium">{display.code}</span>
                              <span className="text-sm text-muted-foreground">{display.name}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
