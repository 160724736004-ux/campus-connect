import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell, Line, LineChart } from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Trophy,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0,
};
const GRADE_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#94a3b8"];

export default function MarksReports() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSection, setFilterSection] = useState("");

  const [reportData, setReportData] = useState<{
    enrollments: any[];
    grades: any[];
    profiles: any[];
    courses: any[];
    departments: any[];
    sections: any[];
    batches: any[];
    programs: any[];
  }>({
    enrollments: [],
    grades: [],
    profiles: [],
    courses: [],
    departments: [],
    sections: [],
    batches: [],
    programs: [],
  });

  useEffect(() => {
    const fetchFilters = async () => {
      const [yearsRes, semRes, deptRes, coursesRes, sectionsRes] = await Promise.all([
        supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
        supabase.from("semesters" as any).select("*").order("start_date"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("courses").select("id, code, title, department_id").order("code"),
        supabase.from("sections").select("id, name, batch_id").order("name"),
      ]);
      setAcademicYears((yearsRes.data as any[]) || []);
      setSemesters((semRes.data as any[]) || []);
      setDepartments((deptRes.data as any[]) || []);
      setCourses((coursesRes.data as any[]) || []);
      setSections((sectionsRes.data as any[]) || []);
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      let enrollQuery = supabase
        .from("enrollments")
        .select("id, student_id, course_id, semester, status")
        .eq("status", "enrolled");

      if (filterCourse) enrollQuery = enrollQuery.eq("course_id", filterCourse);
      if (filterSemester) enrollQuery = enrollQuery.eq("semester", filterSemester);

      const [enrRes, gradesRes] = await Promise.all([
        enrollQuery,
        supabase.from("grades").select("enrollment_id, letter_grade, grade_points, numeric_grade"),
      ]);
      let enrollments: any[] = (enrRes.data as any[]) || [];
      const grades = (gradesRes.data as any[]) || [];
      const gradeMap = Object.fromEntries(grades.map((g: any) => [g.enrollment_id, g]));

      let studentIds = [...new Set(enrollments.map((e: any) => e.student_id))];
      const courseIds = [...new Set(enrollments.map((e: any) => e.course_id))];

      const [profilesRes, coursesRes, deptRes, sectionsRes, batchesRes, programsRes] = await Promise.all([
        studentIds.length ? supabase.from("profiles").select("id, full_name, student_id_number, section_id, department_id, program_id").in("id", studentIds) : Promise.resolve({ data: [] }),
        courseIds.length ? supabase.from("courses").select("id, code, title, department_id, credits").in("id", courseIds) : Promise.resolve({ data: [] }),
        supabase.from("departments").select("*"),
        supabase.from("sections").select("id, name, batch_id"),
        supabase.from("batches").select("id, admission_year, program_id"),
        supabase.from("programs").select("id, name, department_id"),
      ]);

      let profiles = (profilesRes.data as any[]) || [];
      const coursesData = (coursesRes.data as any[]) || [];
      const departmentsData = (deptRes.data as any[]) || [];
      const sectionsData = (sectionsRes.data as any[]) || [];
      const batchesData = (batchesRes.data as any[]) || [];
      const programsData = (programsRes.data as any[]) || [];

      if (filterDept) {
        const deptCourseIds = coursesData.filter((c: any) => c.department_id === filterDept).map((c: any) => c.id);
        if (deptCourseIds.length) {
          enrollments = enrollments.filter((e: any) => deptCourseIds.includes(e.course_id));
          studentIds = [...new Set(enrollments.map((e: any) => e.student_id))];
          profiles = profiles.filter((p: any) => studentIds.includes(p.id));
        }
      }
      if (filterSection) {
        profiles = profiles.filter((p: any) => p.section_id === filterSection);
        const sid = profiles.map((p: any) => p.id);
        enrollments = enrollments.filter((e: any) => sid.includes(e.student_id));
      }

      setReportData({
        enrollments,
        grades,
        profiles,
        courses: coursesData,
        departments: departmentsData,
        sections: sectionsData,
        batches: batchesData,
        programs: programsData,
      });
      setLoading(false);
    };
    fetchReportData();
  }, [filterYear, filterSemester, filterDept, filterCourse, filterSection]);

  const gradeMap = useMemo(() => {
    const m: Record<string, any> = {};
    (reportData.grades || []).forEach((g: any) => { m[g.enrollment_id] = g; });
    return m;
  }, [reportData.grades]);

  const profileMap = useMemo(() => Object.fromEntries((reportData.profiles || []).map((p: any) => [p.id, p])), [reportData.profiles]);
  const courseMap = useMemo(() => Object.fromEntries((reportData.courses || []).map((c: any) => [c.id, c])), [reportData.courses]);
  const sectionMap = useMemo(() => Object.fromEntries((reportData.sections || []).map((s: any) => [s.id, s])), [reportData.sections]);
  const deptMap = useMemo(() => Object.fromEntries((reportData.departments || []).map((d: any) => [d.id, d])), [reportData.departments]);

  // Subject-wise performance: avg grade points per course
  const subjectWise = useMemo(() => {
    const byCourse: Record<string, { total: number; count: number; course: any }> = {};
    reportData.enrollments.forEach((e: any) => {
      const g = gradeMap[e.id];
      const pts = g?.grade_points ?? (g?.letter_grade ? GRADE_POINTS[g.letter_grade] : null);
      if (pts == null) return;
      const c = courseMap[e.course_id];
      if (!c) return;
      const key = e.course_id;
      if (!byCourse[key]) byCourse[key] = { total: 0, count: 0, course: c };
      byCourse[key].total += pts;
      byCourse[key].count += 1;
    });
    return Object.values(byCourse).map((v) => ({
      courseCode: v.course?.code || "—",
      courseTitle: v.course?.title || "—",
      students: v.count,
      avgGradePoints: v.count ? (v.total / v.count).toFixed(2) : "—",
    }));
  }, [reportData.enrollments, gradeMap, courseMap]);

  // Section-wise comparison
  const sectionWise = useMemo(() => {
    const bySection: Record<string, { total: number; count: number; section: any }> = {};
    reportData.enrollments.forEach((e: any) => {
      const p = profileMap[e.student_id];
      const sectionId = p?.section_id || "_none";
      const s = sectionMap[sectionId];
      const g = gradeMap[e.id];
      const pts = g?.grade_points ?? (g?.letter_grade ? GRADE_POINTS[g.letter_grade] : null);
      if (pts == null) return;
      if (!bySection[sectionId]) bySection[sectionId] = { total: 0, count: 0, section: s || { name: "Unassigned" } };
      bySection[sectionId].total += pts;
      bySection[sectionId].count += 1;
    });
    return Object.entries(bySection).map(([id, v]) => ({
      section: v.section?.name || "Unassigned",
      students: v.count,
      avgGradePoints: v.count ? (v.total / v.count).toFixed(2) : "—",
    }));
  }, [reportData.enrollments, gradeMap, profileMap, sectionMap]);

  // Topper list: by GPA (enrollment-level for selected course/semester, or aggregate)
  const toppers = useMemo(() => {
    const studentScores: Record<string, { total: number; count: number; credits: number; profile: any }> = {};
    reportData.enrollments.forEach((e: any) => {
      const g = gradeMap[e.id];
      const pts = g?.grade_points ?? (g?.letter_grade ? GRADE_POINTS[g.letter_grade] : null);
      if (pts == null || ["W", "I"].includes(g?.letter_grade || "")) return;
      const c = courseMap[e.course_id];
      const cred = c?.credits ?? 3;
      const p = profileMap[e.student_id];
      if (!p) return;
      const key = p.id;
      if (!studentScores[key]) studentScores[key] = { total: 0, count: 0, credits: 0, profile: p };
      studentScores[key].total += pts * cred;
      studentScores[key].credits += cred;
      studentScores[key].count += 1;
    });
    return Object.values(studentScores)
      .filter((v) => v.credits > 0)
      .map((v) => ({
        name: v.profile?.full_name || "—",
        idNumber: v.profile?.student_id_number || "—",
        gpa: (v.total / v.credits).toFixed(2),
        credits: v.credits,
      }))
      .sort((a, b) => parseFloat(b.gpa) - parseFloat(a.gpa))
      .slice(0, 20);
  }, [reportData.enrollments, gradeMap, courseMap, profileMap]);

  // Failure list
  const failures = useMemo(() => {
    const out: { name: string; idNumber: string; courseCode: string; letterGrade: string }[] = [];
    reportData.enrollments.forEach((e: any) => {
      const g = gradeMap[e.id];
      if (!g || g.letter_grade !== "F") return;
      const p = profileMap[e.student_id];
      const c = courseMap[e.course_id];
      out.push({
        name: p?.full_name || "—",
        idNumber: p?.student_id_number || "—",
        courseCode: c?.code || "—",
        letterGrade: g.letter_grade,
      });
    });
    return out;
  }, [reportData.enrollments, gradeMap, profileMap, courseMap]);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    reportData.grades.forEach((g: any) => {
      const lg = g.letter_grade || "Ungraded";
      dist[lg] = (dist[lg] || 0) + 1;
    });
    return Object.entries(dist).map(([grade, count]) => ({ grade, count }));
  }, [reportData.grades]);

  // Department analytics
  const departmentAnalytics = useMemo(() => {
    const byDept: Record<string, { total: number; count: number; dept: any }> = {};
    reportData.enrollments.forEach((e: any) => {
      const c = courseMap[e.course_id];
      if (!c?.department_id) return;
      const g = gradeMap[e.id];
      const pts = g?.grade_points ?? (g?.letter_grade ? GRADE_POINTS[g.letter_grade] : null);
      if (pts == null) return;
      const d = deptMap[c.department_id];
      if (!byDept[c.department_id]) byDept[c.department_id] = { total: 0, count: 0, dept: d || {} };
      byDept[c.department_id].total += pts;
      byDept[c.department_id].count += 1;
    });
    return Object.values(byDept).map((v) => ({
      department: v.dept?.name || "—",
      students: v.count,
      avgGradePoints: v.count ? (v.total / v.count).toFixed(2) : "—",
    }));
  }, [reportData.enrollments, gradeMap, courseMap, deptMap]);

  // Year-wise / historical (use semester as proxy)
  const yearWise = useMemo(() => {
    const bySem: Record<string, { total: number; count: number }> = {};
    reportData.enrollments.forEach((e: any) => {
      const sem = e.semester || "—";
      const g = gradeMap[e.id];
      const pts = g?.grade_points ?? (g?.letter_grade ? GRADE_POINTS[g.letter_grade] : null);
      if (pts == null) return;
      if (!bySem[sem]) bySem[sem] = { total: 0, count: 0 };
      bySem[sem].total += pts;
      bySem[sem].count += 1;
    });
    return Object.entries(bySem)
      .map(([sem, v]) => ({ semester: sem, avgGradePoints: v.count ? (v.total / v.count).toFixed(2) : "—", count: v.count }))
      .sort((a, b) => a.semester.localeCompare(b.semester));
  }, [reportData.enrollments, gradeMap]);

  const exportExcel = (tab: string, data: any[], columns: string[]) => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => {
      const obj: Record<string, string | number> = {};
      columns.forEach((c) => { obj[c] = (r as any)[c] ?? ""; });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab.slice(0, 31));
    XLSX.writeFile(wb, `marks-report-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (title: string, columns: string[], rows: any[][]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    (doc as any).autoTable({
      startY: 28,
      head: [columns],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8 },
    });
    doc.save(`${title.replace(/\s/g, "-")}.pdf`);
  };

  const chartConfig = { value: { label: "Count", color: "hsl(var(--chart-1))" } };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Marks Reports</h1>
            <p className="text-muted-foreground">Subject-wise, section-wise, toppers, failures, analytics & exports</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
            <CardDescription>Narrow reports by semester, department, course, or section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">Academic Year</label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">Semester</label>
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {semesters.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">Department</label>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">Course</label>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground block mb-1">Section</label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subject">Subject-wise</TabsTrigger>
            <TabsTrigger value="section">Section-wise</TabsTrigger>
            <TabsTrigger value="toppers">Toppers</TabsTrigger>
            <TabsTrigger value="failures">Failures</TabsTrigger>
            <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="year">Year Comparison</TabsTrigger>
            <TabsTrigger value="trends">Historical Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{reportData.enrollments.length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Graded</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{Object.keys(gradeMap).length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toppers</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{toppers.length}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Failures</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold text-destructive">{failures.length}</p></CardContent>
              </Card>
            </div>
            {gradeDistribution.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Grade Distribution</CardTitle><CardDescription>Overall grade breakdown</CardDescription></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={100} label={({ grade, count }) => `${grade}: ${count}`}>
                        {gradeDistribution.map((_, i) => <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="subject" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Subject-wise Performance</CardTitle><CardDescription>Average grade points by course</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("subject-wise", subjectWise, ["courseCode", "courseTitle", "students", "avgGradePoints"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Subject-wise Performance", ["Course", "Title", "Students", "Avg GPA"], subjectWise.map((r) => [r.courseCode, r.courseTitle, r.students, r.avgGradePoints]))}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : subjectWise.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Title</TableHead><TableHead>Students</TableHead><TableHead>Avg GPA</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {subjectWise.map((r, i) => (
                          <TableRow key={i}><TableCell className="font-mono">{r.courseCode}</TableCell><TableCell>{r.courseTitle}</TableCell><TableCell>{r.students}</TableCell><TableCell>{r.avgGradePoints}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {subjectWise.length > 0 && (
                      <ChartContainer config={chartConfig} className="h-[280px] mt-4">
                        <BarChart data={subjectWise}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="courseCode" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="avgGradePoints" fill="var(--color-value)" radius={4} name="Avg GPA" />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="section" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Section-wise Comparison</CardTitle><CardDescription>Average grade points by section</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("section-wise", sectionWise, ["section", "students", "avgGradePoints"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Section-wise Comparison", ["Section", "Students", "Avg GPA"], sectionWise.map((r) => [r.section, r.students, r.avgGradePoints]))}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : sectionWise.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Students</TableHead><TableHead>Avg GPA</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {sectionWise.map((r, i) => (
                          <TableRow key={i}><TableCell>{r.section}</TableCell><TableCell>{r.students}</TableCell><TableCell>{r.avgGradePoints}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {sectionWise.length > 0 && (
                      <ChartContainer config={chartConfig} className="h-[280px] mt-4">
                        <BarChart data={sectionWise}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="section" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="avgGradePoints" fill="var(--color-value)" radius={4} name="Avg GPA" />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="toppers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Topper List</CardTitle><CardDescription>Top 20 by GPA</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("toppers", toppers, ["name", "idNumber", "gpa", "credits"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Topper List", ["Name", "ID", "GPA", "Credits"], toppers.map((r) => [r.name, r.idNumber, r.gpa, r.credits]))}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : toppers.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Name</TableHead><TableHead>ID</TableHead><TableHead>GPA</TableHead><TableHead>Credits</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {toppers.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell><Badge variant={i < 3 ? "default" : "secondary"}>{i + 1}</Badge></TableCell>
                          <TableCell>{r.name}</TableCell><TableCell className="font-mono">{r.idNumber}</TableCell>
                          <TableCell className="font-bold">{r.gpa}</TableCell><TableCell>{r.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failures" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Failure List</CardTitle><CardDescription>Students with F grade</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("failures", failures, ["name", "idNumber", "courseCode", "letterGrade"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Failure List", ["Name", "ID", "Course", "Grade"], failures.map((r) => [r.name, r.idNumber, r.courseCode, r.letterGrade]))}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : failures.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No failures</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>ID</TableHead><TableHead>Course</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {failures.map((r, i) => (
                        <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="font-mono">{r.idNumber}</TableCell><TableCell>{r.courseCode}</TableCell><TableCell><Badge variant="destructive">{r.letterGrade}</Badge></TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Grade Distribution</CardTitle><CardDescription>Letter grade breakdown</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("grade-distribution", gradeDistribution, ["grade", "count"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : gradeDistribution.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {gradeDistribution.map((r, i) => (
                          <TableRow key={i}><TableCell><Badge variant="outline">{r.grade}</Badge></TableCell><TableCell>{r.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ChartContainer config={chartConfig} className="h-[280px] mt-4">
                      <BarChart data={gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-value)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="department" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Department Analytics</CardTitle><CardDescription>Average grade points by department</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("department", departmentAnalytics, ["department", "students", "avgGradePoints"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPDF("Department Analytics", ["Department", "Students", "Avg GPA"], departmentAnalytics.map((r) => [r.department, r.students, r.avgGradePoints]))}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : departmentAnalytics.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Students</TableHead><TableHead>Avg GPA</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {departmentAnalytics.map((r, i) => (
                          <TableRow key={i}><TableCell>{r.department}</TableCell><TableCell>{r.students}</TableCell><TableCell>{r.avgGradePoints}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ChartContainer config={chartConfig} className="h-[280px] mt-4">
                      <BarChart data={departmentAnalytics} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="department" width={80} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avgGradePoints" fill="var(--color-value)" radius={4} name="Avg GPA" />
                      </BarChart>
                    </ChartContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="year" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Year-wise Comparison</CardTitle><CardDescription>Average GPA by semester</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("year-wise", yearWise, ["semester", "avgGradePoints", "count"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : yearWise.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow><TableHead>Semester</TableHead><TableHead>Avg GPA</TableHead><TableHead>Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {yearWise.map((r, i) => (
                          <TableRow key={i}><TableCell>{r.semester}</TableCell><TableCell>{r.avgGradePoints}</TableCell><TableCell>{r.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ChartContainer config={chartConfig} className="h-[280px] mt-4">
                      <BarChart data={yearWise}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="semester" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avgGradePoints" fill="var(--color-value)" radius={4} name="Avg GPA" />
                      </BarChart>
                    </ChartContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Historical Trends</CardTitle><CardDescription>Average GPA over semesters</CardDescription></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportExcel("historical-trends", yearWise, ["semester", "avgGradePoints", "count"])}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> : yearWise.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[320px]">
                    <LineChart data={yearWise}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="avgGradePoints" stroke="var(--color-value)" strokeWidth={2} name="Avg GPA" dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
