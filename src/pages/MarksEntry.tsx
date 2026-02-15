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
import { Save, Send, Download, Upload, AlertTriangle, Lock, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { format, parseISO, isAfter, addHours } from "date-fns";

export default function MarksEntry() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [existingMarks, setExistingMarks] = useState<any[]>([]);
  const [componentDef, setComponentDef] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [marks, setMarks] = useState<Record<string, { marks: string; absent: boolean; remarks: string }>>({});
  const [entryStatus, setEntryStatus] = useState<"open" | "grace" | "late" | "closed">("open");
  const [canEdit, setCanEdit] = useState(true);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const canManage = role === "admin" || role === "faculty" || role === "hod";

  const fetchCoursesAndComponents = async () => {
    const [coursesRes, compRes, secRes] = await Promise.all([
      role === "faculty"
        ? supabase.from("courses").select("*").eq("faculty_id", user?.id).order("code")
        : supabase.from("courses").select("*").order("code"),
      supabase.from("assessment_component_definitions" as any).select("*, assessment_component_types(name), courses(id, code, title)").order("sort_order"),
      supabase.from("sections" as any).select("*").eq("status", "active").order("name"),
    ]);
    setCourses(coursesRes.data || []);
    setComponents((compRes.data as any[]) || []);
    setSections((secRes.data as any[]) || []);
  };

  useEffect(() => {
    if (user) fetchCoursesAndComponents();
  }, [user, role]);

  const filteredComponents = components.filter((c) => !selectedCourse || c.course_id === selectedCourse);

  useEffect(() => {
    if (!selectedCourse || !selectedComponent) {
      setEnrollments([]);
      setStudents([]);
      setExistingMarks([]);
      setComponentDef(null);
      setMarks({});
      return;
    }
    const def = components.find((c) => c.id === selectedComponent);
    setComponentDef(def);
    if (!def) return;

    const fetchStudentsAndMarks = async () => {
      setLoading(true);
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", selectedCourse)
        .eq("status", "enrolled");
      let enrs = enrollData || [];
      if (selectedSection) {
        const studentIds = enrs.map((e: any) => e.student_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id")
          .in("id", studentIds)
          .eq("section_id", selectedSection);
        const allowedIds = new Set((profs || []).map((p: any) => p.id));
        enrs = enrs.filter((e: any) => allowedIds.has(e.student_id));
      }
      setEnrollments(enrs);

      if (enrs.length === 0) {
        setStudents([]);
        setExistingMarks([]);
        setMarks({});
        setLoading(false);
        return;
      }

      const studentIds = enrs.map((e: any) => e.student_id);
      const [studentsRes, marksRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, student_id_number, section_id").in("id", studentIds),
        supabase
          .from("assessment_component_marks" as any)
          .select("*")
          .eq("component_definition_id", selectedComponent)
          .in("enrollment_id", enrs.map((e: any) => e.id)),
      ]);
      const studs = (studentsRes.data || []).sort((a: any, b: any) => (a.student_id_number || "").localeCompare(b.student_id_number || ""));
      setStudents(studs);
      const marksData = marksRes.data || [];
      setExistingMarks(marksData);

      const allSubmitted = marksData.length > 0 && marksData.every((m: any) => m.status === "submitted");
      const anySentBack = marksData.some((m: any) => m.approval_status === "sent_back");
      setCanEdit(!allSubmitted || anySentBack);

      const marksMap: Record<string, { marks: string; absent: boolean; remarks: string }> = {};
      studs.forEach((s: any) => {
        const enr = enrs.find((e: any) => e.student_id === s.id);
        if (!enr) return;
        const existing = marksData.find((m: any) => m.enrollment_id === enr.id) as any;
        marksMap[enr.id] = {
          marks: existing?.marks_obtained != null ? String(existing.marks_obtained) : "",
          absent: existing?.is_absent === true,
          remarks: existing?.remarks || "",
        };
      });
      setMarks(marksMap);

      const now = new Date();
      const deadline = def.entry_deadline ? parseISO(def.entry_deadline) : null;
      const graceHours = def.grace_period_hours || 0;
      const graceEnd = deadline && graceHours ? addHours(deadline, graceHours) : deadline;
      const hardLock = def.hard_lock_date ? parseISO(def.hard_lock_date) : null;

      if (hardLock && isAfter(now, hardLock)) setEntryStatus("closed");
      else if (deadline && isAfter(now, graceEnd || deadline)) setEntryStatus("closed");
      else if (graceEnd && isAfter(now, deadline!)) setEntryStatus("grace");
      else if (deadline && isAfter(now, deadline)) setEntryStatus("late");
      else setEntryStatus("open");

      setLoading(false);
    };
    fetchStudentsAndMarks();
  }, [selectedCourse, selectedComponent, selectedSection, components]);

  const maxMarks = componentDef?.max_marks ?? 100;

  const validateMarks = (val: string): string | null => {
    if (!val.trim()) return null;
    const n = parseFloat(val);
    if (isNaN(n)) return "Invalid number";
    if (n < 0) return "Cannot be negative";
    if (n > maxMarks) return `Max ${maxMarks}`;
    return null;
  };

  const updateMark = (enrollmentId: string, field: "marks" | "absent" | "remarks", value: string | boolean) => {
    if (!canEdit) return;
    setMarks((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value,
      },
    }));
  };

  const saveDraft = async () => {
    if (!user || !componentDef) return;
    let saved = 0;
    for (const enr of enrollments) {
      const row = marks[enr.id];
      if (!row) continue;
      const marksVal = row.absent ? null : (row.marks.trim() ? parseFloat(row.marks) : null);
      const err = marksVal != null ? validateMarks(String(marksVal)) : null;
      if (err) {
        toast({ title: "Validation error", description: err, variant: "destructive" });
        return;
      }
      const payload = {
        enrollment_id: enr.id,
        component_definition_id: componentDef.id,
        marks_obtained: marksVal,
        is_absent: row.absent,
        remarks: row.remarks || null,
        status: "draft",
        entered_by: user.id,
      };
      const existing = existingMarks.find((m: any) => m.enrollment_id === enr.id);
      if (existing) {
        await supabase.from("assessment_component_marks" as any).update(payload).eq("id", existing.id);
      } else {
        await supabase.from("assessment_component_marks" as any).insert(payload);
      }
      saved++;
    }
    toast({ title: "Draft saved", description: `${saved} records saved` });
    setExistingMarks((prev) => prev.map((m) => (m.status ? { ...m, status: "draft" } : m)));
  };

  const submitFinal = async () => {
    if (!user || !componentDef) return;
    for (const enr of enrollments) {
      const row = marks[enr.id];
      const marksVal = row?.absent ? null : (row?.marks?.trim() ? parseFloat(row.marks) : null);
      if (marksVal != null && validateMarks(String(marksVal))) {
        toast({ title: "Fix validation errors before submitting", variant: "destructive" });
        return;
      }
    }
    for (const enr of enrollments) {
      const row = marks[enr.id];
      const marksVal = row?.absent ? null : (row?.marks?.trim() ? parseFloat(row.marks) : null);
      const requiresApproval = componentDef.requires_approval !== false;
      const payload = {
        marks_obtained: marksVal,
        is_absent: row?.absent ?? false,
        remarks: row?.remarks || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
        approval_status: requiresApproval ? "pending" : "approved",
        approved_by: requiresApproval ? null : user.id,
        approved_at: requiresApproval ? null : new Date().toISOString(),
        is_approved: !requiresApproval,
        approval_comments: null,
      };
      const existing = existingMarks.find((m: any) => m.enrollment_id === enr.id);
      if (existing) {
        await supabase.from("assessment_component_marks" as any).update(payload).eq("id", existing.id);
      } else {
        await supabase.from("assessment_component_marks" as any).insert({
          enrollment_id: enr.id,
          component_definition_id: componentDef.id,
          ...payload,
          entered_by: user.id,
        });
      }
    }
    setCanEdit(false);
    toast({ title: componentDef.requires_approval !== false ? "Marks submitted — pending HOD approval" : "Marks submitted and approved" });
    setExistingMarks((prev) => prev.map((m) => ({ ...m, status: "submitted" })));
  };

  const downloadTemplate = () => {
    if (!componentDef || students.length === 0) {
      toast({ title: "Select component and load students first", variant: "destructive" });
      return;
    }
    const rows = [
      ["Student ID", "Student Name", "Enrollment ID", "Marks", "Absent (Y/N)", "Remarks"],
      ...enrollments.map((enr) => {
        const s = students.find((st: any) => st.id === enr.student_id);
        return [s?.student_id_number || "", s?.full_name || "", enr.id, "", "N", ""];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `marks_${componentDef.name.replace(/\s+/g, "_")}_template.xlsx`);
    toast({ title: "Template downloaded" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setUploadErrors(["File must have header row and at least one data row"]);
          return;
        }
        const errors: string[] = [];
        const enrollmentIdIdx = 2;
        const marksIdx = 3;
        const absentIdx = 4;
        const remarksIdx = 5;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 4) continue;
          const enrollmentId = String(row[enrollmentIdIdx] || "").trim();
          const marksVal = String(row[marksIdx] ?? "").trim();
          const absentStr = String(row[absentIdx] ?? "N").toUpperCase();

          const enr = enrollments.find((e: any) => e.id === enrollmentId);
          if (!enr) {
            errors.push(`Row ${i + 1}: Invalid enrollment ID ${enrollmentId}`);
            continue;
          }
          if (absentStr !== "Y" && absentStr !== "N") {
            errors.push(`Row ${i + 1}: Absent must be Y or N`);
            continue;
          }
          const absent = absentStr === "Y";
          if (!absent && marksVal) {
            const n = parseFloat(marksVal);
            if (isNaN(n)) errors.push(`Row ${i + 1}: Invalid marks "${marksVal}"`);
            else if (n < 0 || n > maxMarks) errors.push(`Row ${i + 1}: Marks ${n} out of range [0, ${maxMarks}]`);
          }
        }
        setUploadErrors(errors);
        if (errors.length > 0) {
          setUploadErrors(errors);
          return;
        }

        const newMarks = { ...marks };
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 4) continue;
          const enrollmentId = String(row[enrollmentIdIdx] || "").trim();
          const marksVal = String(row[marksIdx] ?? "").trim();
          const absentStr = String(row[absentIdx] ?? "N").toUpperCase();
          const remarks = String(row[remarksIdx] ?? "").trim();
          const enr = enrollments.find((e: any) => e.id === enrollmentId);
          if (!enr) continue;
          newMarks[enr.id] = {
            marks: absentStr === "Y" ? "" : marksVal,
            absent: absentStr === "Y",
            remarks,
          };
        }
        setMarks(newMarks);
        setUploadErrors([]);
        toast({ title: "Excel imported successfully" });
      } catch (err) {
        setUploadErrors([`Parse error: ${(err as Error).message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const getStudent = (studentId: string) => students.find((s: any) => s.id === studentId);

  const isLocked = !canEdit || entryStatus === "closed";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marks Entry</h1>
          <p className="text-muted-foreground">Enter component marks for registered students. Save draft or submit final.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Filters</CardTitle>
            <div className="flex flex-wrap gap-4">
              <div className="w-64">
                <label className="text-sm font-medium mb-2 block">Subject (Course) *</label>
                <Select value={selectedCourse} onValueChange={(v) => { setSelectedCourse(v); setSelectedComponent(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-64">
                <label className="text-sm font-medium mb-2 block">Component *</label>
                <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                  <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
                  <SelectContent>
                    {filteredComponents.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (Max: {c.max_marks})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-2 block">Section (optional)</label>
                <Select value={selectedSection || "__all__"} onValueChange={(v) => setSelectedSection(v === "__all__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All sections</SelectItem>
                    {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {componentDef && (
          <>
            {(entryStatus === "grace" || entryStatus === "late") && (
              <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {entryStatus === "grace"
                    ? "You are within the grace period. Late entry allowed with extended deadline."
                    : "Entry deadline has passed. Submit immediately if grace period is still active."}
                </AlertDescription>
              </Alert>
            )}
            {entryStatus === "closed" && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>Entry window is closed. Marks cannot be edited.</AlertDescription>
              </Alert>
            )}

            {componentDef.entry_deadline && (
              <p className="text-sm text-muted-foreground">
                Deadline: {format(parseISO(componentDef.entry_deadline), "PP")}
                {componentDef.grace_period_hours ? ` · Grace: ${componentDef.grace_period_hours}h` : ""}
              </p>
            )}
          </>
        )}

        {selectedCourse && selectedComponent && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Student List ({enrollments.length} registered)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={students.length === 0 || isLocked}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button variant="outline" size="sm" disabled={isLocked} asChild>
                  <label className="cursor-pointer flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Bulk Upload
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                  </label>
                </Button>
                <Button onClick={saveDraft} disabled={loading || isLocked} variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={submitFinal} disabled={loading || isLocked}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Final
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-28">Marks (max {maxMarks})</TableHead>
                    <TableHead className="w-24">Absent</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : enrollments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No registered students</TableCell></TableRow>
                  ) : (
                    enrollments.map((enr) => {
                      const s = getStudent(enr.student_id);
                      const row = marks[enr.id] || { marks: "", absent: false, remarks: "" };
                      const err = row.marks ? validateMarks(row.marks) : null;
                      return (
                        <TableRow key={enr.id}>
                          <TableCell className="font-mono text-sm">{s?.student_id_number || "—"}</TableCell>
                          <TableCell className="font-medium">{s?.full_name || "—"}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              max={maxMarks}
                              value={row.marks}
                              onChange={(e) => updateMark(enr.id, "marks", e.target.value)}
                              disabled={row.absent || isLocked}
                              className={err ? "border-destructive" : "w-24"}
                            />
                            {err && <span className="text-xs text-destructive block">{err}</span>}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={row.absent}
                              onCheckedChange={(v) => updateMark(enr.id, "absent", !!v)}
                              disabled={isLocked}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.remarks}
                              onChange={(e) => updateMark(enr.id, "remarks", e.target.value)}
                              placeholder="Optional"
                              disabled={isLocked}
                              className="max-w-xs"
                            />
                          </TableCell>
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
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Upload Validation Errors</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {uploadErrors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                {uploadErrors.length > 20 && <li>...and {uploadErrors.length - 20} more</li>}
              </ul>
              <Button variant="outline" className="mt-4" onClick={() => setUploadErrors([])}>Dismiss</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
