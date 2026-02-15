import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RefreshCw, AlertTriangle, TrendingUp, FileCheck, Plus, CheckCircle } from "lucide-react";

export default function ExamSpecialFeatures() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const canManage = role === "admin" || role === "hod";

  // Revaluation
  const [revalWindows, setRevalWindows] = useState<any[]>([]);
  const [revalApplications, setRevalApplications] = useState<any[]>([]);
  const [revalWindowDialogOpen, setRevalWindowDialogOpen] = useState(false);
  const [revalWindowForm, setRevalWindowForm] = useState({ exam_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0", revaluation_type: "retotaling" });
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [revalSubjects, setRevalSubjects] = useState<any[]>([]);
  const [revalMarksDialogOpen, setRevalMarksDialogOpen] = useState(false);
  const [revalMarksForm, setRevalMarksForm] = useState({ subject_id: "", final_marks: "", refund_amount: "" });

  // Malpractice
  const [malpracticeCases, setMalpracticeCases] = useState<any[]>([]);
  const [malpracticeDialogOpen, setMalpracticeDialogOpen] = useState(false);
  const [malpracticeForm, setMalpracticeForm] = useState({ student_id: "", course_id: "", exam_date: "", nature: "copying", description: "" });
  const [courses, setCourses] = useState<any[]>([]);
  const [malpracticeDecisions, setMalpracticeDecisions] = useState<any[]>([]);
  const [malpracticeAppeals, setMalpracticeAppeals] = useState<any[]>([]);

  // Grade Improvement / Betterment
  const [impBetRules, setImpBetRules] = useState<any[]>([]);
  const [impBetWindows, setImpBetWindows] = useState<any[]>([]);
  const [impBetRegistrations, setImpBetRegistrations] = useState<any[]>([]);
  const [impBetWindowDialogOpen, setImpBetWindowDialogOpen] = useState(false);
  const [impBetWindowForm, setImpBetWindowForm] = useState({ exam_id: "", rule_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0" });

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.full_name || "—";
  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.title || courses.find((c) => c.id === id)?.code || "—";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, coursesRes, revalWinRes, revalAppRes, malCasesRes, malDecRes, malAppRes, impRulesRes, impWinRes, impRegRes] = await Promise.all([
        supabase.from("exams" as any).select("*, exam_types(name)").order("name"),
        supabase.from("courses").select("id, code, title"),
        supabase.from("revaluation_windows" as any).select("*, exams(name)").eq("is_active", true).order("end_date", { ascending: false }),
        role === "admin" || role === "hod"
          ? supabase.from("revaluation_applications" as any).select("*, revaluation_windows(name, fee_per_subject, exams(name)), profiles(full_name)").order("applied_at", { ascending: false })
          : supabase.from("revaluation_applications" as any).select("*, revaluation_windows(name, fee_per_subject, exams(name))").eq("student_id", user?.id || "").order("applied_at", { ascending: false }),
        role === "admin" || role === "hod"
          ? supabase.from("malpractice_cases" as any).select("*, courses(code, title), profiles(full_name)").order("reported_at", { ascending: false })
          : supabase.from("malpractice_cases" as any).select("*, courses(code, title)").eq("student_id", user?.id || "").order("reported_at", { ascending: false }),
        supabase.from("malpractice_decisions" as any).select("*"),
        supabase.from("malpractice_appeals" as any).select("*, malpractice_cases(student_id)"),
        supabase.from("improvement_betterment_rules" as any).select("*").eq("is_active", true),
        supabase.from("improvement_betterment_windows" as any).select("*, exams(name), improvement_betterment_rules(exam_type, grade_policy)").eq("is_active", true).order("end_date", { ascending: false }),
        role === "admin" || role === "hod"
          ? supabase.from("improvement_betterment_registrations" as any).select("*, improvement_betterment_windows(name, exams(name), improvement_betterment_rules(exam_type))").order("registered_at", { ascending: false })
          : supabase.from("improvement_betterment_registrations" as any).select("*, improvement_betterment_windows(name, exams(name), improvement_betterment_rules(exam_type))").eq("student_id", user?.id || "").order("registered_at", { ascending: false }),
      ]);
      setExams(examsRes.data || []);
      setCourses(coursesRes.data || []);
      setRevalWindows(revalWinRes.data || []);
      setRevalApplications(revalAppRes.data || []);
      setMalpracticeCases(malCasesRes.data || []);
      setMalpracticeDecisions(malDecRes.data || []);
      setMalpracticeAppeals(malAppRes.data || []);
      setImpBetRules(impRulesRes.data || []);
      setImpBetWindows(impWinRes.data || []);
      setImpBetRegistrations(impRegRes.data || []);

      if (canManage) {
        const [studentsRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name"),
          supabase.from("user_roles").select("user_id").eq("role", "student"),
        ]);
        const studentIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
        setStudents((studentsRes.data || []).filter((s: any) => studentIds.has(s.id)));
      }

      const appIds = (revalAppRes.data || []).map((a: any) => a.id);
      if (appIds.length > 0) {
        const { data: subj } = await supabase.from("revaluation_application_subjects" as any).select("*, enrollments(courses(code, title)), assessment_component_definitions(name)").in("application_id", appIds);
        setRevalSubjects(subj || []);
      } else setRevalSubjects([]);
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const handleCreateRevalWindow = async () => {
    const { error } = await supabase.from("revaluation_windows" as any).insert({
      exam_id: revalWindowForm.exam_id,
      name: revalWindowForm.name,
      start_date: revalWindowForm.start_date,
      end_date: revalWindowForm.end_date,
      fee_per_subject: parseFloat(revalWindowForm.fee_per_subject) || 0,
      revaluation_type: revalWindowForm.revaluation_type,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Revaluation window created" }); setRevalWindowDialogOpen(false); setRevalWindowForm({ exam_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0", revaluation_type: "retotaling" }); fetchData();
  };

  const handleApproveRevalApplication = async (appId: string) => {
    const { error } = await supabase.rpc("approve_revaluation_application" as any, { p_app_id: appId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Application approved" }); fetchData();
  };

  const handleApplyRevalMarks = async () => {
    const { error } = await supabase.rpc("apply_revaluation_result" as any, {
      p_subject_id: revalMarksForm.subject_id,
      p_final_marks: parseFloat(revalMarksForm.final_marks),
      p_refund_amount: revalMarksForm.refund_amount ? parseFloat(revalMarksForm.refund_amount) : null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Revaluation result applied" }); setRevalMarksDialogOpen(false); setRevalMarksForm({ subject_id: "", final_marks: "", refund_amount: "" }); fetchData();
  };

  const handleCreateMalpracticeCase = async () => {
    const { error } = await supabase.from("malpractice_cases" as any).insert({
      student_id: malpracticeForm.student_id,
      course_id: malpracticeForm.course_id,
      exam_date: malpracticeForm.exam_date,
      nature: malpracticeForm.nature,
      description: malpracticeForm.description,
      reported_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Malpractice case recorded" }); setMalpracticeDialogOpen(false); setMalpracticeForm({ student_id: "", course_id: "", exam_date: "", nature: "copying", description: "" }); fetchData();
  };

  const handleCreateImpBetWindow = async () => {
    const { error } = await supabase.from("improvement_betterment_windows" as any).insert({
      exam_id: impBetWindowForm.exam_id,
      rule_id: impBetWindowForm.rule_id,
      name: impBetWindowForm.name,
      start_date: impBetWindowForm.start_date,
      end_date: impBetWindowForm.end_date,
      fee_per_subject: parseFloat(impBetWindowForm.fee_per_subject) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Window created" }); setImpBetWindowDialogOpen(false); setImpBetWindowForm({ exam_id: "", rule_id: "", name: "", start_date: "", end_date: "", fee_per_subject: "0" }); fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Examination Special Features</h1>
          <p className="text-muted-foreground">Revaluation, malpractice, grade improvement & betterment exams</p>
        </div>

        <Tabs defaultValue="revaluation">
          <TabsList>
            <TabsTrigger value="revaluation"><RefreshCw className="h-4 w-4 mr-1" />Revaluation</TabsTrigger>
            <TabsTrigger value="malpractice"><AlertTriangle className="h-4 w-4 mr-1" />Malpractice</TabsTrigger>
            <TabsTrigger value="grade-improvement"><TrendingUp className="h-4 w-4 mr-1" />Grade Improvement</TabsTrigger>
            <TabsTrigger value="betterment"><FileCheck className="h-4 w-4 mr-1" />Betterment</TabsTrigger>
          </TabsList>

          {/* REVALUATION TAB */}
          <TabsContent value="revaluation" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Revaluation / Rechecking</CardTitle>
                    <p className="text-sm text-muted-foreground">Application window, subject selection, fee payment, approval, marks comparison, fee refund, result publication</p>
                  </div>
                  {canManage && <Button onClick={() => setRevalWindowDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Window</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <h3 className="font-semibold mb-2">Revaluation Windows</h3>
                    {revalWindows.length === 0 ? <p className="text-sm text-muted-foreground">No active windows</p> : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Exam</TableHead><TableHead>Start–End</TableHead><TableHead>Fee/Subject</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
                        <TableBody>{revalWindows.map((w: any) => (
                          <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.exams?.name}</TableCell><TableCell>{w.start_date} – {w.end_date}</TableCell><TableCell>${parseFloat(w.fee_per_subject || 0).toFixed(2)}</TableCell><TableCell className="capitalize">{w.revaluation_type}</TableCell></TableRow>
                        ))}</TableBody>
                      </Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">My / All Applications</h3>
                    {revalApplications.length === 0 ? <p className="text-sm text-muted-foreground">No applications</p> : (
                      <Table>
                        <TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Window</TableHead><TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>{revalApplications.map((a: any) => (
                          <TableRow key={a.id}>
                            {canManage && <TableCell>{a.profiles?.full_name || getStudentName(a.student_id)}</TableCell>}
                            <TableCell>{a.revaluation_windows?.name}</TableCell>
                            <TableCell>${parseFloat(a.total_fee || 0).toFixed(2)}</TableCell>
                            <TableCell><Badge variant={a.status === "completed" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell>
                            <TableCell><Badge variant={a.payment_status === "paid" ? "default" : "outline"}>{a.payment_status}</Badge></TableCell>
                            {canManage && (a.status === "submitted" && a.payment_status === "paid") && (
                              <TableCell><Button size="sm" variant="outline" onClick={() => handleApproveRevalApplication(a.id)}>Approve</Button></TableCell>
                            )}
                          </TableRow>
                        ))}</TableBody>
                      </Table>
                    )}
                    {canManage && revalSubjects.length > 0 && (
                      <>
                        <h3 className="font-semibold mt-6 mb-2">Marks Entry / Comparison</h3>
                        <Table>
                          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Original</TableHead><TableHead>Revaluation</TableHead><TableHead>Final</TableHead><TableHead>Refund</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                          <TableBody>{revalSubjects.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell>{getStudentName((revalApplications.find((a: any) => a.id === s.application_id) as any)?.student_id)}</TableCell>
                              <TableCell>{s.enrollments?.courses?.code || "—"}</TableCell>
                              <TableCell>{s.original_marks ?? "—"}</TableCell>
                              <TableCell>{s.revaluation_marks ?? "—"}</TableCell>
                              <TableCell>{s.final_marks ?? "—"}</TableCell>
                              <TableCell>{s.fee_refunded ? `$${s.refund_amount || 0}` : "—"}</TableCell>
                              <TableCell>{!s.completed_at && <Button size="sm" variant="outline" onClick={() => { setRevalMarksForm({ subject_id: s.id, final_marks: String(s.revaluation_marks ?? s.original_marks ?? ""), refund_amount: "" }); setRevalMarksDialogOpen(true); }}>Apply Result</Button>}</TableCell>
                            </TableRow>
                          ))}</TableBody>
                        </Table>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MALPRACTICE TAB */}
          <TabsContent value="malpractice" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Malpractice / Unfair Means</CardTitle>
                    <p className="text-sm text-muted-foreground">Case recording, enquiry committee, hearing, decision, penalty (marks deduction, subject/semester cancellation, expulsion), appeal</p>
                  </div>
                  {canManage && <Button variant="destructive" onClick={() => setMalpracticeDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Case</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : malpracticeCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No malpractice cases</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Subject</TableHead><TableHead>Date</TableHead><TableHead>Nature</TableHead><TableHead>Status</TableHead><TableHead>Decision</TableHead></TableRow></TableHeader>
                    <TableBody>{malpracticeCases.map((c: any) => {
                      const dec = malpracticeDecisions.find((d: any) => d.case_id === c.id);
                      return (
                        <TableRow key={c.id}>
                          {canManage && <TableCell>{c.profiles?.full_name || getStudentName(c.student_id)}</TableCell>}
                          <TableCell>{c.courses?.code || getCourseName(c.course_id)}</TableCell>
                          <TableCell>{c.exam_date}</TableCell>
                          <TableCell className="capitalize">{c.nature}</TableCell>
                          <TableCell><Badge variant={c.status === "closed" ? "default" : c.status === "decided" ? "secondary" : "outline"}>{c.status}</Badge></TableCell>
                          <TableCell>{dec ? `${dec.decision} ${dec.penalty_type ? `(${dec.penalty_type})` : ""}` : "—"}</TableCell>
                        </TableRow>
                      );
                    })}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GRADE IMPROVEMENT TAB */}
          <TabsContent value="grade-improvement" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Grade Improvement</CardTitle>
                    <p className="text-sm text-muted-foreground">For passed students wanting better grades. Registration, fee, new marks, better grade for CGPA, both on transcript with asterisk, limitation on attempts</p>
                  </div>
                  {canManage && <Button onClick={() => { setImpBetWindowForm((p) => ({ ...p, rule_id: impBetRules.find((r: any) => r.exam_type === "improvement")?.id || "" })); setImpBetWindowDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Window</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <h3 className="font-semibold mb-2">Rules (Improvement)</h3>
                    {impBetRules.filter((r: any) => r.exam_type === "improvement").length === 0 ? <p className="text-sm text-muted-foreground">No improvement rules</p> : (
                      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Grade Policy</TableHead><TableHead>Max Attempts/Subject</TableHead></TableRow></TableHeader>
                      <TableBody>{impBetRules.filter((r: any) => r.exam_type === "improvement").map((r: any) => (
                        <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell className="capitalize">{r.grade_policy}</TableCell><TableCell>{r.max_attempts_per_subject}</TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">Windows (Improvement)</h3>
                    {impBetWindows.filter((w: any) => w.improvement_betterment_rules?.exam_type === "improvement").length === 0 ? <p className="text-sm text-muted-foreground">No windows</p> : (
                      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Exam</TableHead><TableHead>Dates</TableHead><TableHead>Fee/Subject</TableHead></TableRow></TableHeader>
                      <TableBody>{impBetWindows.filter((w: any) => w.improvement_betterment_rules?.exam_type === "improvement").map((w: any) => (
                        <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.exams?.name}</TableCell><TableCell>{w.start_date} – {w.end_date}</TableCell><TableCell>${parseFloat(w.fee_per_subject || 0).toFixed(2)}</TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">Registrations (Improvement)</h3>
                    {impBetRegistrations.filter((r: any) => r.improvement_betterment_windows?.improvement_betterment_rules?.exam_type === "improvement").length === 0 ? <p className="text-sm text-muted-foreground">No registrations</p> : (
                      <Table><TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Window</TableHead><TableHead>Fee</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
                      <TableBody>{impBetRegistrations.filter((r: any) => r.improvement_betterment_windows?.improvement_betterment_rules?.exam_type === "improvement").map((r: any) => (
                        <TableRow key={r.id}>{canManage && <TableCell>{getStudentName(r.student_id)}</TableCell>}<TableCell>{r.improvement_betterment_windows?.name}</TableCell><TableCell>${parseFloat(r.total_fee || 0).toFixed(2)}</TableCell><TableCell><Badge variant={r.payment_status === "paid" ? "default" : "outline"}>{r.payment_status}</Badge></TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BETTERMENT TAB */}
          <TabsContent value="betterment" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Betterment Exam</CardTitle>
                    <p className="text-sm text-muted-foreground">Similar to improvement. Admin-configurable: replace old marks completely or average of both attempts</p>
                  </div>
                  {canManage && <Button onClick={() => { setImpBetWindowForm((p) => ({ ...p, rule_id: impBetRules.find((r: any) => r.exam_type === "betterment")?.id || "" })); setImpBetWindowDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Window</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <h3 className="font-semibold mb-2">Rules (Betterment)</h3>
                    {impBetRules.filter((r: any) => r.exam_type === "betterment").length === 0 ? <p className="text-sm text-muted-foreground">No betterment rules</p> : (
                      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Grade Policy</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                      <TableBody>{impBetRules.filter((r: any) => r.exam_type === "betterment").map((r: any) => (
                        <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell className="capitalize">{r.grade_policy}</TableCell><TableCell>{r.grade_policy === "replace" ? "Replace old marks completely" : r.grade_policy === "average" ? "Average of both attempts" : "Best grade for CGPA"}</TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">Windows (Betterment)</h3>
                    {impBetWindows.filter((w: any) => w.improvement_betterment_rules?.exam_type === "betterment").length === 0 ? <p className="text-sm text-muted-foreground">No windows</p> : (
                      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Exam</TableHead><TableHead>Dates</TableHead><TableHead>Fee</TableHead></TableRow></TableHeader>
                      <TableBody>{impBetWindows.filter((w: any) => w.improvement_betterment_rules?.exam_type === "betterment").map((w: any) => (
                        <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.exams?.name}</TableCell><TableCell>{w.start_date} – {w.end_date}</TableCell><TableCell>${parseFloat(w.fee_per_subject || 0).toFixed(2)}</TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Revaluation Window Dialog */}
      <Dialog open={revalWindowDialogOpen} onOpenChange={setRevalWindowDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Revaluation Window</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Exam</Label><Select value={revalWindowForm.exam_id} onValueChange={(v) => setRevalWindowForm((p) => ({ ...p, exam_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Name</Label><Input value={revalWindowForm.name} onChange={(e) => setRevalWindowForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Nov 2026 Revaluation" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={revalWindowForm.start_date} onChange={(e) => setRevalWindowForm((p) => ({ ...p, start_date: e.target.value }))} /></div><div><Label>End Date</Label><Input type="date" value={revalWindowForm.end_date} onChange={(e) => setRevalWindowForm((p) => ({ ...p, end_date: e.target.value }))} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Fee per Subject</Label><Input type="number" step="0.01" value={revalWindowForm.fee_per_subject} onChange={(e) => setRevalWindowForm((p) => ({ ...p, fee_per_subject: e.target.value }))} /></div><div><Label>Type</Label><Select value={revalWindowForm.revaluation_type} onValueChange={(v) => setRevalWindowForm((p) => ({ ...p, revaluation_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retotaling">Re-totaling</SelectItem><SelectItem value="full_reevaluation">Full Re-evaluation</SelectItem></SelectContent></Select></div></div>
            <Button onClick={handleCreateRevalWindow} className="w-full">Create Window</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revaluation Marks Dialog */}
      <Dialog open={revalMarksDialogOpen} onOpenChange={setRevalMarksDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply Revaluation Result</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Final Marks</Label><Input type="number" step="0.01" value={revalMarksForm.final_marks} onChange={(e) => setRevalMarksForm((p) => ({ ...p, final_marks: e.target.value }))} placeholder="0" /></div>
            <div><Label>Refund Amount (if marks increased)</Label><Input type="number" step="0.01" value={revalMarksForm.refund_amount} onChange={(e) => setRevalMarksForm((p) => ({ ...p, refund_amount: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleApplyRevalMarks} className="w-full">Apply Result & Update Grade</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Malpractice Case Dialog */}
      <Dialog open={malpracticeDialogOpen} onOpenChange={setMalpracticeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Malpractice Case</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Student</Label><Select value={malpracticeForm.student_id} onValueChange={(v) => setMalpracticeForm((p) => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={malpracticeForm.course_id} onValueChange={(v) => setMalpracticeForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Exam Date</Label><Input type="date" value={malpracticeForm.exam_date} onChange={(e) => setMalpracticeForm((p) => ({ ...p, exam_date: e.target.value }))} /></div>
            <div><Label>Nature</Label><Select value={malpracticeForm.nature} onValueChange={(v) => setMalpracticeForm((p) => ({ ...p, nature: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="copying">Copying</SelectItem><SelectItem value="impersonation">Impersonation</SelectItem><SelectItem value="forbidden_material">Forbidden Material</SelectItem><SelectItem value="communication">Communication</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={malpracticeForm.description} onChange={(e) => setMalpracticeForm((p) => ({ ...p, description: e.target.value }))} placeholder="Details of the incident" /></div>
            <Button variant="destructive" onClick={handleCreateMalpracticeCase} className="w-full">Record Case</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Improvement/Betterment Window Dialog */}
      <Dialog open={impBetWindowDialogOpen} onOpenChange={setImpBetWindowDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Grade Improvement / Betterment Window</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Exam</Label><Select value={impBetWindowForm.exam_id} onValueChange={(v) => setImpBetWindowForm((p) => ({ ...p, exam_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Rule</Label><Select value={impBetWindowForm.rule_id} onValueChange={(v) => setImpBetWindowForm((p) => ({ ...p, rule_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{impBetRules.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.exam_type})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Name</Label><Input value={impBetWindowForm.name} onChange={(e) => setImpBetWindowForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Fall 2026 Improvement" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={impBetWindowForm.start_date} onChange={(e) => setImpBetWindowForm((p) => ({ ...p, start_date: e.target.value }))} /></div><div><Label>End Date</Label><Input type="date" value={impBetWindowForm.end_date} onChange={(e) => setImpBetWindowForm((p) => ({ ...p, end_date: e.target.value }))} /></div></div>
            <div><Label>Fee per Subject</Label><Input type="number" step="0.01" value={impBetWindowForm.fee_per_subject} onChange={(e) => setImpBetWindowForm((p) => ({ ...p, fee_per_subject: e.target.value }))} /></div>
            <Button onClick={handleCreateImpBetWindow} className="w-full">Create Window</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
