import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar, Building2, Users, LayoutGrid, Shield, FileQuestion, Package, Shuffle } from "lucide-react";

const EXAM_PATTERNS = [
  { value: "mcq", label: "MCQ" },
  { value: "descriptive", label: "Descriptive" },
  { value: "mixed", label: "Mixed" },
];
const SESSIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "full", label: "Full" },
];
const EXAM_NATURES = [
  { value: "theory", label: "Theory" },
  { value: "practical", label: "Practical" },
  { value: "project", label: "Project" },
  { value: "viva", label: "Viva-voce" },
];
const INVIGILATOR_ROLES = [
  { value: "chief", label: "Chief Invigilator" },
  { value: "invigilator", label: "Invigilator" },
  { value: "assistant", label: "Assistant" },
];

export default function ExamScheduling() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [hallAllocations, setHallAllocations] = useState<any[]>([]);
  const [seatingArrangements, setSeatingArrangements] = useState<any[]>([]);
  const [externalExaminers, setExternalExaminers] = useState<any[]>([]);
  const [squadDuties, setSquadDuties] = useState<any[]>([]);
  const [examMaterials, setExamMaterials] = useState<any[]>([]);
  const [scriptBundles, setScriptBundles] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examEditId, setExamEditId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({
    academic_year_id: "", semester_id: "", exam_type_id: "", name: "",
    exam_pattern: "mixed", marks_distribution: "", question_paper_pattern: "", instructions: "",
  });

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [hallAllocDialogOpen, setHallAllocDialogOpen] = useState(false);
  const [hallAllocForm, setHallAllocForm] = useState({ exam_schedule_id: "", hall_id: "", section_id: "" });
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    exam_id: "", course_id: "", exam_date: "", start_time: "09:00", end_time: "12:00",
    duration_minutes: "180", session: "morning", applicable_year: "", applicable_semester_number: "",
    exam_nature: "theory",
  });

  const [hallDialogOpen, setHallDialogOpen] = useState(false);
  const [hallEditId, setHallEditId] = useState<string | null>(null);
  const [hallForm, setHallForm] = useState({ name: "", building: "", capacity: "60", rows_count: "", cols_count: "" });

  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invForm, setInvForm] = useState({ exam_schedule_id: "", faculty_id: "", hall_id: "", role: "invigilator" });

  const [extExamDialogOpen, setExtExamDialogOpen] = useState(false);
  const [extExamForm, setExtExamForm] = useState({ exam_schedule_id: "", name: "", designation: "", institution: "", email: "", phone: "", subject_area: "", status: "pending" });

  const [squadDutyDialogOpen, setSquadDutyDialogOpen] = useState(false);
  const [squadDutyForm, setSquadDutyForm] = useState({ squad_id: "", duty_date: "", start_time: "09:00", end_time: "17:00" });

  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ exam_schedule_id: "", material_type: "question_paper", quantity_ordered: "0", status: "pending" });

  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleForm, setBundleForm] = useState({ exam_schedule_id: "", hall_id: "", bundle_number: "", subject_code: "", total_scripts: "0", status: "collected" });

  const [seatingScheduleId, setSeatingScheduleId] = useState<string | null>(null);
  const [seatingDialogOpen, setSeatingDialogOpen] = useState(false);
  const [squadDialogOpen, setSquadDialogOpen] = useState(false);
  const [squadForm, setSquadForm] = useState({ exam_id: "", name: "" });

  const [suppWindows, setSuppWindows] = useState<any[]>([]);
  const [suppWindowDialogOpen, setSuppWindowDialogOpen] = useState(false);
  const [suppWindowEditId, setSuppWindowEditId] = useState<string | null>(null);
  const [suppWindowForm, setSuppWindowForm] = useState({ exam_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0", internal_marks_handling: "retain_old" });

  const canManage = role === "admin" || role === "hod";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, schedRes, hallsRes, invRes, squadsRes, hallAllocRes, seatingRes, extRes, squadDutyRes, materialsRes, bundlesRes, yearsRes, semRes, typesRes, coursesRes, secRes, rolesRes, suppRes] = await Promise.all([
        supabase.from("exams" as any).select("*, academic_years(name), semesters(name), exam_types(name, code)").order("created_at", { ascending: false }),
        supabase.from("exam_schedules" as any).select("*, exams(name, exam_types(name)), courses(code, title)").order("exam_date"),
        supabase.from("exam_halls" as any).select("*").order("name"),
        supabase.from("exam_invigilators" as any).select("*, exam_schedules(exam_date, start_time, courses(code)), profiles(full_name), exam_halls(name)"),
        supabase.from("exam_squads" as any).select("*, exams(name)"),
        supabase.from("exam_hall_allocations" as any).select("*, exam_schedules(exam_date, courses(code)), exam_halls(name), sections(name)").order("created_at", { ascending: false }),
        supabase.from("exam_seating_arrangements" as any).select("*, exam_hall_allocations(exam_schedule_id, exam_schedules(courses(code)))").order("seat_number"),
        supabase.from("exam_external_examiners" as any).select("*, exam_schedules(exam_date, courses(code))").order("created_at", { ascending: false }),
        supabase.from("exam_squad_duties" as any).select("*, exam_squads(name)").order("duty_date"),
        supabase.from("exam_materials" as any).select("*, exam_schedules(exam_date, courses(code)), exam_halls(name)").order("created_at", { ascending: false }),
        supabase.from("exam_script_bundles" as any).select("*, exam_schedules(exam_date, courses(code)), exam_halls(name)").order("created_at", { ascending: false }),
        supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
        supabase.from("semesters" as any).select("*").order("start_date"),
        supabase.from("exam_types" as any).select("*").order("sort_order"),
        supabase.from("courses").select("*").order("code"),
        supabase.from("sections" as any).select("*").order("name"),
        supabase.from("user_roles").select("user_id").in("role", ["faculty", "hod"]),
        supabase.from("supplementary_registration_windows" as any).select("*, exams(name)").order("start_date", { ascending: false }),
      ]);
      const facultyIds = (rolesRes.data || []).map((r: any) => r.user_id);
      let facultyProfiles: any[] = [];
      if (facultyIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name").in("id", facultyIds);
        facultyProfiles = data || [];
      }
      setExams((examsRes.data as any[]) || []);
      setSchedules((schedRes.data as any[]) || []);
      setHalls((hallsRes.data as any[]) || []);
      setInvigilators((invRes.data as any[]) || []);
      setSquads((squadsRes.data as any[]) || []);
      setHallAllocations((hallAllocRes.data as any[]) || []);
      setSeatingArrangements((seatingRes.data as any[]) || []);
      setExternalExaminers((extRes.data as any[]) || []);
      setSquadDuties((squadDutyRes.data as any[]) || []);
      setExamMaterials((materialsRes.data as any[]) || []);
      setScriptBundles((bundlesRes.data as any[]) || []);
      setAcademicYears((yearsRes.data as any[]) || []);
      setSemesters((semRes.data as any[]) || []);
      setExamTypes((typesRes.data as any[]) || []);
      setCourses(coursesRes.data || []);
      setSections((secRes.data as any[]) || []);
      setFacultyList(facultyProfiles);
      setSuppWindows((suppRes.data as any[]) || []);
    } catch (_) {
      setExams([]);
      setSchedules([]);
      setHalls([]);
      setExamTypes([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreateExam = () => {
    setExamEditId(null);
    setExamForm({ academic_year_id: "", semester_id: "", exam_type_id: "", name: "", exam_pattern: "mixed", marks_distribution: "", question_paper_pattern: "", instructions: "" });
    setExamDialogOpen(true);
  };
  const openEditExam = (e: any) => {
    setExamEditId(e.id);
    setExamForm({
      academic_year_id: e.academic_year_id || "", semester_id: e.semester_id || "",
      exam_type_id: e.exam_type_id, name: e.name, exam_pattern: e.exam_pattern || "mixed",
      marks_distribution: typeof e.marks_distribution === "string" ? e.marks_distribution : JSON.stringify(e.marks_distribution || {}, null, 2),
      question_paper_pattern: e.question_paper_pattern || "", instructions: e.instructions || "",
    });
    setExamDialogOpen(true);
  };

  const handleSaveExam = async () => {
    if (!examForm.academic_year_id || !examForm.exam_type_id || !examForm.name.trim()) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    let marksDist = null;
    if (examForm.marks_distribution?.trim()) {
      try { marksDist = JSON.parse(examForm.marks_distribution); } catch { marksDist = { raw: examForm.marks_distribution }; }
    }
    const payload = {
      academic_year_id: examForm.academic_year_id,
      semester_id: examForm.semester_id || null,
      exam_type_id: examForm.exam_type_id,
      name: examForm.name.trim(),
      exam_pattern: examForm.exam_pattern,
      marks_distribution: marksDist,
      question_paper_pattern: examForm.question_paper_pattern || null,
      instructions: examForm.instructions || null,
    };
    if (examEditId) {
      const { error } = await supabase.from("exams" as any).update(payload).eq("id", examEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Exam updated" });
    } else {
      const { error } = await supabase.from("exams" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Exam created" });
    }
    setExamDialogOpen(false);
    fetchData();
  };

  const openCreateSchedule = (examId?: string) => {
    setScheduleEditId(null);
    setScheduleForm({
      exam_id: examId || "", course_id: "", exam_date: "", start_time: "09:00", end_time: "12:00",
      duration_minutes: "180", session: "morning", applicable_year: "", applicable_semester_number: "",
      exam_nature: "theory",
    });
    setScheduleDialogOpen(true);
  };
  const openEditSchedule = (s: any) => {
    setScheduleEditId(s.id);
    setScheduleForm({
      exam_id: s.exam_id, course_id: s.course_id, exam_date: s.exam_date || "", start_time: s.start_time?.slice(0, 5) || "09:00", end_time: s.end_time?.slice(0, 5) || "12:00",
      duration_minutes: String(s.duration_minutes || 180), session: s.session || "morning",
      applicable_year: s.applicable_year ? String(s.applicable_year) : "", applicable_semester_number: s.applicable_semester_number ? String(s.applicable_semester_number) : "",
      exam_nature: s.exam_nature || "theory",
    });
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.exam_id || !scheduleForm.course_id || !scheduleForm.exam_date || !scheduleForm.start_time || !scheduleForm.end_time) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    const payload = {
      exam_id: scheduleForm.exam_id,
      course_id: scheduleForm.course_id,
      exam_date: scheduleForm.exam_date,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
      duration_minutes: parseInt(scheduleForm.duration_minutes) || 180,
      session: scheduleForm.session,
      exam_nature: scheduleForm.exam_nature || "theory",
      applicable_year: scheduleForm.applicable_year ? parseInt(scheduleForm.applicable_year) : null,
      applicable_semester_number: scheduleForm.applicable_semester_number ? parseInt(scheduleForm.applicable_semester_number) : null,
    };
    if (scheduleEditId) {
      const { error } = await supabase.from("exam_schedules" as any).update(payload).eq("id", scheduleEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Schedule updated" });
    } else {
      const { error } = await supabase.from("exam_schedules" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Schedule added" });
    }
    setScheduleDialogOpen(false);
    fetchData();
  };

  const openCreateHall = () => {
    setHallEditId(null);
    setHallForm({ name: "", building: "", capacity: "60", rows_count: "", cols_count: "" });
    setHallDialogOpen(true);
  };
  const openEditHall = (h: any) => {
    setHallEditId(h.id);
    setHallForm({ name: h.name, building: h.building || "", capacity: String(h.capacity || 60), rows_count: h.rows_count ? String(h.rows_count) : "", cols_count: h.cols_count ? String(h.cols_count) : "" });
    setHallDialogOpen(true);
  };

  const handleSaveHall = async () => {
    if (!hallForm.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = {
      name: hallForm.name.trim(),
      building: hallForm.building || null,
      capacity: parseInt(hallForm.capacity) || 60,
      rows_count: hallForm.rows_count ? parseInt(hallForm.rows_count) : null,
      cols_count: hallForm.cols_count ? parseInt(hallForm.cols_count) : null,
    };
    if (hallEditId) {
      const { error } = await supabase.from("exam_halls" as any).update(payload).eq("id", hallEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Hall updated" });
    } else {
      const { error } = await supabase.from("exam_halls" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Hall created" });
    }
    setHallDialogOpen(false);
    fetchData();
  };

  const openAddInvigilator = (scheduleId?: string) => {
    setInvForm({ exam_schedule_id: scheduleId || "", faculty_id: "", hall_id: "", role: "invigilator" });
    setInvDialogOpen(true);
  };

  const handleSaveInvigilator = async () => {
    if (!invForm.exam_schedule_id || !invForm.faculty_id) {
      toast({ title: "Schedule and faculty required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("exam_invigilators" as any).insert({
      exam_schedule_id: invForm.exam_schedule_id,
      faculty_id: invForm.faculty_id,
      hall_id: invForm.hall_id || null,
      role: invForm.role,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invigilator assigned" });
    setInvDialogOpen(false);
    fetchData();
  };

  const updateExam = (k: string, v: string) => setExamForm(prev => ({ ...prev, [k]: v }));
  const updateSchedule = (k: string, v: string) => setScheduleForm(prev => ({ ...prev, [k]: v }));
  const updateHall = (k: string, v: string) => setHallForm(prev => ({ ...prev, [k]: v }));
  const updateInv = (k: string, v: string) => setInvForm(prev => ({ ...prev, [k]: v }));
  const updateHallAlloc = (k: string, v: string) => setHallAllocForm(prev => ({ ...prev, [k]: v }));
  const updateExtExam = (k: string, v: string) => setExtExamForm(prev => ({ ...prev, [k]: v }));
  const updateSquadDuty = (k: string, v: string) => setSquadDutyForm(prev => ({ ...prev, [k]: v }));
  const updateMaterial = (k: string, v: string) => setMaterialForm(prev => ({ ...prev, [k]: v }));
  const updateBundle = (k: string, v: string) => setBundleForm(prev => ({ ...prev, [k]: v }));

  const handleSaveHallAlloc = async () => {
    if (!hallAllocForm.exam_schedule_id || !hallAllocForm.hall_id) { toast({ title: "Schedule and hall required", variant: "destructive" }); return; }
    const { error } = await supabase.from("exam_hall_allocations" as any).insert({ exam_schedule_id: hallAllocForm.exam_schedule_id, hall_id: hallAllocForm.hall_id, section_id: hallAllocForm.section_id || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hall allocated" }); setHallAllocDialogOpen(false); fetchData();
  };
  const handleSaveExtExam = async () => {
    if (!extExamForm.exam_schedule_id || !extExamForm.name.trim()) { toast({ title: "Schedule and name required", variant: "destructive" }); return; }
    const payload = { exam_schedule_id: extExamForm.exam_schedule_id, name: extExamForm.name.trim(), designation: extExamForm.designation || null, institution: extExamForm.institution || null, email: extExamForm.email || null, phone: extExamForm.phone || null, subject_area: extExamForm.subject_area || null, status: extExamForm.status };
    const { error } = await supabase.from("exam_external_examiners" as any).insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "External examiner added" }); setExtExamDialogOpen(false); fetchData();
  };
  const handleSaveSquadDuty = async () => {
    if (!squadDutyForm.squad_id || !squadDutyForm.duty_date) { toast({ title: "Squad and date required", variant: "destructive" }); return; }
    const payload = { squad_id: squadDutyForm.squad_id, duty_date: squadDutyForm.duty_date, start_time: squadDutyForm.start_time || null, end_time: squadDutyForm.end_time || null };
    const { error } = await supabase.from("exam_squad_duties" as any).insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Squad duty added" }); setSquadDutyDialogOpen(false); fetchData();
  };
  const handleSaveMaterial = async () => {
    if (!materialForm.exam_schedule_id) { toast({ title: "Schedule required", variant: "destructive" }); return; }
    const payload = { exam_schedule_id: materialForm.exam_schedule_id, material_type: materialForm.material_type, quantity_ordered: parseInt(materialForm.quantity_ordered) || 0, status: materialForm.status };
    const { error } = await supabase.from("exam_materials" as any).insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Material added" }); setMaterialDialogOpen(false); fetchData();
  };
  const handleSaveBundle = async () => {
    if (!bundleForm.exam_schedule_id) { toast({ title: "Schedule required", variant: "destructive" }); return; }
    const payload = { exam_schedule_id: bundleForm.exam_schedule_id, hall_id: bundleForm.hall_id || null, bundle_number: bundleForm.bundle_number ? parseInt(bundleForm.bundle_number) : null, subject_code: bundleForm.subject_code || null, total_scripts: parseInt(bundleForm.total_scripts) || 0, status: bundleForm.status };
    const { error } = await supabase.from("exam_script_bundles" as any).insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bundle added" }); setBundleDialogOpen(false); fetchData();
  };

  const generateSeatingPlan = async (scheduleId: string, mixSections: boolean) => {
    const sched = schedules.find((s) => s.id === scheduleId);
    if (!sched) { toast({ title: "Schedule not found", variant: "destructive" }); return; }
    const allocs = hallAllocations.filter((a: any) => a.exam_schedule_id === scheduleId);
    if (allocs.length === 0) { toast({ title: "Allocate halls first", variant: "destructive" }); return; }
    const { data: enrs } = await supabase.from("enrollments").select("student_id").eq("course_id", sched.course_id).eq("status", "enrolled");
    const students = (enrs || []).map((e: any) => e.student_id);
    if (students.length === 0) { toast({ title: "No enrolled students", variant: "destructive" }); return; }
    const mixed = mixSections ? [...students].sort(() => Math.random() - 0.5) : students;
    let seatIdx = 0;
    for (const alloc of allocs) {
      const hall = halls.find((h) => h.id === alloc.hall_id);
      const cap = hall?.capacity || 60;
      const rows = hall?.rows_count || 6;
      const cols = hall?.cols_count || 10;
      const batch = mixed.slice(seatIdx, seatIdx + cap);
      seatIdx += batch.length;
      for (let i = 0; i < batch.length; i++) {
        const row = Math.floor(i / cols) + 1;
        const col = (i % cols) + 1;
        await supabase.from("exam_seating_arrangements" as any).upsert({ hall_allocation_id: alloc.id, student_id: batch[i], row_num: row, col_num: col, seat_number: `${row}-${col}`, mixing_strategy: mixSections ? "random_mix" : null }, { onConflict: "hall_allocation_id,student_id" });
      }
    }
    toast({ title: "Seating plan generated", description: mixSections ? "Students mixed for anti-copying" : "Sequential seating" });
    setSeatingDialogOpen(false);
    fetchData();
  };

  const handleSaveSquad = async () => {
    if (!squadForm.exam_id || !squadForm.name.trim()) { toast({ title: "Exam and name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("exam_squads" as any).insert({ exam_id: squadForm.exam_id, name: squadForm.name.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Squad created" }); setSquadDialogOpen(false); fetchData();
  };

  const handleSaveSuppWindow = async () => {
    if (!suppWindowForm.exam_id || !suppWindowForm.name.trim() || !suppWindowForm.start_date || !suppWindowForm.end_date) {
      toast({ title: "Required fields missing", variant: "destructive" }); return;
    }
    const payload = {
      exam_id: suppWindowForm.exam_id,
      name: suppWindowForm.name.trim(),
      start_date: suppWindowForm.start_date,
      end_date: suppWindowForm.end_date,
      fee_per_subject: parseFloat(suppWindowForm.fee_per_subject) || 0,
      internal_marks_handling: suppWindowForm.internal_marks_handling,
      is_active: true,
    };
    if (suppWindowEditId) {
      const { error } = await supabase.from("supplementary_registration_windows" as any).update(payload).eq("id", suppWindowEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Window updated" });
    } else {
      const { error } = await supabase.from("supplementary_registration_windows" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Window created" });
    }
    setSuppWindowDialogOpen(false); setSuppWindowEditId(null); fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Scheduling</h1>
            <p className="text-muted-foreground">Create exams, schedules, hall allocation, invigilators, and squads</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button onClick={openCreateExam}><Plus className="h-4 w-4 mr-2" />New Exam</Button>
              <Button variant="outline" onClick={() => openCreateSchedule()}><Calendar className="h-4 w-4 mr-2" />Add Schedule</Button>
              <Button variant="outline" onClick={openCreateHall}><Building2 className="h-4 w-4 mr-2" />Add Hall</Button>
              <Button variant="outline" onClick={() => openAddInvigilator()}><Users className="h-4 w-4 mr-2" />Assign Invigilator</Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="exams">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="schedules">Subject-wise Schedule</TabsTrigger>
            <TabsTrigger value="halls">Halls</TabsTrigger>
            <TabsTrigger value="hallAlloc">Hall Allocation</TabsTrigger>
            <TabsTrigger value="seating">Seating Plan</TabsTrigger>
            <TabsTrigger value="invigilators">Invigilator Roster</TabsTrigger>
            <TabsTrigger value="squads">Squad Roster</TabsTrigger>
            <TabsTrigger value="external">External Examiners</TabsTrigger>
            <TabsTrigger value="materials">Exam Materials</TabsTrigger>
            <TabsTrigger value="scripts">Script Bundling</TabsTrigger>
            {canManage && <TabsTrigger value="supplementary">Supplementary</TabsTrigger>}
          </TabsList>

          <TabsContent value="exams" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Pattern</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : exams.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No exams yet</TableCell></TableRow>
                    ) : (
                      exams.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell><Badge variant="outline">{e.exam_types?.name || e.exam_type_id}</Badge></TableCell>
                          <TableCell>{e.academic_years?.name || "—"}</TableCell>
                          <TableCell><Badge>{e.exam_pattern || "—"}</Badge></TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditExam(e)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => openCreateSchedule(e.id)}>Add Schedule</Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Type</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No schedules yet</TableCell></TableRow>
                    ) : (
                      schedules.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.exams?.name || "—"}</TableCell>
                          <TableCell className="font-mono">{s.courses?.code || "—"} {s.courses?.title || ""}</TableCell>
                          <TableCell>{s.exam_date}</TableCell>
                          <TableCell>{s.start_time} - {s.end_time}</TableCell>
                          <TableCell>{s.duration_minutes} min</TableCell>
                          <TableCell><Badge variant="outline">{s.session || "—"}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{s.exam_nature || "theory"}</Badge></TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                <Button variant="ghost" size="icon" onClick={() => openEditSchedule(s)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => openAddInvigilator(s.id)}>Invigilator</Button>
                                <Button variant="ghost" size="sm" onClick={() => { setHallAllocForm({ exam_schedule_id: s.id, hall_id: "", section_id: "" }); setHallAllocDialogOpen(true); }}>Allocate Hall</Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSeatingScheduleId(s.id); setSeatingDialogOpen(true); }}><LayoutGrid className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="halls" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Rows × Cols</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {halls.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No halls yet</TableCell></TableRow>
                    ) : (
                      halls.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.name}</TableCell>
                          <TableCell>{h.building || "—"}</TableCell>
                          <TableCell>{h.capacity}</TableCell>
                          <TableCell>{h.rows_count && h.cols_count ? `${h.rows_count} × ${h.cols_count}` : "—"}</TableCell>
                          {canManage && (
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => openEditHall(h)}><Edit className="h-4 w-4" /></Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hallAlloc" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Hall Allocation</CardTitle><p className="text-sm text-muted-foreground">Assign halls to exam schedules</p></div>
                {canManage && <Button size="sm" onClick={() => { setHallAllocForm({ exam_schedule_id: "", hall_id: "", section_id: "" }); setHallAllocDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Allocate</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Schedule</TableHead><TableHead>Hall</TableHead><TableHead>Section</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {hallAllocations.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No allocations</TableCell></TableRow> : (
                      hallAllocations.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.exam_schedules?.courses?.code} — {a.exam_schedules?.exam_date}</TableCell>
                          <TableCell>{a.exam_halls?.name || "—"}</TableCell>
                          <TableCell>{a.sections?.name || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seating" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Seating Plan</CardTitle><p className="text-sm text-muted-foreground">View seating arrangements. Generate from Hall Allocation tab.</p></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Schedule / Hall</TableHead><TableHead>Student</TableHead><TableHead>Seat</TableHead><TableHead>Row × Col</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {seatingArrangements.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No seating arrangements</TableCell></TableRow> : (
                      seatingArrangements.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{s.exam_hall_allocations?.exam_schedules?.courses?.code || "—"}</TableCell>
                          <TableCell className="text-sm">{s.student_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{s.seat_number || "—"}</TableCell>
                          <TableCell>{s.row_num != null && s.col_num != null ? `${s.row_num}×${s.col_num}` : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invigilators" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Hall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invigilators.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No invigilators assigned</TableCell></TableRow>
                    ) : (
                      invigilators.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.profiles?.full_name || "—"}</TableCell>
                          <TableCell>{i.exam_schedules?.exam_date} {i.exam_schedules?.courses?.code}</TableCell>
                          <TableCell><Badge>{i.role || "invigilator"}</Badge></TableCell>
                          <TableCell>{i.exam_halls?.name || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="squads" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Squad Duty Roster</CardTitle><p className="text-sm text-muted-foreground">Flying squad duty assignments</p></div>
                {canManage && <div className="flex gap-2"><Button size="sm" onClick={() => { setSquadForm({ exam_id: exams[0]?.id || "", name: "" }); setSquadDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Squad</Button><Button size="sm" variant="outline" onClick={() => { setSquadDutyForm({ squad_id: "", duty_date: "", start_time: "09:00", end_time: "17:00" }); setSquadDutyDialogOpen(true); }}>Add Duty</Button></div>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Squad</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {squadDuties.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No squad duties</TableCell></TableRow> : (
                      squadDuties.map((d) => (
                        <TableRow key={d.id}><TableCell>{d.exam_squads?.name || "—"}</TableCell><TableCell>{d.duty_date}</TableCell><TableCell>{d.start_time}–{d.end_time}</TableCell></TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Squads</CardTitle><p className="text-sm text-muted-foreground">Flying squad members</p></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Squad</TableHead><TableHead>Exam</TableHead><TableHead>Members</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {squads.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No squads</TableCell></TableRow> : (
                      squads.map((sq) => (
                        <TableRow key={sq.id}><TableCell>{sq.name}</TableCell><TableCell>{sq.exams?.name || "—"}</TableCell><TableCell>{sq.member_ids?.length || 0} members</TableCell></TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="external" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>External Examiners</CardTitle><p className="text-sm text-muted-foreground">Appointed external examiners for viva/project</p></div>
                {canManage && <Button size="sm" onClick={() => { setExtExamForm({ exam_schedule_id: "", name: "", designation: "", institution: "", email: "", phone: "", subject_area: "", status: "pending" }); setExtExamDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Examiner</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Schedule</TableHead><TableHead>Institution</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {externalExaminers.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No external examiners</TableCell></TableRow> : (
                      externalExaminers.map((e) => (
                        <TableRow key={e.id}><TableCell className="font-medium">{e.name}</TableCell><TableCell>{e.exam_schedules?.courses?.code} {e.exam_schedules?.exam_date}</TableCell><TableCell>{e.institution || "—"}</TableCell><TableCell><Badge variant={e.status === "confirmed" ? "default" : "secondary"}>{e.status}</Badge></TableCell></TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Exam Materials</CardTitle><p className="text-sm text-muted-foreground">Question papers, answer sheets, distribution tracking</p></div>
                {canManage && <Button size="sm" onClick={() => { setMaterialForm({ exam_schedule_id: "", material_type: "question_paper", quantity_ordered: "0", status: "pending" }); setMaterialDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Material</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Schedule</TableHead><TableHead>Type</TableHead><TableHead>Ordered</TableHead><TableHead>Distributed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {examMaterials.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No materials</TableCell></TableRow> : (
                      examMaterials.map((m) => (
                        <TableRow key={m.id}><TableCell>{m.exam_schedules?.courses?.code} {m.exam_schedules?.exam_date}</TableCell><TableCell><Badge variant="outline">{m.material_type}</Badge></TableCell><TableCell>{m.quantity_ordered}</TableCell><TableCell>{m.quantity_distributed}</TableCell><TableCell><Badge>{m.status}</Badge></TableCell></TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplementary" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Supplementary Exam Registration Windows</CardTitle>
                    <CardDescription>Create registration windows for backlog students. Use a Supplementary exam type when creating exams.</CardDescription>
                  </div>
                  {canManage && (
                    <Button onClick={() => { setSuppWindowEditId(null); setSuppWindowForm({ exam_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0", internal_marks_handling: "retain_old" }); setSuppWindowDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add Window
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Fee/Subject</TableHead>
                      <TableHead>Internal Marks</TableHead>
                      <TableHead>Active</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppWindows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No registration windows yet</TableCell></TableRow>
                    ) : (
                      suppWindows.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell>{w.exams?.name || "—"}</TableCell>
                          <TableCell>{w.start_date}</TableCell>
                          <TableCell>{w.end_date}</TableCell>
                          <TableCell>${parseFloat(w.fee_per_subject || 0).toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline">{w.internal_marks_handling === "retain_old" ? "Retain old" : "Re-evaluate"}</Badge></TableCell>
                          <TableCell><Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          {canManage && (
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => { setSuppWindowEditId(w.id); setSuppWindowForm({ exam_id: w.exam_id, name: w.name, start_date: w.start_date, end_date: w.end_date, fee_per_subject: String(w.fee_per_subject || 0), internal_marks_handling: w.internal_marks_handling || "retain_old" }); setSuppWindowDialogOpen(true); }}>Edit</Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="scripts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Script Bundling</CardTitle><p className="text-sm text-muted-foreground">Answer script collection and bundling by subject</p></div>
                {canManage && <Button size="sm" onClick={() => { setBundleForm({ exam_schedule_id: "", hall_id: "", bundle_number: "", subject_code: "", total_scripts: "0", status: "collected" }); setBundleDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Bundle</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Schedule</TableHead><TableHead>Hall</TableHead><TableHead>Bundle #</TableHead><TableHead>Subject</TableHead><TableHead>Scripts</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scriptBundles.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No script bundles</TableCell></TableRow> : (
                      scriptBundles.map((b) => (
                        <TableRow key={b.id}><TableCell>{b.exam_schedules?.courses?.code} {b.exam_schedules?.exam_date}</TableCell><TableCell>{b.exam_halls?.name || "—"}</TableCell><TableCell>{b.bundle_number}</TableCell><TableCell>{b.subject_code || "—"}</TableCell><TableCell>{b.total_scripts}</TableCell><TableCell><Badge>{b.status}</Badge></TableCell></TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Exam Dialog */}
        <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{examEditId ? "Edit" : "Create"} Exam</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Academic Year *</Label>
                  <Select value={examForm.academic_year_id} onValueChange={(v) => updateExam("academic_year_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Semester</Label>
                  <Select value={examForm.semester_id} onValueChange={(v) => updateExam("semester_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent><SelectItem value="">—</SelectItem>
                      {semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Exam Type *</Label>
                  <Select value={examForm.exam_type_id} onValueChange={(v) => updateExam("exam_type_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Mid-I, Mid-II, etc." /></SelectTrigger>
                    <SelectContent>{examTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Name *</Label>
                  <Input value={examForm.name} onChange={(e) => updateExam("name", e.target.value)} placeholder="e.g. Mid-I 2026" />
                </div>
              </div>
              <div>
                <Label>Exam Pattern</Label>
                <Select value={examForm.exam_pattern} onValueChange={(v) => updateExam("exam_pattern", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAM_PATTERNS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Marks Distribution (JSON)</Label>
                <Textarea value={examForm.marks_distribution} onChange={(e) => updateExam("marks_distribution", e.target.value)} rows={3} placeholder='{"section_a": 20, "section_b": 30}' /></div>
              <div><Label>Question Paper Pattern</Label>
                <Input value={examForm.question_paper_pattern} onChange={(e) => updateExam("question_paper_pattern", e.target.value)} placeholder="e.g. Part A (MCQ), Part B (Descriptive)" /></div>
              <div><Label>Instructions</Label>
                <Textarea value={examForm.instructions} onChange={(e) => updateExam("instructions", e.target.value)} rows={2} placeholder="Exam instructions..." /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveExam}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{scheduleEditId ? "Edit" : "Add"} Schedule</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Exam *</Label>
                  <Select value={scheduleForm.exam_id} onValueChange={(v) => updateSchedule("exam_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                    <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Course *</Label>
                  <Select value={scheduleForm.course_id} onValueChange={(v) => updateSchedule("course_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Exam Date *</Label><Input type="date" value={scheduleForm.exam_date} onChange={(e) => updateSchedule("exam_date", e.target.value)} /></div>
                <div><Label>Exam Type</Label>
                  <Select value={scheduleForm.exam_nature} onValueChange={(v) => updateSchedule("exam_nature", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXAM_NATURES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Session</Label>
                  <Select value={scheduleForm.session} onValueChange={(v) => updateSchedule("session", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SESSIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Time</Label><Input type="time" value={scheduleForm.start_time} onChange={(e) => updateSchedule("start_time", e.target.value)} /></div>
                <div><Label>End Time</Label><Input type="time" value={scheduleForm.end_time} onChange={(e) => updateSchedule("end_time", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Duration (min)</Label><Input type="number" value={scheduleForm.duration_minutes} onChange={(e) => updateSchedule("duration_minutes", e.target.value)} /></div>
                <div><Label>Applies to Year</Label><Input type="number" value={scheduleForm.applicable_year} onChange={(e) => updateSchedule("applicable_year", e.target.value)} placeholder="e.g. 2" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSchedule}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hall Dialog */}
        <Dialog open={hallDialogOpen} onOpenChange={setHallDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{hallEditId ? "Edit" : "Add"} Hall</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Name *</Label><Input value={hallForm.name} onChange={(e) => updateHall("name", e.target.value)} placeholder="e.g. Hall A" /></div>
              <div><Label>Building</Label><Input value={hallForm.building} onChange={(e) => updateHall("building", e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Capacity</Label><Input type="number" value={hallForm.capacity} onChange={(e) => updateHall("capacity", e.target.value)} /></div>
                <div><Label>Rows</Label><Input type="number" value={hallForm.rows_count} onChange={(e) => updateHall("rows_count", e.target.value)} /></div>
                <div><Label>Cols</Label><Input type="number" value={hallForm.cols_count} onChange={(e) => updateHall("cols_count", e.target.value)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setHallDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveHall}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invigilator Dialog */}
        <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Invigilator</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Schedule *</Label>
                <Select value={invForm.exam_schedule_id} onValueChange={(v) => updateInv("exam_schedule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.exams?.name} — {s.courses?.code} — {s.exam_date} {s.start_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Faculty *</Label>
                <Select value={invForm.faculty_id} onValueChange={(v) => updateInv("faculty_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>{facultyList.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Hall</Label>
                  <Select value={invForm.hall_id} onValueChange={(v) => updateInv("hall_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent><SelectItem value="">—</SelectItem>
                      {halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Role</Label>
                  <Select value={invForm.role} onValueChange={(v) => updateInv("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INVIGILATOR_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveInvigilator}>Assign</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hall Allocation Dialog */}
        <Dialog open={hallAllocDialogOpen} onOpenChange={setHallAllocDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Allocate Hall</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Schedule *</Label>
                <Select value={hallAllocForm.exam_schedule_id} onValueChange={(v) => updateHallAlloc("exam_schedule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.courses?.code} — {s.exam_date} {s.start_time}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Hall *</Label>
                <Select value={hallAllocForm.hall_id} onValueChange={(v) => updateHallAlloc("hall_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name} (cap: {h.capacity})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Section (optional)</Label>
                <Select value={hallAllocForm.section_id} onValueChange={(v) => updateHallAlloc("section_id", v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="">—</SelectItem>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setHallAllocDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveHallAlloc}>Save</Button></div>
          </DialogContent>
        </Dialog>

        {/* Seating Plan Generation Dialog */}
        <Dialog open={seatingDialogOpen} onOpenChange={setSeatingDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Seating Plan</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Ensure halls are allocated for this schedule. Student mixing randomizes seating for anti-copying.</p>
            <div className="flex gap-4 pt-4">
              <Button onClick={() => seatingScheduleId && generateSeatingPlan(seatingScheduleId, false)} variant="outline">Sequential</Button>
              <Button onClick={() => seatingScheduleId && generateSeatingPlan(seatingScheduleId, true)}><Shuffle className="h-4 w-4 mr-2" />With Student Mixing</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* External Examiner Dialog */}
        <Dialog open={extExamDialogOpen} onOpenChange={setExtExamDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add External Examiner</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Schedule *</Label>
                <Select value={extExamForm.exam_schedule_id} onValueChange={(v) => updateExtExam("exam_schedule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.courses?.code} {s.exam_date} ({s.exam_nature || "theory"})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={extExamForm.name} onChange={(e) => updateExtExam("name", e.target.value)} placeholder="Dr. ..." /></div>
                <div><Label>Designation</Label><Input value={extExamForm.designation} onChange={(e) => updateExtExam("designation", e.target.value)} /></div>
              </div>
              <div><Label>Institution</Label><Input value={extExamForm.institution} onChange={(e) => updateExtExam("institution", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={extExamForm.email} onChange={(e) => updateExtExam("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={extExamForm.phone} onChange={(e) => updateExtExam("phone", e.target.value)} /></div>
              </div>
              <div><Label>Subject Area</Label><Input value={extExamForm.subject_area} onChange={(e) => updateExtExam("subject_area", e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setExtExamDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveExtExam}>Save</Button></div>
          </DialogContent>
        </Dialog>

        {/* Squad Duty Dialog */}
        <Dialog open={squadDutyDialogOpen} onOpenChange={setSquadDutyDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Squad Duty</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Squad *</Label>
                <Select value={squadDutyForm.squad_id} onValueChange={(v) => updateSquadDuty("squad_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{squads.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date *</Label><Input type="date" value={squadDutyForm.duty_date} onChange={(e) => updateSquadDuty("duty_date", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start</Label><Input type="time" value={squadDutyForm.start_time} onChange={(e) => updateSquadDuty("start_time", e.target.value)} /></div>
                <div><Label>End</Label><Input type="time" value={squadDutyForm.end_time} onChange={(e) => updateSquadDuty("end_time", e.target.value)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSquadDutyDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveSquadDuty}>Save</Button></div>
          </DialogContent>
        </Dialog>

        {/* Exam Material Dialog */}
        <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Exam Material</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Schedule *</Label>
                <Select value={materialForm.exam_schedule_id} onValueChange={(v) => updateMaterial("exam_schedule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.courses?.code} {s.exam_date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label>
                  <Select value={materialForm.material_type} onValueChange={(v) => updateMaterial("material_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question_paper">Question Paper</SelectItem>
                      <SelectItem value="answer_sheet">Answer Sheet</SelectItem>
                      <SelectItem value="supplementary">Supplementary</SelectItem>
                      <SelectItem value="instructions">Instructions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity Ordered</Label><Input type="number" value={materialForm.quantity_ordered} onChange={(e) => updateMaterial("quantity_ordered", e.target.value)} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={materialForm.status} onValueChange={(v) => updateMaterial("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="printed">Printed</SelectItem><SelectItem value="distributed">Distributed</SelectItem><SelectItem value="collected">Collected</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveMaterial}>Save</Button></div>
          </DialogContent>
        </Dialog>

        {/* Script Bundle Dialog */}
        <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Script Bundle</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Schedule *</Label>
                <Select value={bundleForm.exam_schedule_id} onValueChange={(v) => updateBundle("exam_schedule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.courses?.code} {s.exam_date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Hall</Label>
                <Select value={bundleForm.hall_id} onValueChange={(v) => updateBundle("hall_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent><SelectItem value="">—</SelectItem>{halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Bundle #</Label><Input type="number" value={bundleForm.bundle_number} onChange={(e) => updateBundle("bundle_number", e.target.value)} /></div>
                <div><Label>Subject Code</Label><Input value={bundleForm.subject_code} onChange={(e) => updateBundle("subject_code", e.target.value)} placeholder="e.g. CS101" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Scripts</Label><Input type="number" value={bundleForm.total_scripts} onChange={(e) => updateBundle("total_scripts", e.target.value)} /></div>
                <div><Label>Status</Label>
                  <Select value={bundleForm.status} onValueChange={(v) => updateBundle("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="collected">Collected</SelectItem><SelectItem value="bundled">Bundled</SelectItem><SelectItem value="handed_over">Handed Over</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setBundleDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveBundle}>Save</Button></div>
          </DialogContent>
        </Dialog>

        {/* Squad Creation Dialog */}
        <Dialog open={squadDialogOpen} onOpenChange={setSquadDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Squad</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Exam *</Label>
                <Select value={squadForm.exam_id} onValueChange={(v) => setSquadForm((p) => ({ ...p, exam_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Squad Name *</Label><Input value={squadForm.name} onChange={(e) => setSquadForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Squad A" /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSquadDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveSquad}>Create</Button></div>
          </DialogContent>
        </Dialog>

        {/* Supplementary Registration Window Dialog */}
        <Dialog open={suppWindowDialogOpen} onOpenChange={(o) => { setSuppWindowDialogOpen(o); if (!o) setSuppWindowEditId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{suppWindowEditId ? "Edit" : "Create"} Registration Window</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Exam *</Label>
                <Select value={suppWindowForm.exam_id} onValueChange={(v) => setSuppWindowForm((p) => ({ ...p, exam_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Supplementary Exam" /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.exam_types?.name || "—"})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Window Name *</Label><Input value={suppWindowForm.name} onChange={(e) => setSuppWindowForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Supplementary Nov 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date *</Label><Input type="date" value={suppWindowForm.start_date} onChange={(e) => setSuppWindowForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date *</Label><Input type="date" value={suppWindowForm.end_date} onChange={(e) => setSuppWindowForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Fee per Subject ($)</Label><Input type="number" min="0" step="0.01" value={suppWindowForm.fee_per_subject} onChange={(e) => setSuppWindowForm((p) => ({ ...p, fee_per_subject: e.target.value }))} /></div>
              <div><Label>Internal Marks</Label>
                <Select value={suppWindowForm.internal_marks_handling} onValueChange={(v) => setSuppWindowForm((p) => ({ ...p, internal_marks_handling: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retain_old">Retain previous internal marks</SelectItem>
                    <SelectItem value="re_evaluate">Re-evaluate internal marks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSuppWindowDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveSuppWindow}>{suppWindowEditId ? "Update" : "Create"}</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
