import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Zap, History } from "lucide-react";
import { marksToGrade, DEFAULT_SCALE, scaleToGradePointsMap, SPECIAL_GRADES } from "@/lib/gradingUtils";

export default function Grading() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [existingGrades, setExistingGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Report state
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportCourse, setReportCourse] = useState("");

  // Grading scale
  const [gradingScales, setGradingScales] = useState<any[]>([]);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleForm, setScaleForm] = useState({ grade: "", min_marks_pct: "", max_marks_pct: "", grade_points: "" });
  const [scaleEditId, setScaleEditId] = useState<string | null>(null);

  // Numeric marks for auto-assign
  const [numericMarks, setNumericMarks] = useState<Record<string, string>>({});
  const [modificationHistory, setModificationHistory] = useState<any[]>([]);

  const baseGradePoints = gradingScales.length > 0
    ? scaleToGradePointsMap(gradingScales.map((s: any) => ({ grade: s.grade, minMarksPct: s.min_marks_pct, maxMarksPct: s.max_marks_pct, gradePoints: s.grade_points, isPass: s.is_pass, sortOrder: s.sort_order })))
    : scaleToGradePointsMap(DEFAULT_SCALE);
  const GRADE_POINTS = { ...baseGradePoints, ...SPECIAL_GRADES };
  const LETTER_GRADES = gradingScales.length > 0
    ? [...gradingScales].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((s: any) => s.grade)
    : [...DEFAULT_SCALE.map((s) => s.grade), "W", "I"];
  const SCALE_ENTRIES = gradingScales.length > 0
    ? gradingScales.map((s: any) => ({ grade: s.grade, minMarksPct: s.min_marks_pct, maxMarksPct: s.max_marks_pct, gradePoints: s.grade_points, isPass: s.is_pass, sortOrder: s.sort_order }))
    : DEFAULT_SCALE;

  useEffect(() => {
    if (!user) return;
    const fetchCourses = async () => {
      if (role === "faculty") {
        const { data } = await supabase.from("courses").select("*").eq("faculty_id", user.id);
        setCourses(data || []);
      } else if (role === "admin" || role === "hod") {
        const { data } = await supabase.from("courses").select("*").order("code");
        setCourses(data || []);
      }
    };
    fetchCourses();
  }, [user, role]);

  useEffect(() => {
    const fetchScales = async () => {
      const { data } = await supabase.from("grading_scales" as any).select("*").eq("is_active", true).eq("name", "Default").order("sort_order");
      setGradingScales((data as any[]) || []);
    };
    fetchScales();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchEnrollments = async () => {
      setLoading(true);
      const { data: enrollData } = await supabase.from("enrollments").select("*").eq("course_id", selectedCourse);
      const enrs = enrollData || [];
      setEnrollments(enrs);

      if (enrs.length > 0) {
        const studentIds = enrs.map((e: any) => e.student_id);
        const [studentsRes, gradesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, student_id_number").in("id", studentIds),
          supabase.from("grades").select("*").in("enrollment_id", enrs.map((e: any) => e.id)),
        ]);
        setStudents(studentsRes.data || []);
        setExistingGrades(gradesRes.data || []);
        const gradeMap: Record<string, string> = {};
        const numMap: Record<string, string> = {};
        (gradesRes.data || []).forEach((g: any) => {
          gradeMap[g.enrollment_id] = g.letter_grade || "";
          numMap[g.enrollment_id] = g.numeric_grade != null ? String(g.numeric_grade) : "";
        });
        setGrades(gradeMap);
        setNumericMarks(numMap);
      } else {
        setStudents([]); setExistingGrades([]); setGrades({}); setNumericMarks({});
      }
      setLoading(false);
    };
    fetchEnrollments();
  }, [selectedCourse]);

  // Fetch academic performance report
  useEffect(() => {
    if (!reportCourse || role !== "admin") return;
    const fetchReport = async () => {
      const { data: enrollData } = await supabase.from("enrollments").select("*").eq("course_id", reportCourse);
      const enrs = enrollData || [];
      if (enrs.length === 0) { setReportData([]); return; }

      const studentIds = enrs.map((e: any) => e.student_id);
      const [studentsRes, gradesRes, courseRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, student_id_number").in("id", studentIds),
        supabase.from("grades").select("*").in("enrollment_id", enrs.map((e: any) => e.id)),
        supabase.from("courses").select("credits").eq("id", reportCourse).single(),
      ]);

      const studentsMap = Object.fromEntries((studentsRes.data || []).map((s: any) => [s.id, s]));
      const gradesMap = Object.fromEntries((gradesRes.data || []).map((g: any) => [g.enrollment_id, g]));
      const credits = courseRes.data?.credits || 3;

      const report = enrs.map((e: any) => {
        const student = studentsMap[e.student_id] || {};
        const grade = gradesMap[e.id];
        return {
          studentName: student.full_name || "—",
          studentId: student.student_id_number || "—",
          letterGrade: grade?.letter_grade || "Not Graded",
          gradePoints: grade?.grade_points ?? null,
          credits,
        };
      });
      setReportData(report);
    };
    fetchReport();
  }, [reportCourse, role]);

  const handleGradeChange = (enrollmentId: string, grade: string) => {
    setGrades((prev) => ({ ...prev, [enrollmentId]: grade }));
  };

  const handleNumericChange = (enrollmentId: string, val: string) => {
    setNumericMarks((prev) => ({ ...prev, [enrollmentId]: val }));
  };

  const autoAssignGrades = () => {
    const newGrades = { ...grades };
    enrollments.forEach((e) => {
      const num = parseFloat(numericMarks[e.id] || "0");
      if (num >= 0 && num <= 100) {
        const res = marksToGrade(num, 100, SCALE_ENTRIES);
        if (res) newGrades[e.id] = res.grade;
      }
    });
    setGrades(newGrades);
    toast({ title: "Grades auto-assigned from marks" });
  };

  const saveGrades = async () => {
    if (!user) return;
    for (const enrollment of enrollments) {
      const grade = grades[enrollment.id];
      if (!grade) continue;
      const existing = existingGrades.find((g: any) => g.enrollment_id === enrollment.id);
      const numVal = numericMarks[enrollment.id] ? parseFloat(numericMarks[enrollment.id]) : null;
      const autoRes = numVal != null && numVal >= 0 ? marksToGrade(numVal, 100, SCALE_ENTRIES) : null;
      const isOverride = !!(autoRes && grade !== autoRes.grade);
      const payload = {
        letter_grade: grade,
        grade_points: GRADE_POINTS[grade] ?? 0,
        numeric_grade: numVal,
        auto_assigned_grade: autoRes?.grade || grade,
        is_manual_override: isOverride,
        override_approved_by: (isOverride && (role === "admin" || role === "hod")) ? user.id : existing?.override_approved_by,
        override_approved_at: (isOverride && (role === "admin" || role === "hod")) ? new Date().toISOString() : existing?.override_approved_at,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      };
      if (existing) {
        if (existing.letter_grade !== grade) {
          await supabase.from("grade_modification_history" as any).insert({
            grade_id: existing.id,
            old_letter_grade: existing.letter_grade,
            new_letter_grade: grade,
            old_grade_points: existing.grade_points,
            new_grade_points: payload.grade_points,
            modified_by: user.id,
            reason: isOverride ? "Manual override" : "Grade update",
            is_override: isOverride,
            approval_status: (role === "admin" || role === "hod") ? "approved" : "pending",
            approved_by: (role === "admin" || role === "hod") ? user.id : null,
            approved_at: (role === "admin" || role === "hod") ? new Date().toISOString() : null,
          });
        }
        await supabase.from("grades").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("grades").insert({ enrollment_id: enrollment.id, ...payload });
      }
    }
    toast({ title: "Grades saved" });
    if (selectedCourse) {
      const { data } = await supabase.from("grades").select("*").in("enrollment_id", enrollments.map((e: any) => e.id));
      setExistingGrades(data || []);
    }
  };

  const fetchModificationHistory = async (gradeIds: string[]) => {
    if (gradeIds.length === 0) return;
    const { data } = await supabase.from("grade_modification_history" as any).select("*, grades(enrollment_id)").in("grade_id", gradeIds).order("modified_at", { ascending: false });
    setModificationHistory((data as any[]) || []);
  };

  const getStudentName = (studentId: string) => students.find((s) => s.id === studentId)?.full_name || "—";
  const getStudentIdNum = (studentId: string) => students.find((s) => s.id === studentId)?.student_id_number || "—";

  // Grade distribution for report
  const gradeDistribution = () => {
    const dist: Record<string, number> = {};
    reportData.forEach((r) => { dist[r.letterGrade] = (dist[r.letterGrade] || 0) + 1; });
    return Object.entries(dist).sort(([a], [b]) => LETTER_GRADES.indexOf(a) - LETTER_GRADES.indexOf(b));
  };

  const avgGPA = () => {
    const graded = reportData.filter(r => r.gradePoints !== null && !["W", "I", "Not Graded"].includes(r.letterGrade));
    if (graded.length === 0) return "—";
    const total = graded.reduce((sum, r) => sum + r.gradePoints, 0);
    return (total / graded.length).toFixed(2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grade Management</h1>
          <p className="text-muted-foreground">Enter grades and view academic reports</p>
        </div>

        <Tabs defaultValue="entry">
          <TabsList>
            <TabsTrigger value="entry">Grade Entry</TabsTrigger>
            {(role === "admin" || role === "hod") && <TabsTrigger value="scale">Grading Scale</TabsTrigger>}
            {(role === "admin" || role === "hod") && <TabsTrigger value="history">Modification History</TabsTrigger>}
            {(role === "admin" || role === "hod") && <TabsTrigger value="reports">Academic Reports</TabsTrigger>}
          </TabsList>

          <TabsContent value="entry" className="space-y-4">
            <div className="max-w-sm">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedCourse && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <CardTitle>Student Grades</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={autoAssignGrades}><Zap className="h-4 w-4 mr-2" />Auto-assign from Marks</Button>
                    <Button onClick={saveGrades}>Save All Grades</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-24">Total Marks (0-100)</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : enrollments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students enrolled</TableCell></TableRow>
                      ) : (
                        enrollments.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono">{getStudentIdNum(e.student_id)}</TableCell>
                            <TableCell className="font-medium">{getStudentName(e.student_id)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="—"
                                className="w-20"
                                value={numericMarks[e.id] ?? ""}
                                onChange={(ev) => handleNumericChange(e.id, ev.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={grades[e.id] || ""} onValueChange={(v) => handleGradeChange(e.id, v)}>
                                <SelectTrigger className="w-[100px]"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{LETTER_GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{grades[e.id] ? (GRADE_POINTS[grades[e.id]] ?? 0).toFixed(1) : "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {(role === "admin" || role === "hod") && (
          <TabsContent value="scale" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
                <CardDescription>Marks range to grade mapping. O (90-100), A+ (80-89), A (70-79), B+ (60-69), B (50-59), C (40-49), D (30-39), F (0-29). Grade points: 10, 9, 8, 7, 6, 5, 4, 0.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Marks % Range</TableHead>
                      <TableHead>Grade Points</TableHead>
                      <TableHead>Pass</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(gradingScales.length > 0 ? gradingScales : DEFAULT_SCALE.map((s, i) => ({ grade: s.grade, min_marks_pct: s.minMarksPct, max_marks_pct: s.maxMarksPct, grade_points: s.gradePoints, is_pass: s.isPass }))).map((s: any) => (
                      <TableRow key={s.grade}>
                        <TableCell className="font-bold">{s.grade}</TableCell>
                        <TableCell>{s.min_marks_pct ?? s.minMarksPct} – {s.max_marks_pct ?? s.maxMarksPct}%</TableCell>
                        <TableCell>{s.grade_points ?? s.gradePoints}</TableCell>
                        <TableCell>{s.is_pass ?? s.isPass ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {(role === "admin" || role === "hod") && (
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Grade Modification History</CardTitle>
                <CardDescription>Track all grade changes, overrides, and approvals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select value={reportCourse} onValueChange={(v) => { setReportCourse(v); if (v) { const load = async () => { const { data: enr } = await supabase.from("enrollments").select("id").eq("course_id", v); const ids = (enr || []).map((e: any) => e.id); const { data: g } = await supabase.from("grades").select("id").in("enrollment_id", ids); fetchModificationHistory((g || []).map((x: any) => x.id)); }; load(); } }}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {modificationHistory.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">Select a course to view modification history, or no modifications yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Old Grade</TableHead>
                        <TableHead>New Grade</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Override</TableHead>
                        <TableHead>Modified</TableHead>
                        <TableHead>Approval</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modificationHistory.slice(0, 50).map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell>{h.old_letter_grade || "—"}</TableCell>
                          <TableCell className="font-medium">{h.new_letter_grade}</TableCell>
                          <TableCell>{h.reason || "—"}</TableCell>
                          <TableCell>{h.is_override ? <Badge variant="secondary">Override</Badge> : "—"}</TableCell>
                          <TableCell className="text-xs">{new Date(h.modified_at).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={h.approval_status === "approved" ? "default" : "outline"}>{h.approval_status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {(role === "admin" || role === "hod") && (
            <TabsContent value="reports" className="space-y-4">
              <div className="max-w-sm">
                <Select value={reportCourse} onValueChange={setReportCourse}>
                  <SelectTrigger><SelectValue placeholder="Select course for report" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {reportCourse && reportData.length > 0 && (
                <>
                  {/* Summary Cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Students</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{reportData.length}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average GPA</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{avgGPA()}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pass Rate</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportData.filter(r => r.gradePoints !== null && r.gradePoints >= 1.0).length > 0
                            ? Math.round((reportData.filter(r => r.gradePoints !== null && r.gradePoints >= 1.0).length / reportData.filter(r => r.letterGrade !== "Not Graded").length) * 100) + "%"
                            : "—"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grade Distribution */}
                  <Card>
                    <CardHeader><CardTitle>Grade Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {gradeDistribution().map(([grade, count]) => (
                          <div key={grade} className="flex items-center gap-3">
                            <Badge variant="outline" className="w-20 justify-center">{grade}</Badge>
                            <Progress value={(count / reportData.length) * 100} className="h-3 flex-1" />
                            <span className="text-sm text-muted-foreground w-16 text-right">{count} ({Math.round((count / reportData.length) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Table */}
                  <Card>
                    <CardHeader><CardTitle>Student Performance</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Grade Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{r.studentId}</TableCell>
                              <TableCell className="font-medium">{r.studentName}</TableCell>
                              <TableCell><Badge variant={r.letterGrade === "Not Graded" ? "outline" : "default"}>{r.letterGrade}</Badge></TableCell>
                              <TableCell>{r.gradePoints !== null ? r.gradePoints.toFixed(1) : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
