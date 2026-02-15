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
import { Target, BookOpen, Link2, BarChart3, AlertCircle, RefreshCw, GraduationCap, CreditCard, Upload, Globe } from "lucide-react";

export default function OBEAndCBCS() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const canManage = role === "admin" || role === "hod";

  // Programs & courses
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // OBE
  const [pos, setPos] = useState<any[]>([]);
  const [psos, setPsos] = useState<any[]>([]);
  const [cos, setCos] = useState<any[]>([]);
  const [coPoMappings, setCoPoMappings] = useState<any[]>([]);
  const [coPsoMappings, setCoPsoMappings] = useState<any[]>([]);
  const [coAttainment, setCoAttainment] = useState<any[]>([]);
  const [poAttainment, setPoAttainment] = useState<any[]>([]);
  const [gapActions, setGapActions] = useState<any[]>([]);
  const [improvementCycles, setImprovementCycles] = useState<any[]>([]);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [psoDialogOpen, setPsoDialogOpen] = useState(false);
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [poForm, setPoForm] = useState({ program_id: "", code: "", description: "", target_attainment: "70" });
  const [psoForm, setPsoForm] = useState({ program_id: "", code: "", description: "", target_attainment: "70" });
  const [coForm, setCoForm] = useState({ course_id: "", code: "", description: "" });
  const [gapDialogOpen, setGapDialogOpen] = useState(false);
  const [gapForm, setGapForm] = useState({ outcome_type: "CO", outcome_id: "", semester_text: "", target_attainment: "", actual_attainment: "", action_taken: "" });
  const gapOutcomeOptions = gapForm.outcome_type === "CO" ? cos : gapForm.outcome_type === "PO" ? pos : psos;

  // CBCS
  const [creditStructures, setCreditStructures] = useState<any[]>([]);
  const [exitPoints, setExitPoints] = useState<any[]>([]);
  const [creditTransfers, setCreditTransfers] = useState<any[]>([]);
  const [moocCredits, setMoocCredits] = useState<any[]>([]);
  const [creditSummary, setCreditSummary] = useState<any[]>([]);
  const [equivalenceMappings, setEquivalenceMappings] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [cbcsStructDialogOpen, setCbcsStructDialogOpen] = useState(false);
  const [cbcsStructForm, setCbcsStructForm] = useState({ program_id: "", min_credits_degree: "120", credits_certificate: "", credits_diploma: "", min_credits_per_semester: "16", max_credits_per_semester: "26", allow_overload: false });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [moocDialogOpen, setMoocDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ student_id: "", institution_name: "", external_course_name: "", credits: "", equivalent_course_id: "" });
  const [moocForm, setMoocForm] = useState({ student_id: "", platform: "NPTEL", course_name: "", credits: "", equivalent_course_id: "" });
  const [students, setStudents] = useState<any[]>([]);
  const [coPoDialogOpen, setCoPoDialogOpen] = useState(false);
  const [coPsoDialogOpen, setCoPsoDialogOpen] = useState(false);
  const [assessCoDialogOpen, setAssessCoDialogOpen] = useState(false);
  const [coPoForm, setCoPoForm] = useState({ course_outcome_id: "", programme_outcome_id: "", strength: "1" });
  const [coPsoForm, setCoPsoForm] = useState({ course_outcome_id: "", pso_id: "", strength: "1" });
  const [assessCoForm, setAssessCoForm] = useState({ component_definition_id: "", course_outcome_id: "", weight_percent: "100" });
  const [componentDefs, setComponentDefs] = useState<any[]>([]);
  const [assessCoMappings, setAssessCoMappings] = useState<any[]>([]);
  const [computeAttainmentForm, setComputeAttainmentForm] = useState({ course_id: "", semester_text: "", academic_year_id: "" });
  const [computeDialogOpen, setComputeDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progsRes, coursesRes, yearsRes, posRes, psosRes, cosRes, coPoRes, coPsoRes, assessCoRes, coAttRes, poAttRes, gapRes, cycleRes, structRes, exitRes, transRes, moocRes, sumRes, equivRes, varRes] = await Promise.all([
        supabase.from("programs").select("*").order("name"),
        supabase.from("courses").select("id, code, title").order("code"),
        supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
        supabase.from("programme_outcomes" as any).select("*, programs(name)").order("sort_order"),
        supabase.from("programme_specific_outcomes" as any).select("*, programs(name)").order("sort_order"),
        supabase.from("course_outcomes" as any).select("*, courses(code, title)").order("sort_order"),
        supabase.from("co_po_mapping" as any).select("*, course_outcomes(code, courses(code)), programme_outcomes(code)"),
        supabase.from("co_pso_mapping" as any).select("*, course_outcomes(code, courses(code)), programme_specific_outcomes(code)"),
        supabase.from("assessment_co_mapping" as any).select("*, assessment_component_definitions(name, courses(code)), course_outcomes(code)"),
        supabase.from("co_attainment" as any).select("*, course_outcomes(code), courses(code)"),
        supabase.from("po_attainment" as any).select("*, programme_outcomes(code), programs(name)"),
        supabase.from("obe_gap_actions" as any).select("*"),
        supabase.from("obe_improvement_cycles" as any).select("*, programs(name)"),
        supabase.from("cbcs_credit_structure" as any).select("*, programs(name)"),
        supabase.from("cbcs_exit_points" as any).select("*, programs(name)"),
        role === "admin" || role === "hod" ? supabase.from("credit_transfers" as any).select("*, profiles(full_name), courses(code)").order("created_at", { ascending: false }) : supabase.from("credit_transfers" as any).select("*, courses(code)").eq("student_id", user?.id || "").order("created_at", { ascending: false }),
        role === "admin" || role === "hod" ? supabase.from("mooc_credits" as any).select("*, profiles(full_name), courses(code)").order("created_at", { ascending: false }) : supabase.from("mooc_credits" as any).select("*, courses(code)").eq("student_id", user?.id || "").order("created_at", { ascending: false }),
        role === "admin" || role === "hod" ? supabase.from("student_credit_summary" as any).select("*, profiles(full_name)") : supabase.from("student_credit_summary" as any).select("*").eq("student_id", user?.id || ""),
        supabase.from("credit_equivalence_mapping" as any).select("*, programs(name), courses(code, title)"),
        supabase.from("cbcs_programme_variants" as any).select("*, programs(name)"),
      ]);
      setPrograms(progsRes.data || []);
      setCourses(coursesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setPos(posRes.data || []);
      setPsos(psosRes.data || []);
      setCos(cosRes.data || []);
      setCoPoMappings(coPoRes.data || []);
      setCoPsoMappings(coPsoRes.data || []);
      setAssessCoMappings(assessCoRes.data || []);
      setCoAttainment(coAttRes.data || []);
      setPoAttainment(poAttRes.data || []);
      setGapActions(gapRes.data || []);
      setImprovementCycles(cycleRes.data || []);
      setCreditStructures(structRes.data || []);
      setExitPoints(exitRes.data || []);
      setCreditTransfers(transRes.data || []);
      setMoocCredits(moocRes.data || []);
      setCreditSummary(sumRes.data || []);
      setEquivalenceMappings(equivRes.data || []);
      setVariants(varRes.data || []);

      if (canManage) {
        const [studentsRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name"),
          supabase.from("user_roles").select("user_id").eq("role", "student"),
        ]);
        const studentIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
        setStudents((studentsRes.data || []).filter((s: any) => studentIds.has(s.id)));
      }
      const { data: compDefs } = await supabase.from("assessment_component_definitions" as any).select("*, courses(code, title), assessment_component_types(name)").order("name");
      setComponentDefs(compDefs || []);
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.full_name || "—";
  const getProgramName = (id: string) => programs.find((p) => p.id === id)?.name || "—";
  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.title || courses.find((c) => c.id === id)?.code || "—";

  const handleCreatePO = async () => {
    const { error } = await supabase.from("programme_outcomes" as any).insert({
      program_id: poForm.program_id, code: poForm.code, description: poForm.description, target_attainment: parseFloat(poForm.target_attainment) || 70,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "PO added" }); setPoDialogOpen(false); setPoForm({ program_id: "", code: "", description: "", target_attainment: "70" }); fetchData();
  };
  const handleCreatePSO = async () => {
    const { error } = await supabase.from("programme_specific_outcomes" as any).insert({
      program_id: psoForm.program_id, code: psoForm.code, description: psoForm.description, target_attainment: parseFloat(psoForm.target_attainment) || 70,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "PSO added" }); setPsoDialogOpen(false); setPsoForm({ program_id: "", code: "", description: "", target_attainment: "70" }); fetchData();
  };
  const handleCreateCO = async () => {
    const { error } = await supabase.from("course_outcomes" as any).insert({
      course_id: coForm.course_id, code: coForm.code, description: coForm.description,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CO added" }); setCoDialogOpen(false); setCoForm({ course_id: "", code: "", description: "" }); fetchData();
  };
  const handleCreateGapAction = async () => {
    if (!gapForm.outcome_id) { toast({ title: "Select an outcome", variant: "destructive" }); return; }
    const gap = (parseFloat(gapForm.target_attainment) || 0) - (parseFloat(gapForm.actual_attainment) || 0);
    const { error } = await supabase.from("obe_gap_actions" as any).insert({
      outcome_type: gapForm.outcome_type, outcome_id: gapForm.outcome_id, semester_text: gapForm.semester_text, target_attainment: gapForm.target_attainment ? parseFloat(gapForm.target_attainment) : null, actual_attainment: gapForm.actual_attainment ? parseFloat(gapForm.actual_attainment) : null, gap: gap, action_taken: gapForm.action_taken || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gap action recorded" }); setGapDialogOpen(false); setGapForm({ outcome_type: "CO", outcome_id: "", semester_text: "", target_attainment: "", actual_attainment: "", action_taken: "" }); fetchData();
  };
  const handleCreateCbcsStruct = async () => {
    const { error } = await supabase.from("cbcs_credit_structure" as any).insert({
      program_id: cbcsStructForm.program_id, min_credits_degree: parseFloat(cbcsStructForm.min_credits_degree) || 120, credits_certificate: cbcsStructForm.credits_certificate ? parseFloat(cbcsStructForm.credits_certificate) : null, credits_diploma: cbcsStructForm.credits_diploma ? parseFloat(cbcsStructForm.credits_diploma) : null, min_credits_per_semester: parseInt(cbcsStructForm.min_credits_per_semester) || 16, max_credits_per_semester: parseInt(cbcsStructForm.max_credits_per_semester) || 26, allow_overload: cbcsStructForm.allow_overload,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Credit structure added" }); setCbcsStructDialogOpen(false); setCbcsStructForm({ program_id: "", min_credits_degree: "120", credits_certificate: "", credits_diploma: "", min_credits_per_semester: "16", max_credits_per_semester: "26", allow_overload: false }); fetchData();
  };
  const handleCreateTransfer = async () => {
    const { error } = await supabase.from("credit_transfers" as any).insert({
      student_id: transferForm.student_id, institution_name: transferForm.institution_name, external_course_name: transferForm.external_course_name, credits: parseFloat(transferForm.credits), equivalent_course_id: transferForm.equivalent_course_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Credit transfer recorded" }); setTransferDialogOpen(false); setTransferForm({ student_id: "", institution_name: "", external_course_name: "", credits: "", equivalent_course_id: "" }); fetchData();
  };
  const handleCreateMooc = async () => {
    const { error } = await supabase.from("mooc_credits" as any).insert({
      student_id: moocForm.student_id, platform: moocForm.platform, course_name: moocForm.course_name, credits: parseFloat(moocForm.credits), equivalent_course_id: moocForm.equivalent_course_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "MOOC credit recorded" }); setMoocDialogOpen(false); setMoocForm({ student_id: "", platform: "NPTEL", course_name: "", credits: "", equivalent_course_id: "" }); fetchData();
  };
  const handleCreateCoPoMapping = async () => {
    const { error } = await supabase.from("co_po_mapping" as any).insert({
      course_outcome_id: coPoForm.course_outcome_id, programme_outcome_id: coPoForm.programme_outcome_id, strength: parseInt(coPoForm.strength) || 1,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CO-PO mapping added" }); setCoPoDialogOpen(false); setCoPoForm({ course_outcome_id: "", programme_outcome_id: "", strength: "1" }); fetchData();
  };
  const handleCreateCoPsoMapping = async () => {
    const { error } = await supabase.from("co_pso_mapping" as any).insert({
      course_outcome_id: coPsoForm.course_outcome_id, pso_id: coPsoForm.pso_id, strength: parseInt(coPsoForm.strength) || 1,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CO-PSO mapping added" }); setCoPsoDialogOpen(false); setCoPsoForm({ course_outcome_id: "", pso_id: "", strength: "1" }); fetchData();
  };
  const handleCreateAssessCoMapping = async () => {
    const { error } = await supabase.from("assessment_co_mapping" as any).insert({
      component_definition_id: assessCoForm.component_definition_id, course_outcome_id: assessCoForm.course_outcome_id, weight_percent: parseFloat(assessCoForm.weight_percent) || 100,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assessment-CO mapping added" }); setAssessCoDialogOpen(false); setAssessCoForm({ component_definition_id: "", course_outcome_id: "", weight_percent: "100" }); fetchData();
  };
  const handleComputeCoAttainment = async () => {
    const { error } = await supabase.rpc("compute_co_attainment" as any, {
      p_course_id: computeAttainmentForm.course_id, p_semester_text: computeAttainmentForm.semester_text, p_academic_year_id: computeAttainmentForm.academic_year_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CO attainment computed" }); setComputeDialogOpen(false); setComputeAttainmentForm({ course_id: "", semester_text: "", academic_year_id: "" }); fetchData();
  };
  const handleSyncCredits = async () => {
    setSyncing(true);
    const { data, error } = await supabase.rpc("sync_student_credits" as any, { p_student_id: null });
    setSyncing(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Credits synced", description: `${data ?? 0} students updated` }); fetchData();
  };
  const handleApproveTransfer = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_credit_transfer" as any, { p_transfer_id: id, p_status: status });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Transfer approved" : "Transfer rejected" }); fetchData();
  };
  const handleApproveMooc = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_mooc_credit" as any, { p_mooc_id: id, p_status: status });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "MOOC credit approved" : "MOOC credit rejected" }); fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advanced Academic Features</h1>
          <p className="text-muted-foreground">Outcome-Based Education (OBE) & Choice Based Credit System (CBCS)</p>
        </div>

        <Tabs defaultValue="obe">
          <TabsList>
            <TabsTrigger value="obe"><Target className="h-4 w-4 mr-1" />OBE</TabsTrigger>
            <TabsTrigger value="cbcs"><CreditCard className="h-4 w-4 mr-1" />CBCS</TabsTrigger>
          </TabsList>

          {/* OBE TAB */}
          <TabsContent value="obe" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Outcome-Based Education</CardTitle>
                    <p className="text-sm text-muted-foreground">POs, PSOs, COs, mapping, CO/PO attainment, gap analysis, continuous improvement. Reports for NBA/NAAC.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Programme Outcomes (POs)</h3>
                        {canManage && <Button size="sm" onClick={() => setPoDialogOpen(true)}><Target className="h-4 w-4 mr-1" />Add PO</Button>}
                      </div>
                      {pos.length === 0 ? <p className="text-sm text-muted-foreground">No POs defined</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead>Target %</TableHead></TableRow></TableHeader>
                        <TableBody>{pos.map((p: any) => <TableRow key={p.id}><TableCell>{p.programs?.name}</TableCell><TableCell>{p.code}</TableCell><TableCell className="max-w-xs truncate">{p.description}</TableCell><TableCell>{p.target_attainment}%</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Programme Specific Outcomes (PSOs)</h3>
                        {canManage && <Button size="sm" onClick={() => setPsoDialogOpen(true)}>Add PSO</Button>}
                      </div>
                      {psos.length === 0 ? <p className="text-sm text-muted-foreground">No PSOs defined</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead>Target %</TableHead></TableRow></TableHeader>
                        <TableBody>{psos.map((p: any) => <TableRow key={p.id}><TableCell>{p.programs?.name}</TableCell><TableCell>{p.code}</TableCell><TableCell className="max-w-xs truncate">{p.description}</TableCell><TableCell>{p.target_attainment}%</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Course Outcomes (COs)</h3>
                        {canManage && <Button size="sm" onClick={() => setCoDialogOpen(true)}><BookOpen className="h-4 w-4 mr-1" />Add CO</Button>}
                      </div>
                      {cos.length === 0 ? <p className="text-sm text-muted-foreground">No COs defined</p> : (
                        <Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                        <TableBody>{cos.map((c: any) => <TableRow key={c.id}><TableCell>{c.courses?.code}</TableCell><TableCell>{c.code}</TableCell><TableCell className="max-w-xs truncate">{c.description}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">CO–PO Mapping</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setCoPoDialogOpen(true)}><Link2 className="h-4 w-4 mr-1" />Add</Button>}
                      </div>
                      {coPoMappings.length === 0 ? <p className="text-sm text-muted-foreground">No mappings</p> : (
                        <Table><TableHeader><TableRow><TableHead>CO</TableHead><TableHead>PO</TableHead><TableHead>Strength</TableHead></TableRow></TableHeader>
                        <TableBody>{coPoMappings.map((m: any) => <TableRow key={m.id}><TableCell>{m.course_outcomes?.code} ({m.course_outcomes?.courses?.code})</TableCell><TableCell>{m.programme_outcomes?.code}</TableCell><TableCell>{m.strength}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">CO–PSO Mapping</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setCoPsoDialogOpen(true)}><Link2 className="h-4 w-4 mr-1" />Add</Button>}
                      </div>
                      {coPsoMappings.length === 0 ? <p className="text-sm text-muted-foreground">No mappings</p> : (
                        <Table><TableHeader><TableRow><TableHead>CO</TableHead><TableHead>PSO</TableHead><TableHead>Strength</TableHead></TableRow></TableHeader>
                        <TableBody>{coPsoMappings.map((m: any) => <TableRow key={m.id}><TableCell>{m.course_outcomes?.code}</TableCell><TableCell>{m.programme_specific_outcomes?.code}</TableCell><TableCell>{m.strength}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Assessment–CO Mapping</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setAssessCoDialogOpen(true)}><Link2 className="h-4 w-4 mr-1" />Add</Button>}
                      </div>
                      {assessCoMappings.length === 0 ? <p className="text-sm text-muted-foreground">No mappings</p> : (
                        <Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead>CO</TableHead><TableHead>Weight %</TableHead></TableRow></TableHeader>
                        <TableBody>{assessCoMappings.map((m: any) => <TableRow key={m.id}><TableCell>{m.assessment_component_definitions?.courses?.code} – {m.assessment_component_definitions?.name}</TableCell><TableCell>{m.course_outcomes?.code}</TableCell><TableCell>{m.weight_percent}%</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">CO Attainment (target vs actual)</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setComputeDialogOpen(true)}><BarChart3 className="h-4 w-4 mr-1" />Compute</Button>}
                      </div>
                      {coAttainment.length === 0 ? <p className="text-sm text-muted-foreground">No attainment data</p> : (
                        <Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>CO</TableHead><TableHead>Semester</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead><TableHead>Students</TableHead></TableRow></TableHeader>
                        <TableBody>{coAttainment.map((a: any) => <TableRow key={a.id}><TableCell>{a.courses?.code}</TableCell><TableCell>{a.course_outcomes?.code}</TableCell><TableCell>{a.semester_text}</TableCell><TableCell>{a.target_attainment}%</TableCell><TableCell>{a.actual_attainment != null ? `${a.actual_attainment}%` : "—"}</TableCell><TableCell>{a.students_above_threshold ?? "—"}/{a.total_students ?? "—"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">PO Attainment</h3>
                      {poAttainment.length === 0 ? <p className="text-sm text-muted-foreground">No attainment data</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>PO</TableHead><TableHead>Semester</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead></TableRow></TableHeader>
                        <TableBody>{poAttainment.map((a: any) => <TableRow key={a.id}><TableCell>{a.programs?.name}</TableCell><TableCell>{a.programme_outcomes?.code}</TableCell><TableCell>{a.semester_text}</TableCell><TableCell>{a.target_attainment}%</TableCell><TableCell>{a.actual_attainment != null ? `${a.actual_attainment}%` : "—"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Gap Analysis & Action Taken</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={() => setGapDialogOpen(true)}><AlertCircle className="h-4 w-4 mr-1" />Record Action</Button>}
                      </div>
                      {gapActions.length === 0 ? <p className="text-sm text-muted-foreground">No gap actions</p> : (
                        <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Semester</TableHead><TableHead>Target</TableHead><TableHead>Actual</TableHead><TableHead>Gap</TableHead><TableHead>Action Taken</TableHead></TableRow></TableHeader>
                        <TableBody>{gapActions.map((g: any) => <TableRow key={g.id}><TableCell>{g.outcome_type}</TableCell><TableCell>{g.semester_text}</TableCell><TableCell>{g.target_attainment}%</TableCell><TableCell>{g.actual_attainment}%</TableCell><TableCell>{g.gap}%</TableCell><TableCell className="max-w-xs truncate">{g.action_taken || "—"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Continuous Improvement Cycles</h3>
                      {improvementCycles.length === 0 ? <p className="text-sm text-muted-foreground">No cycles</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Title</TableHead><TableHead>From–To</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>{improvementCycles.map((c: any) => <TableRow key={c.id}><TableCell>{c.programs?.name}</TableCell><TableCell>{c.title}</TableCell><TableCell>{c.cycle_from} – {c.cycle_to}</TableCell><TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CBCS TAB */}
          <TabsContent value="cbcs" className="space-y-4">
            {role === "student" && (
              <Card>
                <CardHeader>
                  <CardTitle>My Credits</CardTitle>
                  <p className="text-sm text-muted-foreground">Earned, transferred, MOOC, and total credits. Exit eligibility.</p>
                </CardHeader>
                <CardContent>
                  {(creditSummary.length > 0 ? creditSummary : [{ id: "default", credits_earned: 0, credits_transferred: 0, credits_mooc: 0, credits_total: 0 }]).map((s: any) => {
                    const total = parseFloat(s.credits_earned || 0) + parseFloat(s.credits_transferred || 0) + parseFloat(s.credits_mooc || 0);
                    const eligibleExits = exitPoints.filter((e: any) => parseFloat(e.min_credits) <= total);
                    return (
                      <div key={s.id} className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div><p className="text-sm text-muted-foreground">Earned</p><p className="text-2xl font-bold">{s.credits_earned ?? 0}</p></div>
                          <div><p className="text-sm text-muted-foreground">Transferred</p><p className="text-2xl font-bold">{s.credits_transferred ?? 0}</p></div>
                          <div><p className="text-sm text-muted-foreground">MOOC</p><p className="text-2xl font-bold">{s.credits_mooc ?? 0}</p></div>
                          <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-primary">{s.credits_total ?? total}</p></div>
                        </div>
                        {eligibleExits.length > 0 && (
                          <div><p className="text-sm font-medium mb-1">Eligible exit points</p><div className="flex flex-wrap gap-2">{eligibleExits.map((e: any) => <Badge key={e.id} variant="secondary">{e.exit_type}: {e.award_title || e.exit_type} ({e.min_credits} credits)</Badge>)}</div></div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Choice Based Credit System</CardTitle>
                    <p className="text-sm text-muted-foreground">Flexible credits, credit transfer, SWAYAM/NPTEL/MOOC, credit bank, multiple exit points, fast-track/extended programmes, equivalence mapping.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Credit Structure (per programme)</h3>
                        {canManage && <Button size="sm" onClick={() => setCbcsStructDialogOpen(true)}>Add Structure</Button>}
                      </div>
                      {creditStructures.length === 0 ? <p className="text-sm text-muted-foreground">No credit structures</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Min (Degree)</TableHead><TableHead>Cert</TableHead><TableHead>Diploma</TableHead><TableHead>Min/Max per Sem</TableHead><TableHead>Overload</TableHead></TableRow></TableHeader>
                        <TableBody>{creditStructures.map((s: any) => <TableRow key={s.id}><TableCell>{s.programs?.name}</TableCell><TableCell>{s.min_credits_degree}</TableCell><TableCell>{s.credits_certificate ?? "—"}</TableCell><TableCell>{s.credits_diploma ?? "—"}</TableCell><TableCell>{s.min_credits_per_semester}–{s.max_credits_per_semester}</TableCell><TableCell>{s.allow_overload ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Exit Points (Certificate 1yr, Diploma 2yr, Degree 3yr, Honours 4yr)</h3>
                      {exitPoints.length === 0 ? <p className="text-sm text-muted-foreground">No exit points</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Exit</TableHead><TableHead>Min Years</TableHead><TableHead>Min Credits</TableHead><TableHead>Award</TableHead></TableRow></TableHeader>
                        <TableBody>{exitPoints.map((e: any) => <TableRow key={e.id}><TableCell>{e.programs?.name}</TableCell><TableCell className="capitalize">{e.exit_type}</TableCell><TableCell>{e.min_years}</TableCell><TableCell>{e.min_credits}</TableCell><TableCell>{e.award_title || "—"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Programme Variants (Fast-track / Extended)</h3>
                      {variants.length === 0 ? <p className="text-sm text-muted-foreground">No variants</p> : (
                        <Table><TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Variant</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                        <TableBody>{variants.map((v: any) => <TableRow key={v.id}><TableCell>{v.programs?.name}</TableCell><TableCell className="capitalize">{v.variant_type?.replace("_", " ")}</TableCell><TableCell className="max-w-xs truncate">{v.description || "—"}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Credit Transfers (from other institutions)</h3>
                        {canManage && <Button size="sm" onClick={() => setTransferDialogOpen(true)}><Upload className="h-4 w-4 mr-1" />Add Transfer</Button>}
                      </div>
                      {creditTransfers.length === 0 ? <p className="text-sm text-muted-foreground">No transfers</p> : (
                        <Table><TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Institution</TableHead><TableHead>Course</TableHead><TableHead>Credits</TableHead><TableHead>Equivalent</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>{creditTransfers.map((t: any) => <TableRow key={t.id}>{canManage && <TableCell>{t.profiles?.full_name || getStudentName(t.student_id)}</TableCell>}<TableCell>{t.institution_name}</TableCell><TableCell className="max-w-[180px] truncate">{t.external_course_name}</TableCell><TableCell>{t.credits}</TableCell><TableCell>{t.courses?.code || "—"}</TableCell><TableCell><Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge></TableCell>{canManage && t.status === "pending" && <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => handleApproveTransfer(t.id, "approved")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => handleApproveTransfer(t.id, "rejected")}>Reject</Button></div></TableCell>}</TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">SWAYAM / NPTEL / MOOC Credits</h3>
                        {canManage && <Button size="sm" onClick={() => setMoocDialogOpen(true)}><Globe className="h-4 w-4 mr-1" />Add MOOC</Button>}
                      </div>
                      {moocCredits.length === 0 ? <p className="text-sm text-muted-foreground">No MOOC credits</p> : (
                        <Table><TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Platform</TableHead><TableHead>Course</TableHead><TableHead>Credits</TableHead><TableHead>Equivalent</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>{moocCredits.map((m: any) => <TableRow key={m.id}>{canManage && <TableCell>{m.profiles?.full_name || getStudentName(m.student_id)}</TableCell>}<TableCell>{m.platform}</TableCell><TableCell className="max-w-[180px] truncate">{m.course_name}</TableCell><TableCell>{m.credits}</TableCell><TableCell>{m.courses?.code || "—"}</TableCell><TableCell><Badge variant={m.status === "approved" ? "default" : m.status === "rejected" ? "destructive" : "secondary"}>{m.status}</Badge></TableCell>{canManage && m.status === "pending" && <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => handleApproveMooc(m.id, "approved")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => handleApproveMooc(m.id, "rejected")}>Reject</Button></div></TableCell>}</TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Student Credit Summary</h3>
                        {canManage && <Button size="sm" variant="outline" onClick={handleSyncCredits} disabled={syncing}>{syncing ? "Syncing..." : "Sync from Grades"}</Button>}
                      </div>
                      {creditSummary.length === 0 ? <p className="text-sm text-muted-foreground">No summary data</p> : (
                        <Table><TableHeader><TableRow><TableHead>{canManage ? "Student" : ""}</TableHead><TableHead>Earned</TableHead><TableHead>Transferred</TableHead><TableHead>MOOC</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                        <TableBody>{creditSummary.map((s: any) => <TableRow key={s.id}>{canManage && <TableCell>{s.profiles?.full_name || getStudentName(s.student_id)}</TableCell>}<TableCell>{s.credits_earned}</TableCell><TableCell>{s.credits_transferred ?? 0}</TableCell><TableCell>{s.credits_mooc ?? 0}</TableCell><TableCell className="font-medium">{s.credits_total ?? (parseFloat(s.credits_earned) + parseFloat(s.credits_transferred || 0) + parseFloat(s.credits_mooc || 0))}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Credit Equivalence Mapping</h3>
                      {equivalenceMappings.length === 0 ? <p className="text-sm text-muted-foreground">No mappings</p> : (
                        <Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>External</TableHead><TableHead>Internal Course</TableHead><TableHead>Credits</TableHead></TableRow></TableHeader>
                        <TableBody>{equivalenceMappings.map((e: any) => <TableRow key={e.id}><TableCell>{e.external_source}</TableCell><TableCell>{e.external_course_code || e.external_course_name || "—"}</TableCell><TableCell>{e.courses?.code} – {e.courses?.title}</TableCell><TableCell>{e.credits}</TableCell></TableRow>)}</TableBody></Table>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* PO Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Programme Outcome</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program</Label><Select value={poForm.program_id} onValueChange={(v) => setPoForm((p) => ({ ...p, program_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Code</Label><Input value={poForm.code} onChange={(e) => setPoForm((p) => ({ ...p, code: e.target.value }))} placeholder="PO1" /></div>
            <div><Label>Description</Label><Textarea value={poForm.description} onChange={(e) => setPoForm((p) => ({ ...p, description: e.target.value }))} placeholder="Outcome description" /></div>
            <div><Label>Target Attainment %</Label><Input type="number" value={poForm.target_attainment} onChange={(e) => setPoForm((p) => ({ ...p, target_attainment: e.target.value }))} /></div>
            <Button onClick={handleCreatePO} className="w-full">Add PO</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* PSO Dialog */}
      <Dialog open={psoDialogOpen} onOpenChange={setPsoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Programme Specific Outcome</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program</Label><Select value={psoForm.program_id} onValueChange={(v) => setPsoForm((p) => ({ ...p, program_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Code</Label><Input value={psoForm.code} onChange={(e) => setPsoForm((p) => ({ ...p, code: e.target.value }))} placeholder="PSO1" /></div>
            <div><Label>Description</Label><Textarea value={psoForm.description} onChange={(e) => setPsoForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Target Attainment %</Label><Input type="number" value={psoForm.target_attainment} onChange={(e) => setPsoForm((p) => ({ ...p, target_attainment: e.target.value }))} /></div>
            <Button onClick={handleCreatePSO} className="w-full">Add PSO</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* CO Dialog */}
      <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Course Outcome</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course</Label><Select value={coForm.course_id} onValueChange={(v) => setCoForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Code</Label><Input value={coForm.code} onChange={(e) => setCoForm((p) => ({ ...p, code: e.target.value }))} placeholder="CO1" /></div>
            <div><Label>Description</Label><Textarea value={coForm.description} onChange={(e) => setCoForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={handleCreateCO} className="w-full">Add CO</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Gap Action Dialog */}
      <Dialog open={gapDialogOpen} onOpenChange={setGapDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Gap Analysis / Action Taken</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Outcome Type</Label><Select value={gapForm.outcome_type} onValueChange={(v) => setGapForm((p) => ({ ...p, outcome_type: v, outcome_id: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CO">CO</SelectItem><SelectItem value="PO">PO</SelectItem><SelectItem value="PSO">PSO</SelectItem></SelectContent></Select></div>
            <div><Label>Outcome</Label><Select value={gapForm.outcome_id} onValueChange={(v) => setGapForm((p) => ({ ...p, outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger><SelectContent>{gapOutcomeOptions.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.code} – {(o.description || "").slice(0, 40)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Semester</Label><Input value={gapForm.semester_text} onChange={(e) => setGapForm((p) => ({ ...p, semester_text: e.target.value }))} placeholder="e.g. Fall 2026" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Target %</Label><Input type="number" value={gapForm.target_attainment} onChange={(e) => setGapForm((p) => ({ ...p, target_attainment: e.target.value }))} /></div><div><Label>Actual %</Label><Input type="number" value={gapForm.actual_attainment} onChange={(e) => setGapForm((p) => ({ ...p, actual_attainment: e.target.value }))} /></div></div>
            <div><Label>Action Taken</Label><Textarea value={gapForm.action_taken} onChange={(e) => setGapForm((p) => ({ ...p, action_taken: e.target.value }))} placeholder="Remedial action for weak CO/PO" /></div>
            <Button onClick={handleCreateGapAction} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* CBCS Structure Dialog */}
      <Dialog open={cbcsStructDialogOpen} onOpenChange={setCbcsStructDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Credit Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program</Label><Select value={cbcsStructForm.program_id} onValueChange={(v) => setCbcsStructForm((p) => ({ ...p, program_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{programs.filter((p) => !creditStructures.some((s: any) => s.program_id === p.id)).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Min Credits (Degree)</Label><Input type="number" value={cbcsStructForm.min_credits_degree} onChange={(e) => setCbcsStructForm((p) => ({ ...p, min_credits_degree: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Credits (Certificate 1yr)</Label><Input type="number" value={cbcsStructForm.credits_certificate} onChange={(e) => setCbcsStructForm((p) => ({ ...p, credits_certificate: e.target.value }))} placeholder="e.g. 40" /></div><div><Label>Credits (Diploma 2yr)</Label><Input type="number" value={cbcsStructForm.credits_diploma} onChange={(e) => setCbcsStructForm((p) => ({ ...p, credits_diploma: e.target.value }))} placeholder="e.g. 80" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Min Credits/Sem</Label><Input type="number" value={cbcsStructForm.min_credits_per_semester} onChange={(e) => setCbcsStructForm((p) => ({ ...p, min_credits_per_semester: e.target.value }))} /></div><div><Label>Max Credits/Sem</Label><Input type="number" value={cbcsStructForm.max_credits_per_semester} onChange={(e) => setCbcsStructForm((p) => ({ ...p, max_credits_per_semester: e.target.value }))} /></div></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={cbcsStructForm.allow_overload} onChange={(e) => setCbcsStructForm((p) => ({ ...p, allow_overload: e.target.checked }))} /><Label>Allow overloading (fast-track)</Label></div>
            <Button onClick={handleCreateCbcsStruct} className="w-full">Add Structure</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Credit Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Credit Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Student</Label><Select value={transferForm.student_id} onValueChange={(v) => setTransferForm((p) => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Institution Name</Label><Input value={transferForm.institution_name} onChange={(e) => setTransferForm((p) => ({ ...p, institution_name: e.target.value }))} placeholder="Other university" /></div>
            <div><Label>External Course Name</Label><Input value={transferForm.external_course_name} onChange={(e) => setTransferForm((p) => ({ ...p, external_course_name: e.target.value }))} /></div>
            <div><Label>Credits</Label><Input type="number" step="0.5" value={transferForm.credits} onChange={(e) => setTransferForm((p) => ({ ...p, credits: e.target.value }))} /></div>
            <div><Label>Equivalent Course (optional)</Label><Select value={transferForm.equivalent_course_id} onValueChange={(v) => setTransferForm((p) => ({ ...p, equivalent_course_id: v }))}><SelectTrigger><SelectValue placeholder="Map to internal course" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleCreateTransfer} className="w-full">Add Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* MOOC Dialog */}
      <Dialog open={moocDialogOpen} onOpenChange={setMoocDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add MOOC / SWAYAM / NPTEL Credit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Student</Label><Select value={moocForm.student_id} onValueChange={(v) => setMoocForm((p) => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Platform</Label><Select value={moocForm.platform} onValueChange={(v) => setMoocForm((p) => ({ ...p, platform: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SWAYAM">SWAYAM</SelectItem><SelectItem value="NPTEL">NPTEL</SelectItem><SelectItem value="Coursera">Coursera</SelectItem><SelectItem value="edX">edX</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label>Course Name</Label><Input value={moocForm.course_name} onChange={(e) => setMoocForm((p) => ({ ...p, course_name: e.target.value }))} /></div>
            <div><Label>Credits</Label><Input type="number" step="0.5" value={moocForm.credits} onChange={(e) => setMoocForm((p) => ({ ...p, credits: e.target.value }))} /></div>
            <div><Label>Equivalent Course (optional)</Label><Select value={moocForm.equivalent_course_id} onValueChange={(v) => setMoocForm((p) => ({ ...p, equivalent_course_id: v }))}><SelectTrigger><SelectValue placeholder="Map to internal course" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleCreateMooc} className="w-full">Add MOOC Credit</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CO-PO Mapping Dialog */}
      <Dialog open={coPoDialogOpen} onOpenChange={setCoPoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add CO–PO Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course Outcome</Label><Select value={coPoForm.course_outcome_id} onValueChange={(v) => setCoPoForm((p) => ({ ...p, course_outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Select CO" /></SelectTrigger><SelectContent>{cos.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} ({c.courses?.code})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Programme Outcome</Label><Select value={coPoForm.programme_outcome_id} onValueChange={(v) => setCoPoForm((p) => ({ ...p, programme_outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger><SelectContent>{pos.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} ({p.programs?.name})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Strength</Label><Select value={coPoForm.strength} onValueChange={(v) => setCoPoForm((p) => ({ ...p, strength: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent></Select></div>
            <Button onClick={handleCreateCoPoMapping} className="w-full">Add Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* CO-PSO Mapping Dialog */}
      <Dialog open={coPsoDialogOpen} onOpenChange={setCoPsoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add CO–PSO Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course Outcome</Label><Select value={coPsoForm.course_outcome_id} onValueChange={(v) => setCoPsoForm((p) => ({ ...p, course_outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Select CO" /></SelectTrigger><SelectContent>{cos.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} ({c.courses?.code})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Programme Specific Outcome</Label><Select value={coPsoForm.pso_id} onValueChange={(v) => setCoPsoForm((p) => ({ ...p, pso_id: v }))}><SelectTrigger><SelectValue placeholder="Select PSO" /></SelectTrigger><SelectContent>{psos.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} ({p.programs?.name})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Strength</Label><Select value={coPsoForm.strength} onValueChange={(v) => setCoPsoForm((p) => ({ ...p, strength: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent></Select></div>
            <Button onClick={handleCreateCoPsoMapping} className="w-full">Add Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Assessment-CO Mapping Dialog */}
      <Dialog open={assessCoDialogOpen} onOpenChange={setAssessCoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Map Assessment Component to CO</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Assessment Component</Label><Select value={assessCoForm.component_definition_id} onValueChange={(v) => setAssessCoForm((p) => ({ ...p, component_definition_id: v }))}><SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger><SelectContent>{componentDefs.map((c) => <SelectItem key={c.id} value={c.id}>{c.courses?.code} – {c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Course Outcome</Label><Select value={assessCoForm.course_outcome_id} onValueChange={(v) => setAssessCoForm((p) => ({ ...p, course_outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Select CO" /></SelectTrigger><SelectContent>{cos.filter((co) => componentDefs.some((cd) => cd.course_id === co.course_id)).map((c) => <SelectItem key={c.id} value={c.id}>{c.code} ({c.courses?.code})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Weight %</Label><Input type="number" value={assessCoForm.weight_percent} onChange={(e) => setAssessCoForm((p) => ({ ...p, weight_percent: e.target.value }))} /></div>
            <Button onClick={handleCreateAssessCoMapping} className="w-full">Add Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Compute CO Attainment Dialog */}
      <Dialog open={computeDialogOpen} onOpenChange={setComputeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compute CO Attainment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Compute CO attainment from component marks for a course and semester.</p>
          <div className="space-y-4">
            <div><Label>Course</Label><Select value={computeAttainmentForm.course_id} onValueChange={(v) => setComputeAttainmentForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Semester</Label><Input value={computeAttainmentForm.semester_text} onChange={(e) => setComputeAttainmentForm((p) => ({ ...p, semester_text: e.target.value }))} placeholder="e.g. Fall 2026" /></div>
            <div><Label>Academic Year (optional)</Label><Select value={computeAttainmentForm.academic_year_id} onValueChange={(v) => setComputeAttainmentForm((p) => ({ ...p, academic_year_id: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleComputeCoAttainment} className="w-full">Compute Attainment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
