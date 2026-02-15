import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Download, Upload, AlertTriangle, FileSpreadsheet, FileUp, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

export default function ExternalMarksEntry() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [existingMarks, setExistingMarks] = useState<any[]>([]);
  const [externalExaminers, setExternalExaminers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [enteredByType, setEnteredByType] = useState<"internal" | "external">("internal");
  const [selectedExaminer, setSelectedExaminer] = useState("");

  const [marks, setMarks] = useState<Record<string, Record<string, { marks: string; absent: boolean; malpractice: boolean; malpracticeRemarks: string; remarks: string }>>>({});
  const [canEdit, setCanEdit] = useState(true);

  const canManage = role === "admin" || role === "faculty" || role === "hod";
  const canApprove = role === "admin" || role === "hod";

  const fetchData = async () => {
    const typesRes = await supabase.from("assessment_component_types" as any).select("id, code").in("code", ["semester_end", "practical", "viva", "project", "supplementary"]);
    const typeIdsList = (typesRes.data as any[])?.map((t: any) => t.id) || [];
    const [coursesRes, compRes, secRes, extRes] = await Promise.all([
      role === "faculty"
        ? supabase.from("courses").select("*").eq("faculty_id", user?.id).order("code")
        : supabase.from("courses").select("*").order("code"),
      typeIdsList.length > 0
        ? supabase.from("assessment_component_definitions" as any)
            .select("*, assessment_component_types(code, name), courses(code, title)")
            .in("component_type_id", typeIdsList)
        : Promise.resolve({ data: [] }),
      supabase.from("sections" as any).select("*").eq("status", "active").order("name"),
      (supabase.from("exam_external_examiners" as any).select("id, name").eq("status", "confirmed") as any).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    setCourses(coursesRes.data || []);
    setComponents((compRes.data as any[]) || []);
    setSections((secRes.data as any[]) || []);
    setExternalExaminers((extRes.data as any[]) || []);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, role]);

  const externalComponents = components.filter(
    (c) =>
      selectedCourse &&
      c.course_id === selectedCourse &&
      ["semester_end", "practical", "viva", "project", "supplementary"].includes(c.assessment_component_types?.code || "")
  );

  useEffect(() => {
    if (!selectedCourse || externalComponents.length === 0) {
      setEnrollments([]);
      setStudents([]);
      setExistingMarks([]);
      setMarks({});
      return;
    }
    const fetchStudentsAndMarks = async () => {
      setLoading(true);
      let enrs = (
        await supabase.from("enrollments").select("*").eq("course_id", selectedCourse).eq("status", "enrolled")
      ).data || [];
      if (selectedSection) {
        const studentIds = enrs.map((e: any) => e.student_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .in("id", studentIds)
          .eq("section_id", selectedSection);
        const allowed = new Set((profs || []).map((p: any) => p.id));
        enrs = enrs.filter((e: any) => allowed.has(e.student_id));
      }
      setEnrollments(enrs);
      const studentIds = enrs.map((e: any) => e.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        setExistingMarks([]);
        setMarks({});
        setLoading(false);
        return;
      }
      const [studentsRes, marksRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, student_id_number").in("id", studentIds),
        supabase
          .from("assessment_component_marks" as any)
          .select("*")
          .in("component_definition_id", externalComponents.map((c) => c.id))
          .in("enrollment_id", enrs.map((e: any) => e.id)),
      ]);
      const studs = (studentsRes.data || []).sort((a: any, b: any) => (a.student_id_number || "").localeCompare(b.student_id_number || ""));
      setStudents(studs);
      setExistingMarks(marksRes.data || []);

      const allSubmitted = (marksRes.data || []).every((m: any) => m.status === "submitted");
      const anySentBack = (marksRes.data || []).some((m: any) => m.approval_status === "sent_back");
      setCanEdit(!allSubmitted || anySentBack);

      const marksMap: Record<string, Record<string, any>> = {};
      const compByDef: Record<string, any> = {};
      externalComponents.forEach((c) => {
        compByDef[c.id] = c;
      });
      studs.forEach((s: any) => {
        const enr = enrs.find((e: any) => e.student_id === s.id);
        if (!enr) return;
        marksMap[enr.id] = marksMap[enr.id] || {};
        externalComponents.forEach((comp) => {
          const code = comp.assessment_component_types?.code || "semester_end";
          const existing = (marksRes.data || []).find((m: any) => m.enrollment_id === enr.id && m.component_definition_id === comp.id) as any;
          marksMap[enr.id][comp.id] = {
            marks: existing?.marks_obtained != null ? String(existing.marks_obtained) : "",
            absent: existing?.is_absent === true,
            malpractice: existing?.is_malpractice === true,
            malpracticeRemarks: existing?.malpractice_remarks || "",
            remarks: existing?.remarks || "",
          };
        });
      });
      setMarks(marksMap);
      setLoading(false);
    };
    fetchStudentsAndMarks();
  }, [selectedCourse, selectedSection, externalComponents.map((c) => c.id).join(",")]);

  const getComponentByCode = (code: string) => externalComponents.find((c) => (c.assessment_component_types?.code || "") === code);
  const theoryComp = getComponentByCode("semester_end");
  const practicalComp = getComponentByCode("practical");
  const vivaComp = getComponentByCode("viva");
  const projectComp = getComponentByCode("project");

  const updateMark = (enrollmentId: string, compId: string, field: string, value: string | boolean) => {
    if (!canEdit) return;
    setMarks((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId] || {},
        [compId]: {
          ...(prev[enrollmentId]?.[compId] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" }),
          [field]: value,
        },
      },
    }));
  };

  const validateMarks = (val: string, max: number): string | null => {
    if (!val.trim()) return null;
    const n = parseFloat(val);
    if (isNaN(n)) return "Invalid";
    if (n < 0) return "≥0";
    if (n > max) return `Max ${max}`;
    return null;
  };

  const saveDraft = async () => {
    if (!user || externalComponents.length === 0) return;
    for (const enr of enrollments) {
      for (const comp of externalComponents) {
        const row = marks[enr.id]?.[comp.id];
        if (!row) continue;
        const marksVal = row.absent ? null : (row.marks?.trim() ? parseFloat(row.marks) : null);
        if (marksVal != null && validateMarks(String(marksVal), comp.max_marks || 100)) {
          toast({ title: "Validation error", variant: "destructive" });
          return;
        }
        const payload = {
          enrollment_id: enr.id,
          component_definition_id: comp.id,
          marks_obtained: marksVal,
          is_absent: row.absent,
          is_malpractice: row.malpractice,
          malpractice_remarks: row.malpractice ? (row.malpracticeRemarks || null) : null,
          remarks: row.remarks || null,
          status: "draft",
          entered_by: user.id,
          entered_by_type: enteredByType,
          appointed_external_examiner_id: enteredByType === "external" && selectedExaminer ? selectedExaminer : null,
        };
        const existing = existingMarks.find((m: any) => m.enrollment_id === enr.id && m.component_definition_id === comp.id);
        if (existing) {
          await supabase.from("assessment_component_marks" as any).update(payload).eq("id", existing.id);
        } else {
          await supabase.from("assessment_component_marks" as any).insert(payload);
        }
      }
    }
    toast({ title: "Draft saved" });
    fetchData();
  };

  const submitFinal = async () => {
    if (!user || externalComponents.length === 0) return;
    for (const enr of enrollments) {
      for (const comp of externalComponents) {
        const row = marks[enr.id]?.[comp.id];
        const marksVal = row?.absent ? null : (row?.marks?.trim() ? parseFloat(row.marks) : null);
        if (marksVal != null && validateMarks(String(marksVal), comp.max_marks || 100)) {
          toast({ title: "Fix validation errors first", variant: "destructive" });
          return;
        }
      }
    }
    for (const enr of enrollments) {
      for (const comp of externalComponents) {
        const row: any = marks[enr.id]?.[comp.id] || {};
        const marksVal = row.absent ? null : (row.marks?.trim() ? parseFloat(row.marks) : null);
        const payload = {
          marks_obtained: marksVal,
          is_absent: row.absent ?? false,
          is_malpractice: row.malpractice ?? false,
          malpractice_remarks: row.malpractice ? (row.malpracticeRemarks || null) : null,
          remarks: row.remarks || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
          approval_status: comp.requires_approval !== false ? "pending" : "approved",
          entered_by_type: enteredByType,
          appointed_external_examiner_id: enteredByType === "external" && selectedExaminer ? selectedExaminer : null,
        };
        const existing = existingMarks.find((m: any) => m.enrollment_id === enr.id && m.component_definition_id === comp.id);
        if (existing) {
          await supabase.from("assessment_component_marks" as any).update(payload).eq("id", existing.id);
        } else {
          await supabase.from("assessment_component_marks" as any).insert({
            enrollment_id: enr.id,
            component_definition_id: comp.id,
            ...payload,
            entered_by: user.id,
          });
        }
      }
    }
    setCanEdit(false);
    toast({ title: "Marks submitted — pending HOD/Exam cell approval" });
    fetchData();
  };

  const downloadTemplate = () => {
    if (externalComponents.length === 0 || students.length === 0) {
      toast({ title: "Select course and ensure components exist", variant: "destructive" });
      return;
    }
    const cols = ["Student ID", "Student Name", "Enrollment ID"];
    externalComponents.forEach((c) => {
      cols.push(`${c.assessment_component_types?.name || c.name} (max ${c.max_marks})`);
    });
    cols.push("Absent (Y/N)", "Malpractice (Y/N)", "Malpractice Remarks", "Remarks");
    const rows = [
      cols,
      ...enrollments.map((enr) => {
        const s = students.find((st: any) => st.id === enr.student_id);
        const r: (string | number)[] = [s?.student_id_number || "", s?.full_name || "", enr.id];
        externalComponents.forEach((comp) => {
          r.push(marks[enr.id]?.[comp.id]?.marks ?? "");
        });
        r.push(marks[enr.id]?.[externalComponents[0]?.id]?.absent ? "Y" : "N", marks[enr.id]?.[externalComponents[0]?.id]?.malpractice ? "Y" : "N", "", "");
        return r;
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "External Marks");
    XLSX.writeFile(wb, `external_marks_${selectedCourse}_template.xlsx`);
    toast({ title: "Template downloaded" });
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        if (rows.length < 2) {
          setUploadErrors(["Need header + data rows"]);
          return;
        }
        const header = (rows[0] || []) as string[];
        const enrollIdx = header.findIndex((h) => /enrollment/i.test(h)) ?? 2;
        const errors: string[] = [];
        const newMarks = JSON.parse(JSON.stringify(marks));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const enrollmentId = String(row[enrollIdx] ?? "").trim();
          const enr = enrollments.find((e: any) => e.id === enrollmentId);
          if (!enr) {
            errors.push(`Row ${i + 1}: Invalid enrollment ID`);
            continue;
          }
          newMarks[enr.id] = newMarks[enr.id] || {};
          externalComponents.forEach((comp, cIdx) => {
            const colIdx = 3 + cIdx;
            const val = String(row[colIdx] ?? "").trim();
            const absentStr = String(row[row.length - 4] ?? "N").toUpperCase();
            const malStr = String(row[row.length - 3] ?? "N").toUpperCase();
            newMarks[enr.id][comp.id] = {
              marks: absentStr === "Y" ? "" : val,
              absent: absentStr === "Y",
              malpractice: malStr === "Y",
              malpracticeRemarks: String(row[row.length - 2] ?? "").trim(),
              remarks: String(row[row.length - 1] ?? "").trim(),
            };
          });
        }
        setUploadErrors(errors);
        if (errors.length === 0) {
          setMarks(newMarks);
          toast({ title: "Bulk upload successful" });
        }
      } catch (err) {
        setUploadErrors([`Parse error: ${(err as Error).message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleUniversityImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const errors: string[] = [];
        const newMarks = JSON.parse(JSON.stringify(marks));
        const idKey = Object.keys(rows[0] || {}).find((k) => /student.*id|roll|id.*number/i.test(k)) || Object.keys(rows[0] || {})[0];
        const theoryKey = Object.keys(rows[0] || {}).find((k) => /theory|external|written/i.test(k));
        const practicalKey = Object.keys(rows[0] || {}).find((k) => /practical|lab/i.test(k));
        const vivaKey = Object.keys(rows[0] || {}).find((k) => /viva|oral/i.test(k));
        const projectKey = Object.keys(rows[0] || {}).find((k) => /project/i.test(k));
        for (const row of rows) {
          const sid = String(row[idKey] ?? "").trim();
          const s = students.find((st: any) => (st.student_id_number || st.id) === sid);
          const enr = enrollments.find((e: any) => e.student_id === s?.id);
          if (!enr) continue;
          newMarks[enr.id] = newMarks[enr.id] || {};
          if (theoryComp && theoryKey && row[theoryKey] != null) {
            newMarks[enr.id][theoryComp.id] = { ...(newMarks[enr.id][theoryComp.id] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" }), marks: String(row[theoryKey]) };
          }
          if (practicalComp && practicalKey && row[practicalKey] != null) {
            newMarks[enr.id][practicalComp.id] = { ...(newMarks[enr.id][practicalComp.id] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" }), marks: String(row[practicalKey]) };
          }
          if (vivaComp && vivaKey && row[vivaKey] != null) {
            newMarks[enr.id][vivaComp.id] = { ...(newMarks[enr.id][vivaComp.id] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" }), marks: String(row[vivaKey]) };
          }
          if (projectComp && projectKey && row[projectKey] != null) {
            newMarks[enr.id][projectComp.id] = { ...(newMarks[enr.id][projectComp.id] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" }), marks: String(row[projectKey]) };
          }
        }
        setMarks(newMarks);
        toast({ title: "University import applied (matched by Student ID)" });
      } catch (err) {
        setUploadErrors([`Import error: ${(err as Error).message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const verifyMarks = async (enrollmentId: string) => {
    if (!canApprove || !user) return;
    for (const comp of externalComponents) {
      const m = existingMarks.find((x: any) => x.enrollment_id === enrollmentId && x.component_definition_id === comp.id);
      if (m && !m.verified) {
        await supabase.from("assessment_component_marks" as any).update({ verified: true, verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", m.id);
      }
    }
    toast({ title: "Marks verified" });
    fetchData();
  };

  const getStudent = (sid: string) => students.find((s: any) => s.id === sid);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">External Marks Entry</h1>
          <p className="text-muted-foreground">Enter semester-end exam marks: theory (70), practical, viva, project. Absent, malpractice, verification, HOD/Exam cell approval.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Course & Section</CardTitle>
            <div className="flex flex-wrap gap-4">
              <div className="w-72">
                <label className="text-sm font-medium mb-2 block">Course *</label>
                <Select value={selectedCourse} onValueChange={(v) => { setSelectedCourse(v); setSelectedSection(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-sm font-medium mb-2 block">Section</label>
                <Select value={selectedSection || "__all__"} onValueChange={(v) => setSelectedSection(v === "__all__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-2 block">Entered By</label>
                <Select value={enteredByType} onValueChange={(v: "internal" | "external") => setEnteredByType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Faculty</SelectItem>
                    <SelectItem value="external">External Evaluator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {enteredByType === "external" && (
                <div className="w-56">
                  <label className="text-sm font-medium mb-2 block">External Examiner</label>
                  <Select value={selectedExaminer} onValueChange={setSelectedExaminer}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {externalExaminers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {externalComponents.length === 0 && selectedCourse && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No external components (Theory/Semester End, Practical, Viva, Project) defined for this course. Define them in Assessment Components.</AlertDescription>
          </Alert>
        )}

        {selectedCourse && externalComponents.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>External Marks ({enrollments.length} students)</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={!canEdit}>
                  <Download className="h-4 w-4 mr-2" /> Download Template
                </Button>
                <Button variant="outline" size="sm" disabled={!canEdit} asChild>
                  <label className="cursor-pointer flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Bulk Upload
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
                  </label>
                </Button>
                <Button variant="outline" size="sm" disabled={!canEdit} asChild>
                  <label className="cursor-pointer flex items-center gap-2">
                    <FileUp className="h-4 w-4" /> Import from University
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUniversityImport} />
                  </label>
                </Button>
                <Button onClick={saveDraft} disabled={loading || !canEdit} variant="outline">
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button onClick={submitFinal} disabled={loading || !canEdit}>
                  <Send className="h-4 w-4 mr-2" /> Submit for Approval
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    {theoryComp && <TableHead className="min-w-[80px]">Theory ({theoryComp.max_marks})</TableHead>}
                    {practicalComp && <TableHead className="min-w-[80px]">Practical ({practicalComp.max_marks})</TableHead>}
                    {vivaComp && <TableHead className="min-w-[80px]">Viva ({vivaComp.max_marks})</TableHead>}
                    {projectComp && <TableHead className="min-w-[80px]">Project ({projectComp.max_marks})</TableHead>}
                    <TableHead>Absent</TableHead>
                    <TableHead>Malpractice</TableHead>
                    <TableHead>Remarks</TableHead>
                    {canApprove && <TableHead>Verify</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : enrollments.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">No students</TableCell></TableRow>
                  ) : (
                    enrollments.map((enr) => {
                      const s = getStudent(enr.student_id);
                      const firstComp = externalComponents[0];
                      const row = marks[enr.id]?.[firstComp?.id] || { marks: "", absent: false, malpractice: false, malpracticeRemarks: "", remarks: "" };
                      return (
                        <TableRow key={enr.id}>
                          <TableCell className="font-mono text-sm">{s?.student_id_number || "—"}</TableCell>
                          <TableCell className="font-medium">{s?.full_name || "—"}</TableCell>
                          {theoryComp && (
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                max={theoryComp.max_marks}
                                value={marks[enr.id]?.[theoryComp.id]?.marks ?? ""}
                                onChange={(e) => updateMark(enr.id, theoryComp.id, "marks", e.target.value)}
                                disabled={(marks[enr.id]?.[theoryComp.id]?.absent) || !canEdit}
                                className="w-20"
                              />
                            </TableCell>
                          )}
                          {practicalComp && (
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                max={practicalComp.max_marks}
                                value={marks[enr.id]?.[practicalComp.id]?.marks ?? ""}
                                onChange={(e) => updateMark(enr.id, practicalComp.id, "marks", e.target.value)}
                                disabled={(marks[enr.id]?.[practicalComp.id]?.absent) || !canEdit}
                                className="w-20"
                              />
                            </TableCell>
                          )}
                          {vivaComp && (
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                max={vivaComp.max_marks}
                                value={marks[enr.id]?.[vivaComp.id]?.marks ?? ""}
                                onChange={(e) => updateMark(enr.id, vivaComp.id, "marks", e.target.value)}
                                disabled={(marks[enr.id]?.[vivaComp.id]?.absent) || !canEdit}
                                className="w-20"
                              />
                            </TableCell>
                          )}
                          {projectComp && (
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                max={projectComp.max_marks}
                                value={marks[enr.id]?.[projectComp.id]?.marks ?? ""}
                                onChange={(e) => updateMark(enr.id, projectComp.id, "marks", e.target.value)}
                                disabled={(marks[enr.id]?.[projectComp.id]?.absent) || !canEdit}
                                className="w-20"
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Checkbox
                              checked={row.absent}
                              onCheckedChange={(v) => externalComponents.forEach((c) => updateMark(enr.id, c.id, "absent", !!v))}
                              disabled={!canEdit}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={row.malpractice}
                              onCheckedChange={(v) => externalComponents.forEach((c) => updateMark(enr.id, c.id, "malpractice", !!v))}
                              disabled={!canEdit}
                            />
                            {row.malpractice && (
                              <Input
                                value={row.malpracticeRemarks}
                                onChange={(e) => externalComponents.forEach((c) => updateMark(enr.id, c.id, "malpracticeRemarks", e.target.value))}
                                placeholder="Details"
                                disabled={!canEdit}
                                className="mt-1 w-32 text-xs"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.remarks}
                              onChange={(e) => externalComponents.forEach((c) => updateMark(enr.id, c.id, "remarks", e.target.value))}
                              placeholder="Optional"
                              disabled={!canEdit}
                              className="max-w-32 text-sm"
                            />
                          </TableCell>
                          {canApprove && (
                            <TableCell>
                              {existingMarks.filter((m: any) => m.enrollment_id === enr.id).every((m: any) => m.verified) && existingMarks.some((m: any) => m.enrollment_id === enr.id) ? (
                                <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> Verified</Badge>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => verifyMarks(enr.id)}>Verify</Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {uploadErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {uploadErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {uploadErrors.length > 10 && <li>...and {uploadErrors.length - 10} more</li>}
              </ul>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setUploadErrors([])}>Dismiss</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
