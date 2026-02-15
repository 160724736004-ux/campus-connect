import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Save, Copy, Users, AlertTriangle } from "lucide-react";

export function AttendanceMarking() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [attendanceTypes, setAttendanceTypes] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isTheory, setIsTheory] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [classNotConducted, setClassNotConducted] = useState(false);
  const [notConductedReason, setNotConductedReason] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const [coursesRes, periodsRes, typesRes, sectionsRes] = await Promise.all([
        role === "faculty"
          ? supabase.from("courses").select("*").eq("faculty_id", user?.id)
          : supabase.from("courses").select("*").order("code"),
        supabase.from("attendance_periods").select("*").order("period_number"),
        supabase.from("attendance_types").select("*").order("sort_order"),
        supabase.from("sections").select("*, batches(name)").eq("status", "active"),
      ]);
      setCourses(coursesRes.data || []);
      setPeriods(periodsRes.data || []);
      setAttendanceTypes(typesRes.data || []);
      setSections(sectionsRes.data || []);
    };
    if (user) fetchInitial();
  }, [user, role]);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchStudentsAndAttendance = async () => {
      setLoading(true);
      const { data: enrollData } = await supabase.from("enrollments").select("*").eq("course_id", selectedCourse).eq("status", "enrolled");
      const enrs = enrollData || [];
      if (enrs.length === 0) { setStudents([]); setLoading(false); return; }

      const studentIds = enrs.map((e: any) => e.student_id);
      let profileQuery = supabase.from("profiles").select("id, full_name, student_id_number, section_id").in("id", studentIds);
      if (selectedSection) profileQuery = profileQuery.eq("section_id", selectedSection);

      const [studentsRes, attRes] = await Promise.all([
        profileQuery,
        supabase.from("attendance_records").select("*").eq("course_id", selectedCourse).eq("date", selectedDate),
      ]);

      const studs = studentsRes.data || [];
      setStudents(studs);
      setExistingRecords(attRes.data || []);

      const defaultType = attendanceTypes.find((t) => t.code === "P");
      const attMap: Record<string, string> = {};
      studs.forEach((s: any) => {
        const existing = (attRes.data || []).find((a: any) => a.student_id === s.id);
        attMap[s.id] = existing?.attendance_type_id || existing?.status || defaultType?.id || "present";
      });
      setAttendance(attMap);
      setIsLocked((attRes.data || []).some((a: any) => a.is_locked));
      setLoading(false);
    };
    fetchStudentsAndAttendance();
  }, [selectedCourse, selectedDate, selectedSection, attendanceTypes]);

  const handleBulkMarkPresent = () => {
    const presentType = attendanceTypes.find((t) => t.code === "P");
    if (!presentType) return;
    const newAtt: Record<string, string> = {};
    students.forEach((s) => { newAtt[s.id] = presentType.id; });
    setAttendance(newAtt);
  };

  const handleCopyPrevious = async () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const { data } = await supabase.from("attendance_records")
      .select("student_id, attendance_type_id, status")
      .eq("course_id", selectedCourse).eq("date", prevDate.toISOString().split("T")[0]);
    if (data && data.length > 0) {
      const attMap: Record<string, string> = { ...attendance };
      data.forEach((r: any) => { if (attMap[r.student_id] !== undefined) attMap[r.student_id] = r.attendance_type_id || r.status; });
      setAttendance(attMap);
      toast({ title: "Copied from previous day" });
    } else {
      toast({ title: "No records found for previous day", variant: "destructive" });
    }
  };

  const saveAttendance = async () => {
    if (!user || isLocked) return;

    // Validate date - block future dates
    if (new Date(selectedDate) > new Date()) {
      toast({ title: "Cannot mark attendance for future dates", variant: "destructive" });
      return;
    }

    // Save class session
    await supabase.from("class_sessions").upsert({
      course_id: selectedCourse,
      section_id: selectedSection || null,
      date: selectedDate,
      period_id: selectedPeriod || null,
      faculty_id: user.id,
      is_conducted: !classNotConducted,
      not_conducted_reason: classNotConducted ? notConductedReason : null,
      is_theory: isTheory,
    }, { onConflict: "course_id,date" }).select();

    if (classNotConducted) {
      toast({ title: "Class marked as not conducted" });
      return;
    }

    for (const studentId of Object.keys(attendance)) {
      const existing = existingRecords.find((r: any) => r.student_id === studentId);
      const typeId = attendance[studentId];
      const typeObj = attendanceTypes.find((t) => t.id === typeId);
      const statusStr = typeObj?.code?.toLowerCase() || "present";

      const payload = {
        status: statusStr,
        attendance_type_id: typeId,
        marked_by: user.id,
        period_id: selectedPeriod || null,
        is_draft: isDraft,
        is_theory: isTheory,
      };

      if (existing) {
        await supabase.from("attendance_records").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("attendance_records").insert({
          course_id: selectedCourse,
          student_id: studentId,
          date: selectedDate,
          ...payload,
        });
      }
    }
    toast({ title: isDraft ? "Attendance saved as draft" : "Attendance submitted" });
  };

  const getTypeName = (typeId: string) => {
    const t = attendanceTypes.find((at) => at.id === typeId);
    return t ? t.code : typeId;
  };

  const getTypeColor = (typeId: string) => {
    const t = attendanceTypes.find((at) => at.id === typeId);
    return t?.color || "#6b7280";
  };

  const presentCount = Object.values(attendance).filter((v) => {
    const t = attendanceTypes.find((at) => at.id === v);
    return t?.counts_as_present;
  }).length;

  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <Label>Course</Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" max={new Date().toISOString().split("T")[0]} />
        </div>
        {sections.length > 0 && (
          <div className="space-y-2 min-w-[160px]">
            <Label>Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {periods.length > 0 && (
          <div className="space-y-2 min-w-[160px]">
            <Label>Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No period</SelectItem>
                {periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.start_time}–{p.end_time})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch checked={isTheory} onCheckedChange={setIsTheory} />
          <Label>{isTheory ? "Theory" : "Lab"}</Label>
        </div>
      </div>

      {selectedCourse && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{students.length} students</span>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{presentCount} Present</Badge>
            <Badge variant="destructive">{absentCount} Absent</Badge>
            {isLocked && <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Locked</Badge>}
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkMarkPresent} disabled={isLocked}>
              <CheckCircle className="h-4 w-4 mr-1" />Mark All Present
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyPrevious} disabled={isLocked}>
              <Copy className="h-4 w-4 mr-1" />Copy Previous
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Switch checked={classNotConducted} onCheckedChange={setClassNotConducted} />
              <Label className="text-sm">Class Not Conducted</Label>
            </div>
          </div>

          {classNotConducted ? (
            <Card>
              <CardContent className="py-6 space-y-4">
                <Label>Reason for not conducting class</Label>
                <Input value={notConductedReason} onChange={(e) => setNotConductedReason(e.target.value)} placeholder="Enter reason..." />
                <Button onClick={saveAttendance}><Save className="h-4 w-4 mr-1" />Save</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">Mark Attendance</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Switch checked={isDraft} onCheckedChange={setIsDraft} id="draft-switch" />
                    <Label htmlFor="draft-switch" className="text-sm">Draft</Label>
                  </div>
                  <Button onClick={saveAttendance} disabled={isLocked}>
                    <Save className="h-4 w-4 mr-1" />{isDraft ? "Save Draft" : "Submit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : students.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No students enrolled</TableCell></TableRow>
                    ) : students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.student_id_number || "—"}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {attendanceTypes.map((t) => (
                              <Button
                                key={t.id}
                                variant={attendance[s.id] === t.id ? "default" : "outline"}
                                size="sm"
                                disabled={isLocked}
                                onClick={() => setAttendance((prev) => ({ ...prev, [s.id]: t.id }))}
                                style={attendance[s.id] === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}
                                className="text-xs px-2"
                              >
                                {t.code}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
