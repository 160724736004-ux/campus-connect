import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, ClipboardList, FileEdit, Ticket, DollarSign, Settings, CheckCircle, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Backlogs() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [backlogs, setBacklogs] = useState<any[]>([]);
  const [identifying, setIdentifying] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [backlogRules, setBacklogRules] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, { full_name: string; student_id_number?: string }>>({});
  const [declarationRegs, setDeclarationRegs] = useState<any[]>([]);
  const [declarationGrades, setDeclarationGrades] = useState<Record<string, { grade: string; points: number }>>({});
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const canManage = role === "admin" || role === "hod";

  const fetchBacklogs = async () => {
    setLoading(true);
    const q = supabase
      .from("student_backlogs" as any)
      .select("*, enrollments(semester, course_id, courses(code, title))")
      .in("status", ["pending", "attempting"]);
    if (role === "student") (q as any).eq("student_id", user?.id);
    const { data } = await q.order("identified_at", { ascending: false });
    const items = (data || []).map((b: any) => ({
      ...b,
      semester: b.enrollments?.semester || "—",
      courseCode: b.enrollments?.courses?.code || "—",
      courseTitle: b.enrollments?.courses?.title || "—",
    }));
    setBacklogs(items);
    const bySem: Record<string, any[]> = {};
    items.forEach((b: any) => {
      const s = b.semester;
      if (!bySem[s]) bySem[s] = [];
      bySem[s].push(b);
    });
    setGrouped(bySem);
    setLoading(false);
  };

  const fetchAdminData = async () => {
    const [regRes, rulesRes] = await Promise.all([
      supabase.from("supplementary_registrations" as any).select("*, supplementary_registration_windows(name, exams(name))").order("registered_at", { ascending: false }),
      supabase.from("backlog_rules" as any).select("*").eq("is_active", true),
    ]);
    const regs = regRes.data || [];
    setRegistrations(regs);
    setBacklogRules(rulesRes.data || []);
    const ids = [...new Set(regs.map((r: any) => r.student_id).filter(Boolean))];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, student_id_number").in("id", ids);
      setStudentsMap(Object.fromEntries((profs || []).map((p: any) => [p.id, { full_name: p.full_name, student_id_number: p.student_id_number }])));
    } else setStudentsMap({});
  };

  const fetchDeclarationData = async () => {
    const { data } = await supabase
      .from("supplementary_registrations" as any)
      .select("*, supplementary_registration_subjects(backlog_id, student_backlogs(enrollment_id, enrollments(course_id, courses(code, title))))")
      .eq("payment_status", "paid");
    setDeclarationRegs(data || []);
  };

  useEffect(() => {
    fetchBacklogs();
    if (canManage) { fetchAdminData(); fetchDeclarationData(); }
  }, [user, role]);

  const handleIdentifyBacklogs = async () => {
    setIdentifying(true);
    const { error } = await supabase.rpc("identify_backlogs" as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIdentifying(false);
      return;
    }
    toast({ title: "Backlogs identified" });
    fetchBacklogs();
    setIdentifying(false);
  };

  const totalPending = backlogs.length;
  const bySemester = Object.entries(grouped).sort(([a], [b]) => (a < b ? 1 : -1));

  const handleMarkPaid = async (regId: string) => {
    const { error } = await supabase.from("supplementary_registrations" as any).update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", regId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Marked as paid" });
    fetchAdminData();
  };

  const handleGenerateHallTicket = async (regId: string) => {
    const { error } = await supabase.rpc("generate_supplementary_hall_tickets" as any, { p_registration_id: regId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hall tickets generated" });
    fetchAdminData();
  };

  const setDeclGrade = (backlogId: string, grade: string, points: number) => {
    setDeclarationGrades((p) => ({ ...p, [backlogId]: { grade, points } }));
  };

  const handleDeclareResult = async (regId: string) => {
    const reg = declarationRegs.find((r: any) => r.id === regId);
    if (!reg?.supplementary_registration_subjects) return;
    for (const subj of reg.supplementary_registration_subjects) {
      const backlog = subj.student_backlogs;
      if (!backlog) continue;
      const dg = declarationGrades[backlog.id];
      const grade = dg?.grade || "F";
      const points = dg?.points ?? 0;
      const { error } = await supabase.rpc("declare_supplementary_result" as any, {
        p_registration_id: regId,
        p_enrollment_id: backlog.enrollment_id,
        p_letter_grade: grade,
        p_grade_points: points,
        p_backlog_id: backlog.id,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Results declared" });
    setDeclarationGrades((p) => { const next = { ...p }; declarationRegs.find((r: any) => r.id === regId)?.supplementary_registration_subjects?.forEach((s: any) => delete next[s.student_backlogs?.id]); return next; });
    fetchBacklogs();
    fetchDeclarationData();
  };

  const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "D", "F"];
  const GRADE_POINTS: Record<string, number> = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, D: 4, F: 0 };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Backlogs</h1>
            <p className="text-muted-foreground">Failed subjects and supplementary exam registration</p>
          </div>
          {role === "admin" && (
            <Button onClick={handleIdentifyBacklogs} disabled={identifying} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${identifying ? "animate-spin" : ""}`} />
              Auto-identify backlogs
            </Button>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subject-wise</TabsTrigger>
            <TabsTrigger value="semester">Semester-wise</TabsTrigger>
            {canManage && <TabsTrigger value="registrations">Registrations</TabsTrigger>}
            {canManage && <TabsTrigger value="declare">Result Declaration</TabsTrigger>}
            {canManage && <TabsTrigger value="rules">Backlog Rules</TabsTrigger>}
          </TabsList>
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending Backlogs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totalPending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Semesters with Backlogs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{Object.keys(grouped).length}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30" onClick={() => totalPending > 0 && role === "student" && navigate("/backlog-registration")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Supplementary Registration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-primary">{totalPending > 0 ? "Register now" : "—"}</p>
                </CardContent>
              </Card>
            </div>
            {role === "student" && totalPending > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Button onClick={() => navigate("/backlog-registration")}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Register for Supplementary Exams
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="subjects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Subject-wise backlog history</CardTitle>
                <CardDescription>All pending and attempting backlogs</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                ) : backlogs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No backlogs found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {role === "admin" && <TableHead>Student</TableHead>}
                        <TableHead>Semester</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Subject</TableHead>
                        {role !== "student" && <TableHead>Attempts</TableHead>}
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backlogs.map((b) => (
                        <TableRow key={b.id}>
                          {role === "admin" && <TableCell className="font-medium">{b.student_id}</TableCell>}
                          <TableCell>{b.semester}</TableCell>
                          <TableCell className="font-mono">{b.courseCode}</TableCell>
                          <TableCell>{b.courseTitle}</TableCell>
                          {role !== "student" && <TableCell>{b.attempt_count ?? 0}</TableCell>}
                          <TableCell><Badge variant={b.status === "attempting" ? "secondary" : "destructive"}>{b.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="semester" className="mt-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : bySemester.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No backlogs found</CardContent></Card>
            ) : (
              bySemester.map(([sem, items]) => (
                <Card key={sem}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>{sem}</CardTitle>
                      <Badge variant="outline">{items.length} subject{items.length !== 1 ? "s" : ""}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Subject</TableHead>
                          {role !== "student" && <TableHead>Attempts</TableHead>}
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono">{b.courseCode}</TableCell>
                            <TableCell>{b.courseTitle}</TableCell>
                            {role !== "student" && <TableCell>{b.attempt_count ?? 0}</TableCell>}
                            <TableCell><Badge variant={b.status === "attempting" ? "secondary" : "destructive"}>{b.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          {canManage && (
            <TabsContent value="registrations" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Supplementary Registrations</CardTitle>
                  <CardDescription>Mark payment, generate hall tickets for paid registrations. Enter marks via External Marks Entry for supplementary exams.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {registrations.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No registrations yet</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Window</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{studentsMap[r.student_id]?.full_name || r.student_id?.slice(0, 8) + "…"}</TableCell>
                            <TableCell>{r.supplementary_registration_windows?.name || "—"}</TableCell>
                            <TableCell>${parseFloat(r.total_amount || 0).toFixed(2)}</TableCell>
                            <TableCell><Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>{r.payment_status}</Badge></TableCell>
                            <TableCell>
                              {r.payment_status !== "paid" && <Button variant="outline" size="sm" onClick={() => handleMarkPaid(r.id)}><DollarSign className="h-4 w-4 mr-1" /> Mark paid</Button>}
                              {r.payment_status === "paid" && <Button variant="outline" size="sm" onClick={() => handleGenerateHallTicket(r.id)}><Ticket className="h-4 w-4 mr-1" /> Generate hall ticket</Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="declare" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5" /> Result Declaration</CardTitle>
                  <CardDescription>Enter grade per subject, then declare. Pass = clear backlog & update grade. Fail = increment attempt.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {declarationRegs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No paid registrations to declare</div>
                  ) : (
                    <div className="divide-y">
                      {declarationRegs.map((r: any) => (
                        <div key={r.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{studentsMap[r.student_id]?.full_name || r.student_id?.slice(0, 8)} — {r.supplementary_registration_windows?.name}</p>
                            <Button size="sm" onClick={() => handleDeclareResult(r.id)}><CheckCircle className="h-4 w-4 mr-1" /> Declare results</Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Grade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(r.supplementary_registration_subjects || []).map((s: any) => {
                                const b = s.student_backlogs;
                                if (!b) return null;
                                const code = b.enrollments?.courses?.code || "—";
                                const title = b.enrollments?.courses?.title || "";
                                const dg = declarationGrades[b.id] || { grade: "F", points: 0 };
                                return (
                                  <TableRow key={b.id}>
                                    <TableCell>{code} — {title}</TableCell>
                                    <TableCell>
                                      <select className="rounded border px-2 py-1 text-sm" value={dg.grade} onChange={(e) => { const g = e.target.value; setDeclGrade(b.id, g, GRADE_POINTS[g] ?? 0); }}>
                                        {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                      </select>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="rules" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Backlog Rules</CardTitle>
                  <CardDescription>Max backlog limit, attempts, detention, fee structure</CardDescription>
                </CardHeader>
                <CardContent>
                  {backlogRules.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">No active rules. Add in Settings or run migration.</div>
                  ) : (
                    <div className="space-y-4">
                      {backlogRules.map((r: any) => (
                        <div key={r.id} className="rounded-lg border p-4 space-y-2">
                          <div className="flex justify-between">
                            <p className="font-medium">{r.name}</p>
                            <Button variant="outline" size="sm" onClick={() => { setEditingRule(r); setRulesDialogOpen(true); }}>Edit</Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Max backlog limit</span><p className="font-medium">{r.max_backlog_limit}</p></div>
                            <div><span className="text-muted-foreground">Max attempts/subject</span><p className="font-medium">{r.max_attempts_per_subject}</p></div>
                            <div><span className="text-muted-foreground">Detention if exceeds</span><p className="font-medium">{r.detention_if_exceeds_backlog ? "Yes" : "No"}</p></div>
                            <div><span className="text-muted-foreground">Max backlogs to progress</span><p className="font-medium">{r.max_backlogs_for_year_progression ?? "—"}</p></div>
                            <div><span className="text-muted-foreground">Fee per subject</span><p className="font-medium">${parseFloat(r.supplementary_fee_per_subject || 0).toFixed(2)}</p></div>
                            <div><span className="text-muted-foreground">Clearance deadline (semesters)</span><p className="font-medium">{r.backlog_clearance_deadline_semesters ?? "—"}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

        <Dialog open={rulesDialogOpen} onOpenChange={(o) => { setRulesDialogOpen(o); if (!o) setEditingRule(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Backlog Rules</DialogTitle></DialogHeader>
            {editingRule && (
              <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const f = e.target as HTMLFormElement; const payload = { max_backlog_limit: parseInt((f as any).max_backlog.value) || 20, max_attempts_per_subject: parseInt((f as any).max_attempts.value) || 6, detention_if_exceeds_backlog: (f as any).detention.checked, max_backlogs_for_year_progression: (f as any).max_progress.value ? parseInt((f as any).max_progress.value) : null, supplementary_fee_per_subject: parseFloat((f as any).fee.value) || 0 }; await supabase.from("backlog_rules" as any).update(payload).eq("id", editingRule.id); toast({ title: "Rules updated" }); setRulesDialogOpen(false); fetchAdminData(); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Max backlog limit</Label><Input name="max_backlog" type="number" defaultValue={editingRule.max_backlog_limit} min="1" max="50" /></div>
                  <div><Label>Max attempts per subject</Label><Input name="max_attempts" type="number" defaultValue={editingRule.max_attempts_per_subject} min="1" max="20" /></div>
                  <div><Label>Max backlogs for year progression</Label><Input name="max_progress" type="number" placeholder="Optional" defaultValue={editingRule.max_backlogs_for_year_progression ?? ""} min="0" /></div>
                  <div><Label>Fee per subject ($)</Label><Input name="fee" type="number" step="0.01" defaultValue={editingRule.supplementary_fee_per_subject} /></div>
                </div>
                <div className="flex items-center gap-2"><input name="detention" type="checkbox" defaultChecked={editingRule.detention_if_exceeds_backlog} /><Label>Detention if exceeds limit</Label></div>
                <div className="flex justify-end"><Button type="submit">Save</Button></div>
              </form>
            )}
          </DialogContent>
        </Dialog>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
