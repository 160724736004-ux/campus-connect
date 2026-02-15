import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, UserPlus, ArrowRightCircle } from "lucide-react";

const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const QUOTAS = ["convener", "management", "nri", "sports", "minority"];
const GENDERS = ["Male", "Female", "Other"];
const ADMISSION_STATUSES = ["applied", "verified", "merit_listed", "seat_allotted", "fee_paid", "confirmed", "rejected", "cancelled"];

export default function StudentAdmission() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewAdmission, setViewAdmission] = useState<any | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<any | null>(null);

  // Admission form state
  const [form, setForm] = useState({
    applicant_name: "", email: "", phone: "", date_of_birth: "",
    gender: "", category: "", admission_quota: "convener",
    program_id: "", academic_year_id: "", merit_score: "",
    remarks: "",
  });

  // Convert to student form
  const [convertForm, setConvertForm] = useState({
    batch_id: "", section_id: "", student_id_number: "",
    admission_type: "regular", fee_category: "regular",
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, pRes, ayRes, bRes, sRes] = await Promise.all([
      supabase.from("admissions" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("programs").select("*").order("name"),
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("batches" as any).select("*").order("admission_year", { ascending: false }),
      supabase.from("sections" as any).select("*").order("name"),
    ]);
    setAdmissions((aRes.data as any[]) || []);
    setPrograms(pRes.data || []);
    setAcademicYears((ayRes.data as any[]) || []);
    setBatches((bRes.data as any[]) || []);
    setSections((sRes.data as any[]) || []);
    setLoading(false);
  };

  const filtered = admissions.filter(a => {
    const matchSearch = a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.application_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getProgName = (id: string | null) => programs.find(p => p.id === id)?.name || "—";
  const getAcadName = (id: string | null) => academicYears.find(a => a.id === id)?.name || "—";
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const updateConvert = (key: string, value: string) => setConvertForm(prev => ({ ...prev, [key]: value }));

  const generateAppNumber = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
    return `${year}APP${rand}`;
  };

  const handleCreate = async () => {
    if (!form.applicant_name || !form.email || !form.program_id) {
      toast({ title: "Missing fields", description: "Name, email, and program are required", variant: "destructive" });
      return;
    }
    const appNum = generateAppNumber();
    const payload = {
      applicant_name: form.applicant_name, email: form.email,
      phone: form.phone || null, date_of_birth: form.date_of_birth || null,
      gender: form.gender || null, category: form.category || null,
      admission_quota: form.admission_quota, program_id: form.program_id,
      academic_year_id: form.academic_year_id || null,
      merit_score: form.merit_score ? parseFloat(form.merit_score) : null,
      remarks: form.remarks || null, application_number: appNum,
    };
    const { error } = await supabase.from("admissions" as any).insert(payload as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Admission created", description: `Application #${appNum}` });
    setDialogOpen(false);
    setForm({ applicant_name: "", email: "", phone: "", date_of_birth: "", gender: "", category: "", admission_quota: "convener", program_id: "", academic_year_id: "", merit_score: "", remarks: "" });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("admissions" as any).update({ status } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Status updated to ${status}` });
    fetchData();
  };

  const openConvert = (admission: any) => {
    setConvertTarget(admission);
    setConvertForm({ batch_id: "", section_id: "", student_id_number: "", admission_type: "regular", fee_category: "regular" });
    setConvertDialogOpen(true);
  };

  const handleConvertToStudent = async () => {
    if (!convertTarget) return;
    // Sign up the student
    const tempPassword = `Student@${Date.now().toString(36)}`;
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: convertTarget.email,
      password: tempPassword,
      options: { data: { full_name: convertTarget.applicant_name } },
    });

    if (authErr) {
      toast({ title: "Error creating account", description: authErr.message, variant: "destructive" });
      return;
    }

    if (authData.user) {
      // Update profile with admission data
      const prog = programs.find(p => p.id === convertTarget.program_id);
      const profilePayload: any = {
        full_name: convertTarget.applicant_name, phone: convertTarget.phone || null,
        date_of_birth: convertTarget.date_of_birth || null, gender: convertTarget.gender || null,
        category: convertTarget.category || null,
        program_id: convertTarget.program_id || null,
        department_id: prog?.department_id || null,
        batch_id: convertForm.batch_id || null,
        section_id: convertForm.section_id || null,
        student_id_number: convertForm.student_id_number || null,
        admission_type: convertForm.admission_type,
        fee_category: convertForm.fee_category,
        admission_quota: convertTarget.admission_quota,
        admission_date: new Date().toISOString().split("T")[0],
        year_of_study: 1,
      };

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      await supabase.from("profiles").update(profilePayload).eq("id", authData.user.id);

      // Mark admission as converted
      await supabase.from("admissions" as any).update({
        status: "confirmed", converted_to_student: true,
        student_profile_id: authData.user.id,
      } as any).eq("id", convertTarget.id);
    }

    toast({ title: "Student account created", description: `Credentials: ${convertTarget.email} / ${tempPassword}` });
    setConvertDialogOpen(false);
    fetchData();
  };

  // Generate merit list
  const generateMeritList = async () => {
    const eligible = admissions.filter(a => a.status === "verified" && a.merit_score != null);
    if (eligible.length === 0) { toast({ title: "No eligible applicants", variant: "destructive" }); return; }
    const sorted = [...eligible].sort((a, b) => (b.merit_score || 0) - (a.merit_score || 0));
    for (let i = 0; i < sorted.length; i++) {
      await supabase.from("admissions" as any).update({
        merit_rank: i + 1, status: "merit_listed",
      } as any).eq("id", sorted[i].id);
    }
    toast({ title: "Merit list generated", description: `${sorted.length} applicants ranked` });
    fetchData();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "default";
      case "rejected": case "cancelled": return "destructive";
      case "merit_listed": case "seat_allotted": case "fee_paid": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Student Admissions</h2>
          <p className="text-sm text-muted-foreground">Manage admission applications and convert to student accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateMeritList}>Generate Merit List</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Admission</Button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or app number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ADMISSION_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App #</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead>
                <TableHead>Program</TableHead><TableHead>Quota</TableHead><TableHead>Merit</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No admissions found</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.application_number || "—"}</TableCell>
                  <TableCell className="font-medium">{a.applicant_name}</TableCell>
                  <TableCell className="text-sm">{a.email}</TableCell>
                  <TableCell>{getProgName(a.program_id)}</TableCell>
                  <TableCell className="capitalize">{a.admission_quota}</TableCell>
                  <TableCell>{a.merit_rank ? `#${a.merit_rank} (${a.merit_score})` : a.merit_score || "—"}</TableCell>
                  <TableCell><Badge variant={statusColor(a.status) as any}>{a.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewAdmission(a)}><Eye className="h-4 w-4" /></Button>
                      {a.status === "applied" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, "verified")}>Verify</Button>
                      )}
                      {a.status === "merit_listed" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, "seat_allotted")}>Allot Seat</Button>
                      )}
                      {a.status === "seat_allotted" && (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, "fee_paid")}>Fee Paid</Button>
                      )}
                      {(a.status === "fee_paid" || a.status === "confirmed") && !a.converted_to_student && (
                        <Button variant="ghost" size="sm" onClick={() => openConvert(a)}>
                          <ArrowRightCircle className="h-4 w-4 mr-1" />Convert
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Admission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Admission Application</DialogTitle></DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="w-full">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-4">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={form.applicant_name} onChange={e => update("applicant_name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => update("email", e.target.value)} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} /></div>
                <div className="space-y-2"><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => update("gender", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => update("category", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Program *</Label>
                  <Select value={form.program_id} onValueChange={v => update("program_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Academic Year</Label>
                  <Select value={form.academic_year_id} onValueChange={v => update("academic_year_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Admission Quota</Label>
                  <Select value={form.admission_quota} onValueChange={v => update("admission_quota", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{QUOTAS.map(q => <SelectItem key={q} value={q} className="capitalize">{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Merit Score</Label><Input type="number" step="0.01" value={form.merit_score} onChange={e => update("merit_score", e.target.value)} placeholder="e.g. 95.5" /></div>
              </div>
              <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => update("remarks", e.target.value)} /></div>
            </TabsContent>
          </Tabs>
          <Button onClick={handleCreate} className="w-full mt-4"><UserPlus className="h-4 w-4 mr-2" />Create Admission</Button>
        </DialogContent>
      </Dialog>

      {/* View Admission Dialog */}
      <Dialog open={!!viewAdmission} onOpenChange={() => setViewAdmission(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Admission Details</DialogTitle></DialogHeader>
          {viewAdmission && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Application #:</span> <span className="font-mono font-medium">{viewAdmission.application_number}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(viewAdmission.status) as any}>{viewAdmission.status.replace("_", " ")}</Badge></div>
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewAdmission.applicant_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewAdmission.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewAdmission.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{viewAdmission.date_of_birth || "—"}</span></div>
                <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium">{viewAdmission.gender || "—"}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{viewAdmission.category || "—"}</span></div>
                <div><span className="text-muted-foreground">Program:</span> <span className="font-medium">{getProgName(viewAdmission.program_id)}</span></div>
                <div><span className="text-muted-foreground">Quota:</span> <span className="font-medium capitalize">{viewAdmission.admission_quota}</span></div>
                <div><span className="text-muted-foreground">Merit Score:</span> <span className="font-medium">{viewAdmission.merit_score || "—"}</span></div>
                <div><span className="text-muted-foreground">Merit Rank:</span> <span className="font-medium">{viewAdmission.merit_rank ? `#${viewAdmission.merit_rank}` : "—"}</span></div>
                <div><span className="text-muted-foreground">Converted:</span> <span className="font-medium">{viewAdmission.converted_to_student ? "Yes" : "No"}</span></div>
              </div>
              {viewAdmission.remarks && <div><span className="text-muted-foreground">Remarks:</span> <p className="mt-1">{viewAdmission.remarks}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Student Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Convert to Student</DialogTitle></DialogHeader>
          {convertTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Converting <strong>{convertTarget.applicant_name}</strong> ({convertTarget.email}) to a student account.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Roll Number</Label><Input value={convertForm.student_id_number} onChange={e => updateConvert("student_id_number", e.target.value)} placeholder="e.g. 24CSE001" /></div>
                <div className="space-y-2"><Label>Admission Type</Label>
                  <Select value={convertForm.admission_type} onValueChange={v => updateConvert("admission_type", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="lateral">Lateral Entry</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Batch</Label>
                  <Select value={convertForm.batch_id} onValueChange={v => updateConvert("batch_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{batches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Section</Label>
                  <Select value={convertForm.section_id} onValueChange={v => updateConvert("section_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{sections.filter((s: any) => !convertForm.batch_id || s.batch_id === convertForm.batch_id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Fee Category</Label>
                <Select value={convertForm.fee_category} onValueChange={v => updateConvert("fee_category", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="management">Management</SelectItem><SelectItem value="nri">NRI</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleConvertToStudent} className="w-full"><ArrowRightCircle className="h-4 w-4 mr-2" />Create Student Account</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
