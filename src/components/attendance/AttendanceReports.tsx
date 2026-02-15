import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Download, BarChart3 } from "lucide-react";

export function AttendanceReports() {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportType, setReportType] = useState("student-wise");

  const [students, setStudents] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [attendanceTypes, setAttendanceTypes] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [coursesRes, deptsRes, typesRes, configsRes] = await Promise.all([
        role === "faculty" ? supabase.from("courses").select("*").eq("faculty_id", user?.id) : supabase.from("courses").select("*").order("code"),
        supabase.from("departments").select("*"),
        supabase.from("attendance_types").select("*").order("sort_order"),
        supabase.from("attendance_config").select("*"),
      ]);
      setCourses(coursesRes.data || []);
      setDepartments(deptsRes.data || []);
      setAttendanceTypes(typesRes.data || []);
      setConfigs(configsRes.data || []);
    };
    if (user) fetch();
  }, [user, role]);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchReport = async () => {
      let attQuery = supabase.from("attendance_records").select("*").eq("course_id", selectedCourse);
      if (dateFrom) attQuery = attQuery.gte("date", dateFrom);
      if (dateTo) attQuery = attQuery.lte("date", dateTo);

      const [enrollRes, attRes, sessionsRes] = await Promise.all([
        supabase.from("enrollments").select("*").eq("course_id", selectedCourse).eq("status", "enrolled"),
        attQuery,
        supabase.from("class_sessions").select("*").eq("course_id", selectedCourse).eq("is_conducted", true),
      ]);

      const enrs = enrollRes.data || [];
      setAllRecords(attRes.data || []);
      setClassSessions(sessionsRes.data || []);

      if (enrs.length > 0) {
        const ids = enrs.map((e: any) => e.student_id);
        const { data } = await supabase.from("profiles").select("id, full_name, student_id_number, section_id").in("id", ids);
        setStudents(data || []);
      } else {
        setStudents([]);
      }
    };
    fetchReport();
  }, [selectedCourse, dateFrom, dateTo]);

  const getMinAttendance = () => {
    const config = configs[0]; // simplified: use first config or default
    return config?.min_attendance_overall || 75;
  };

  const getStudentReport = (studentId: string) => {
    const records = allRecords.filter((r) => r.student_id === studentId);
    const total = records.length;
    const theoryRecords = records.filter((r) => r.is_theory);
    const labRecords = records.filter((r) => !r.is_theory);

    const countPresent = (recs: any[]) => recs.filter((r) => {
      if (r.attendance_type_id) {
        const t = attendanceTypes.find((at) => at.id === r.attendance_type_id);
        return t?.counts_as_present;
      }
      return r.status === "present" || r.status === "late" || r.status === "l" || r.status === "od";
    }).length;

    const present = countPresent(records);
    const theoryPresent = countPresent(theoryRecords);
    const labPresent = countPresent(labRecords);

    const byType: Record<string, number> = {};
    records.forEach((r) => {
      const key = r.attendance_type_id || r.status;
      byType[key] = (byType[key] || 0) + 1;
    });

    return {
      total, present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      theoryTotal: theoryRecords.length, theoryPresent,
      theoryPct: theoryRecords.length > 0 ? Math.round((theoryPresent / theoryRecords.length) * 100) : 0,
      labTotal: labRecords.length, labPresent,
      labPct: labRecords.length > 0 ? Math.round((labPresent / labRecords.length) * 100) : 0,
      byType,
    };
  };

  const totalClasses = new Set(allRecords.map((a) => a.date)).size;
  const minAtt = getMinAttendance();

  const defaulterStudents = students.filter((s) => {
    const r = getStudentReport(s.id);
    return r.total > 0 && r.percentage < minAtt;
  });

  const exportCSV = () => {
    const headers = ["Student ID", "Name", "Total", "Present", "Absent", "Percentage", "Theory %", "Lab %"];
    const rows = students.map((s) => {
      const r = getStudentReport(s.id);
      return [s.student_id_number, s.full_name, r.total, r.present, r.absent, r.percentage + "%", r.theoryPct + "%", r.labPct + "%"];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${selectedCourse}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <Label>Course</Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!selectedCourse}>
          <Download className="h-4 w-4 mr-1" />Export CSV
        </Button>
      </div>

      {selectedCourse && (
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList>
            <TabsTrigger value="student-wise">Student-wise</TabsTrigger>
            <TabsTrigger value="defaulters">Defaulters ({defaulterStudents.length})</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="student-wise">
            <Card>
              <CardHeader>
                <CardTitle>Student-wise Attendance</CardTitle>
                <CardDescription>Total classes: {totalClasses} | Min required: {minAtt}%</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Theory %</TableHead>
                      <TableHead>Lab %</TableHead>
                      <TableHead>Overall %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    ) : students.map((s) => {
                      const r = getStudentReport(s.id);
                      const isLow = r.total > 0 && r.percentage < minAtt;
                      return (
                        <TableRow key={s.id} className={isLow ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-sm">{s.student_id_number || "—"}</TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell className="text-green-600">{r.present}</TableCell>
                          <TableCell className="text-destructive">{r.absent}</TableCell>
                          <TableCell>{r.theoryPct}%</TableCell>
                          <TableCell>{r.labPct}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={r.percentage} className="h-2 w-16" />
                              <span className="text-sm font-medium">{r.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isLow ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Low</Badge> : <Badge variant="outline">OK</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaulters">
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Defaulter List</CardTitle>
                <CardDescription>Students below {minAtt}% attendance threshold</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Attendance %</TableHead>
                      <TableHead>Classes Missed</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaulterStudents.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No defaulters</TableCell></TableRow>
                    ) : defaulterStudents.map((s) => {
                      const r = getStudentReport(s.id);
                      const severity = r.percentage < 65 ? "critical" : r.percentage < 70 ? "warning" : "caution";
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">{s.student_id_number || "—"}</TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={r.percentage} className="h-2 w-16" />
                              <span className="font-medium">{r.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{r.absent}</TableCell>
                          <TableCell>
                            <Badge variant={severity === "critical" ? "destructive" : "secondary"}>
                              {severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Caution"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalClasses}</div>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{students.length}</div>
                  <p className="text-sm text-muted-foreground">Enrolled Students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {students.length > 0 ? Math.round(students.reduce((acc, s) => acc + getStudentReport(s.id).percentage, 0) / students.length) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Attendance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-destructive">{defaulterStudents.length}</div>
                  <p className="text-sm text-muted-foreground">Defaulters (below {minAtt}%)</p>
                </CardContent>
              </Card>
            </div>

            {/* Type-wise breakdown */}
            <Card className="mt-4">
              <CardHeader><CardTitle>Attendance Type Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {attendanceTypes.map((t) => {
                    const count = allRecords.filter((r) => r.attendance_type_id === t.id || r.status === t.code.toLowerCase()).length;
                    return (
                      <div key={t.id} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-sm font-medium">{t.name}:</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
