import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { Download, TrendingUp, Calculator, Lightbulb } from "lucide-react";
import { calculateInternalMarks, calculateWhatIf } from "@/lib/internalMarksCalculation";
import { computeSubjectTotal, EXTERNAL_COMPONENT_CODES, type TotalMarksResult } from "@/lib/totalMarksCalculation";
import { calculateCGPA, calculateSGPA } from "@/lib/sgpaCgpaCalculation";

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0,
};

export default function Grades() {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [componentMarks, setComponentMarks] = useState<any[]>([]);
  const [componentDefs, setComponentDefs] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [gracePolicies, setGracePolicies] = useState<any[]>([]);
  const [passRules, setPassRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchGrades = async () => {
      setLoading(true);
      const { data: enrollments } = await supabase.from("enrollments").select("*").eq("student_id", user.id);
      if (!enrollments || enrollments.length === 0) { setTranscript([]); setLoading(false); return; }

      const enrollmentIds = enrollments.map((e: any) => e.id);
      const courseIds = enrollments.map((e: any) => e.course_id);

      const [gradesRes, coursesRes, compMarksRes, defsRes, graceRes, passRes] = await Promise.all([
        supabase.from("grades").select("*").in("enrollment_id", enrollmentIds),
        supabase.from("courses").select("id, code, title, credits").in("id", courseIds),
        supabase.from("assessment_component_marks" as any)
          .select("*, enrollments(course_id, semester), assessment_component_definitions(id, name, max_marks, weightage_percent, calculation_formula, best_of_n_count, round_off_rule, assessment_component_types(code), courses(code, title))")
          .in("enrollment_id", enrollmentIds)
          .eq("approval_status", "approved")
          .not("published_at", "is", null),
        supabase.from("assessment_component_definitions" as any).select("id, course_id, name, max_marks, weightage_percent, calculation_formula, best_of_n_count, round_off_rule, sort_order, assessment_component_types(code)").in("course_id", courseIds),
        courseIds.length > 0 ? supabase.from("grace_marks_policies" as any).select("*").eq("is_active", true).in("course_id", courseIds) : Promise.resolve({ data: [] }),
        courseIds.length > 0 ? supabase.from("course_pass_rules" as any).select("*").in("course_id", courseIds) : Promise.resolve({ data: [] }),
      ]);

      const coursesData = coursesRes.data || [];
      setCourses(coursesData);
      const coursesMap = Object.fromEntries(coursesData.map((c: any) => [c.id, c]));
      const gradesMap = Object.fromEntries((gradesRes.data || []).map((g: any) => [g.enrollment_id, g]));

      const items = enrollments.map((e: any) => {
        const course = coursesMap[e.course_id] || {};
        const grade = gradesMap[e.id];
        return {
          semester: e.semester,
          courseCode: course.code || "—",
          courseTitle: course.title || "—",
          credits: course.credits || 0,
          letterGrade: grade?.letter_grade || "—",
          gradePoints: grade?.grade_points ?? null,
          status: e.status,
        };
      });
      setTranscript(items);

      const compMarksRaw = compMarksRes.data || [];
      const compMarks = compMarksRaw.map((m: any) => {
        const enr = enrollments.find((e: any) => e.id === m.enrollment_id);
        const def = m.assessment_component_definitions;
        const course = def?.courses || {};
        return {
          semester: enr?.semester || m.enrollments?.semester,
          courseId: enr?.course_id,
          courseCode: course.code || "—",
          courseTitle: course.title || "—",
          componentName: def?.name || "—",
          componentTypeCode: def?.assessment_component_types?.code,
          maxMarks: def?.max_marks ?? 100,
          marksObtained: m.marks_obtained,
          isAbsent: m.is_absent,
          componentDefId: m.component_definition_id,
          enrollmentId: m.enrollment_id,
          weightagePercent: def?.weightage_percent ?? 0,
          calculationFormula: def?.calculation_formula,
          bestOfNCount: def?.best_of_n_count,
          roundOffRule: def?.round_off_rule,
        };
      });
      setComponentMarks(compMarks);
      setComponentDefs((defsRes.data as any[]) || []);
      setEnrollments(enrollments);
      setGracePolicies((graceRes.data as any[]) || []);
      setPassRules((passRes.data as any[]) || []);
      setLoading(false);
    };
    fetchGrades();
  }, [user]);

  const semesters = [...new Set(transcript.map((t) => t.semester))].sort();

  const cgpaResult = transcript.length > 0 ? calculateCGPA(transcript) : null;
  const cumulativeGPAFromCGPA = cgpaResult?.cgpa != null ? cgpaResult.cgpa.toFixed(2) : "—";

  const calcGPA = (items: any[]) => {
    const graded = items.filter((i) => i.gradePoints !== null && !["W", "I"].includes(i.letterGrade));
    if (graded.length === 0) return "—";
    const totalPoints = graded.reduce((sum: number, i: any) => sum + i.gradePoints * i.credits, 0);
    const totalCredits = graded.reduce((sum: number, i: any) => sum + i.credits, 0);
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "—";
  };

  const cumulativeGPA = calcGPA(transcript);

  const compMarksBySemester = [...new Set(componentMarks.map((m) => m.semester).filter(Boolean))].sort().reverse();

  const calculatedByEnrollment = (() => {
    const result: { enrollmentId: string; courseId: string; courseCode: string; courseTitle: string; semester: string; calc: ReturnType<typeof calculateInternalMarks> }[] = [];
    for (const enr of enrollments) {
      const defs = componentDefs
        .filter((d: any) => d.course_id === enr.course_id)
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          maxMarks: d.max_marks ?? 100,
          weightagePercent: d.weightage_percent ?? 0,
          calculationFormula: d.calculation_formula,
          bestOfNCount: d.best_of_n_count,
          roundOffRule: d.round_off_rule,
        }));
      const marks = componentMarks
        .filter((m) => m.enrollmentId === enr.id)
        .map((m) => ({
          componentDefId: m.componentDefId,
          marksObtained: m.isAbsent ? null : m.marksObtained,
          isAbsent: m.isAbsent,
          maxMarks: m.maxMarks,
        }));
      if (defs.length === 0 || marks.length === 0) continue;
      const policy = gracePolicies.find((p: any) => p.course_id === enr.course_id);
      const firstMark = componentMarks.find((m) => m.enrollmentId === enr.id);
      const calc = calculateInternalMarks(defs, marks, {
        totalInternalOutOf: 40,
        graceMarks: policy?.max_grace_marks ?? 0,
      });
      result.push({
        enrollmentId: enr.id,
        courseId: enr.course_id,
        courseCode: firstMark?.courseCode ?? "—",
        courseTitle: firstMark?.courseTitle ?? "—",
        semester: enr.semester || "—",
        calc,
      });
    }
    return result;
  })();

  const totalByEnrollment = (() => {
    const result: { enrollmentId: string; courseId: string; courseCode: string; courseTitle: string; credits: number; semester: string; total: TotalMarksResult }[] = [];
    for (const enr of enrollments) {
      const defs = componentDefs.filter((d: any) => d.course_id === enr.course_id);
      const typeCode = (d: any) => d.assessment_component_types?.code || "";
      const internalDefs = defs
        .filter((d: any) => !EXTERNAL_COMPONENT_CODES.includes(typeCode(d)))
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          maxMarks: d.max_marks ?? 100,
          weightagePercent: d.weightage_percent ?? 0,
          calculationFormula: d.calculation_formula,
          bestOfNCount: d.best_of_n_count,
          roundOffRule: d.round_off_rule,
        }));
      const externalMarksRaw = componentMarks.filter(
        (m: any) => m.enrollmentId === enr.id && EXTERNAL_COMPONENT_CODES.includes(m.componentTypeCode || "")
      );
      const internalMarks = componentMarks
        .filter((m: any) => m.enrollmentId === enr.id && !EXTERNAL_COMPONENT_CODES.includes(m.componentTypeCode || ""))
        .map((m: any) => ({
          componentDefId: m.componentDefId,
          marksObtained: m.isAbsent ? null : m.marksObtained,
          isAbsent: m.isAbsent,
          maxMarks: m.maxMarks,
        }));
      const externalMarks = externalMarksRaw.map((m: any) => ({
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        isAbsent: m.isAbsent,
      }));
      const firstMark = componentMarks.find((m: any) => m.enrollmentId === enr.id);
      const course = courses.find((c: any) => c.id === enr.course_id);
      const rule = passRules.find((r: any) => r.course_id === enr.course_id);
      const policy = gracePolicies.find((p: any) => p.course_id === enr.course_id);
      const opts = {
        totalInternalOutOf: rule?.internal_out_of ?? 30,
        totalExternalOutOf: rule?.external_out_of ?? 70,
        graceMarks: policy?.max_grace_marks ?? 0,
        passPctExternal: rule?.pass_pct_external ?? 40,
        passPctTotal: rule?.pass_pct_total ?? 40,
      };
      const res = computeSubjectTotal(internalDefs, internalMarks, externalMarks, opts);
      result.push({
        enrollmentId: enr.id,
        courseId: enr.course_id,
        courseCode: firstMark?.courseCode ?? "—",
        courseTitle: firstMark?.courseTitle ?? "—",
        credits: course?.credits ?? 0,
        semester: enr.semester || "—",
        total: res,
      });
    }
    return result;
  })();
  const [whatIfCourse, setWhatIfCourse] = useState("");
  const [whatIfOverrides, setWhatIfOverrides] = useState<Record<string, string>>({});
  const whatIfEnrollment = enrollments.find((e: any) => e.id === whatIfCourse) || enrollments[0];
  const whatIfCalc = whatIfEnrollment
    ? (() => {
        const defs = componentDefs
          .filter((d: any) => d.course_id === whatIfEnrollment.course_id)
          .map((d: any) => ({
            id: d.id,
            name: d.name,
            maxMarks: d.max_marks ?? 100,
            weightagePercent: d.weightage_percent ?? 0,
            calculationFormula: d.calculation_formula,
            bestOfNCount: d.best_of_n_count,
            roundOffRule: d.round_off_rule,
          }));
        const marks = componentMarks
          .filter((m) => m.enrollmentId === whatIfEnrollment.id)
          .map((m) => ({
            componentDefId: m.componentDefId,
            marksObtained: m.isAbsent ? null : m.marksObtained,
            isAbsent: m.isAbsent,
            maxMarks: m.maxMarks,
          }));
        const overrides: Record<string, number> = {};
        Object.entries(whatIfOverrides).forEach(([k, v]) => {
          const n = parseFloat(v);
          if (!Number.isNaN(n)) overrides[k] = n;
        });
        if (defs.length === 0 || marks.length === 0) return null;
        return calculateWhatIf(defs, marks, overrides, { totalInternalOutOf: 40 });
      })()
    : null;

  const downloadMarksStatement = () => {
    const rows = [
      ["Marks Statement", "", "", "", ""],
      ["Semester", "Course", "Component", "Max Marks", "Marks Obtained"],
      ...componentMarks.map((m) => [m.semester || "—", `${m.courseCode} — ${m.courseTitle}`, m.componentName, m.maxMarks, m.isAbsent ? "Absent" : (m.marksObtained != null ? Number(m.marksObtained) : "—")]),
    ];
    const transcriptRows = [
      [],
      ["Transcript", "", "", "", ""],
      ["Semester", "Course", "Credits", "Grade", "Points"],
      ...transcript.map((t) => [t.semester, `${t.courseCode} — ${t.courseTitle}`, t.credits, t.letterGrade, t.gradePoints ?? "—"]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    const ws2 = XLSX.utils.aoa_to_sheet(transcriptRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Internal Assessment");
    XLSX.utils.book_append_sheet(wb, ws2, "Transcript");
    XLSX.writeFile(wb, "marks_statement.xlsx");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Grades</h1>
            <p className="text-muted-foreground">Transcript and internal assessment marks</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={downloadMarksStatement} disabled={loading || (transcript.length === 0 && componentMarks.length === 0)}>
              <Download className="h-4 w-4 mr-2" />
              Download Marks Statement
            </Button>
            <Card className="px-4 py-2">
            <div className="text-sm text-muted-foreground">CGPA</div>
            <div className="text-2xl font-bold">{cumulativeGPAFromCGPA}</div>
            {cgpaResult && cgpaResult.cumulativeCredits > 0 && (
              <div className="text-xs text-muted-foreground">{cgpaResult.cumulativeCreditPoints.toFixed(1)} / {cgpaResult.cumulativeCredits} credits</div>
            )}
          </Card>
          </div>
        </div>

        <Tabs defaultValue="transcript">
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="sgpa">SGPA / CGPA</TabsTrigger>
            <TabsTrigger value="internal">Internal Assessment</TabsTrigger>
            <TabsTrigger value="calculated">Calculated Internal</TabsTrigger>
            <TabsTrigger value="total">Total Marks</TabsTrigger>
            <TabsTrigger value="whatif">What-If</TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="space-y-6 mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : transcript.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No grades available yet.</CardContent></Card>
        ) : (
          semesters.map((sem) => {
            const items = transcript.filter((t) => t.semester === sem);
            return (
              <Card key={sem}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>{sem}</CardTitle>
                    {cgpaResult && (() => {
                      const sg = cgpaResult.sgpaBySemester.find((s) => s.semester === sem);
                      return sg ? <Badge variant="outline">SGPA: {sg.sgpa.toFixed(2)} ({sg.totalCreditPoints.toFixed(0)} / {sg.totalCredits} cr)</Badge> : <Badge variant="outline">GPA: {calcGPA(items)}</Badge>;
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Credit Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => {
                        const gp = item.gradePoints ?? 0;
                        const cp = (item.credits || 0) * (["W", "I", "—", ""].includes(item.letterGrade || "") ? 0 : gp);
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{item.courseCode}</TableCell>
                            <TableCell className="font-medium">{item.courseTitle}</TableCell>
                            <TableCell>{item.credits}</TableCell>
                            <TableCell><Badge variant={item.letterGrade === "F" ? "destructive" : item.letterGrade === "—" ? "outline" : "default"}>{item.letterGrade}</Badge></TableCell>
                            <TableCell>{item.gradePoints !== null ? item.gradePoints.toFixed(1) : "—"}</TableCell>
                            <TableCell>{cp.toFixed(1)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
          </TabsContent>
          <TabsContent value="sgpa" className="mt-4 space-y-6">
            {loading || transcript.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{loading ? "Loading…" : "No grades available."}</CardContent></Card>
            ) : cgpaResult ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> SGPA & CGPA</CardTitle>
                    <p className="text-sm text-muted-foreground">Credit Points = Credits × Grade Points. Failed (F) uses 0 points. Excluded: W, I, —</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Cumulative CGPA</div>
                        <div className="text-3xl font-bold">{cgpaResult.cgpa.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Total Credit Points: {cgpaResult.cumulativeCreditPoints.toFixed(1)} / Total Credits: {cgpaResult.cumulativeCredits}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Historical SGPA by Semester</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Semester</TableHead>
                          <TableHead>SGPA</TableHead>
                          <TableHead>Credit Points</TableHead>
                          <TableHead>Credits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cgpaResult.sgpaBySemester.map((s) => (
                          <TableRow key={s.semester}>
                            <TableCell className="font-medium">{s.semester}</TableCell>
                            <TableCell>{s.sgpa.toFixed(2)}</TableCell>
                            <TableCell>{s.totalCreditPoints.toFixed(1)}</TableCell>
                            <TableCell>{s.totalCredits}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {cgpaResult.sgpaBySemester.map((s) => {
                  const items = transcript.filter((t) => t.semester === s.semester);
                  return (
                    <Card key={s.semester}>
                      <CardHeader><CardTitle>{s.semester} — Subject-wise Credit Points</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Course</TableHead>
                              <TableHead>Credits</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Grade Pts</TableHead>
                              <TableHead>Credit Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((i) => {
                              const gp = i.gradePoints ?? 0;
                              const excluded = ["W", "I", "—", ""].includes(i.letterGrade || "");
                              const cp = (i.credits || 0) * (excluded ? 0 : gp);
                              return (
                                <TableRow key={i.courseCode} className={i.letterGrade === "F" ? "bg-destructive/5" : undefined}>
                                  <TableCell>{i.courseCode} — {i.courseTitle}</TableCell>
                                  <TableCell>{i.credits}</TableCell>
                                  <TableCell><Badge variant={i.letterGrade === "F" ? "destructive" : "outline"}>{i.letterGrade}</Badge></TableCell>
                                  <TableCell>{excluded ? "—" : gp.toFixed(1)}</TableCell>
                                  <TableCell>{cp.toFixed(1)}{i.letterGrade === "F" ? " (failed)" : ""}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Unable to compute SGPA/CGPA.</CardContent></Card>
            )}
          </TabsContent>
          <TabsContent value="internal" className="mt-4 space-y-6">
            {componentMarks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No published internal assessment marks yet.</CardContent></Card>
            ) : (
              <>
                {compMarksBySemester.length > 0 ? (
                  compMarksBySemester.map((sem) => {
                    const marks = componentMarks.filter((m) => m.semester === sem);
                    const withNumeric = marks.filter((m) => !m.isAbsent && m.marksObtained != null);
                    const avg = withNumeric.length ? (withNumeric.reduce((s, m) => s + Number(m.marksObtained), 0) / withNumeric.length).toFixed(2) : null;
                    return (
                      <Card key={sem}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              {sem} — Component-wise breakdown
                            </CardTitle>
                            {avg && <Badge variant="outline">Class avg (this view): {avg}</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead>Component</TableHead>
                                <TableHead>Max</TableHead>
                                <TableHead>Marks</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {marks.map((m, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono">{m.courseCode} — {m.courseTitle}</TableCell>
                                  <TableCell>{m.componentName}</TableCell>
                                  <TableCell>{m.maxMarks}</TableCell>
                                  <TableCell>{m.isAbsent ? <Badge variant="secondary">Absent</Badge> : (m.marksObtained != null ? Number(m.marksObtained).toFixed(2) : "—")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardHeader><CardTitle>Component Marks</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Component</TableHead>
                            <TableHead>Max</TableHead>
                            <TableHead>Marks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {componentMarks.map((m, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{m.courseCode} — {m.courseTitle}</TableCell>
                              <TableCell>{m.componentName}</TableCell>
                              <TableCell>{m.maxMarks}</TableCell>
                              <TableCell>{m.isAbsent ? <Badge variant="secondary">Absent</Badge> : (m.marksObtained != null ? Number(m.marksObtained).toFixed(2) : "—")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="calculated" className="mt-4 space-y-6">
            {calculatedByEnrollment.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No internal marks to calculate. Add component definitions with weightage.</CardContent></Card>
            ) : (
              calculatedByEnrollment.map((item) => (
                <Card key={item.enrollmentId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      {item.courseCode} — {item.courseTitle}
                    </CardTitle>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="default">Total: {item.calc.total.toFixed(2)} / 100</Badge>
                      {item.calc.scaled != null && <Badge variant="outline">Scaled: {item.calc.scaled.toFixed(2)} / 40</Badge>}
                      {item.calc.graceApplied > 0 && <Badge variant="secondary">Grace: +{item.calc.graceApplied}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Raw</TableHead>
                          <TableHead>Rounded</TableHead>
                          <TableHead>Weighted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.calc.breakdown.map((b, i) => (
                          <TableRow key={i}>
                            <TableCell>{b.component}</TableCell>
                            <TableCell>{b.raw.toFixed(2)}</TableCell>
                            <TableCell>{b.rounded.toFixed(2)}</TableCell>
                            <TableCell>{b.weighted.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="total" className="mt-4 space-y-6">
            {totalByEnrollment.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No total marks data. Ensure internal and external (theory/practical/viva/project) component marks are entered and published.</CardContent></Card>
            ) : (
              <>
                {semesters.map((sem) => {
                  const items = totalByEnrollment.filter((t) => t.semester === sem);
                  if (items.length === 0) return null;
                  const semesterTotal = items.reduce((s, i) => s + i.total.total, 0);
                  const semesterCredits = items.reduce((s, i) => s + i.credits, 0);
                  const detainedCount = items.filter((i) => i.total.detained).length;
                  const passedCount = items.filter((i) => i.total.passed).length;
                  return (
                    <Card key={sem}>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />{sem} — Subject-wise Total</CardTitle>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline">Total: {semesterTotal.toFixed(1)} / {items.length * 100}</Badge>
                            <Badge variant={detainedCount > 0 ? "destructive" : "secondary"}>
                              {passedCount} Passed / {detainedCount} Detained
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Internal (30) + External (70) = 100. Pass: 40% external, 40% total.</p>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Course</TableHead>
                              <TableHead>Internal</TableHead>
                              <TableHead>External</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Grace</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.enrollmentId}>
                                <TableCell className="font-mono">{item.courseCode} — {item.courseTitle}</TableCell>
                                <TableCell>{item.total.internal.toFixed(1)} / 30</TableCell>
                                <TableCell>{item.total.external.toFixed(1)} / 70</TableCell>
                                <TableCell className="font-medium">{item.total.total.toFixed(1)} / 100</TableCell>
                                <TableCell>{item.total.graceApplied > 0 ? `+${item.total.graceApplied}` : "—"}</TableCell>
                                <TableCell>
                                  {item.total.absent ? (
                                    <Badge variant="secondary">Absent</Badge>
                                  ) : item.total.detained ? (
                                    <Badge variant="destructive">Detained</Badge>
                                  ) : item.total.passed ? (
                                    <Badge variant="default">Passed</Badge>
                                  ) : (
                                    <Badge variant="outline">—</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>
          <TabsContent value="whatif" className="mt-4 space-y-6">
            {enrollments.length === 0 || componentMarks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No courses with internal marks for what-if simulation.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />What-If Scenarios</CardTitle>
                  <p className="text-sm text-muted-foreground">Enter hypothetical marks to see how your final internal would change (real-time)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select course</label>
                    <select
                      value={whatIfCourse || enrollments[0]?.id}
                      onChange={(e) => { setWhatIfCourse(e.target.value); setWhatIfOverrides({}); }}
                      className="w-full border rounded-md px-3 py-2 mt-1"
                    >
                      {enrollments.map((e: any) => {
                        const m = componentMarks.find((x) => x.enrollmentId === e.id);
                        return <option key={e.id} value={e.id}>{m?.courseCode ?? "—"} — {m?.courseTitle ?? "—"}</option>;
                      })}
                    </select>
                  </div>
                  {whatIfCalc && (
                    <>
                      <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                        <div><span className="text-sm text-muted-foreground">Calculated total</span><div className="text-2xl font-bold">{whatIfCalc.total.toFixed(2)}</div></div>
                        {whatIfCalc.scaled != null && <div><span className="text-sm text-muted-foreground">Scaled (out of 40)</span><div className="text-2xl font-bold">{whatIfCalc.scaled.toFixed(2)}</div></div>}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Max</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead>What-If (override)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {componentMarks
                            .filter((m) => m.enrollmentId === (whatIfCourse || enrollments[0]?.id))
                            .map((m) => (
                              <TableRow key={m.componentDefId}>
                                <TableCell>{m.componentName}</TableCell>
                                <TableCell>{m.maxMarks}</TableCell>
                                <TableCell>{m.isAbsent ? "Absent" : (m.marksObtained != null ? Number(m.marksObtained).toFixed(2) : "—")}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Try..."
                                    className="w-24"
                                    value={whatIfOverrides[m.componentDefId] ?? ""}
                                    onChange={(e) => setWhatIfOverrides((prev) => ({ ...prev, [m.componentDefId]: e.target.value }))}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
