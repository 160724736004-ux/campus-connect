import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Eye, Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import StudentDocuments from "./StudentDocuments";
import StudentStatusManager from "./StudentStatusManager";
import { CustomFieldsRenderer } from "@/components/custom-fields/CustomFieldsRenderer";

const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const QUOTAS = ["convener", "management", "nri", "sports", "minority"];
const STATUSES = ["active", "detained", "discontinued", "suspended", "passout", "alumni"];

interface StudentProfileProps {
  onRefresh?: () => void;
}

export default function StudentProfile({ onRefresh }: StudentProfileProps) {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<any | null>(null);
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [statusDialogStudent, setStatusDialogStudent] = useState<any | null>(null);
  const [docsStudent, setDocsStudent] = useState<any | null>(null);

  const [form, setForm] = useState({
    full_name: "", phone: "", student_id_number: "", admission_number: "",
    department_id: "", program_id: "", year_of_study: "1", status: "active",
    date_of_birth: "", gender: "", blood_group: "", aadhar_number: "",
    category: "", admission_quota: "convener",
    father_name: "", father_mobile: "", mother_name: "", mother_mobile: "",
    guardian_name: "", guardian_mobile: "",
    permanent_address: "", communication_address: "",
    admission_type: "regular", fee_category: "regular",
    previous_education: "", scholarship_status: "",
    batch_id: "", section_id: "",
    mentor_id: "", hostel_allocation: "", transport_allocation: "",
    library_card_number: "",
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sRes, dRes, pRes, bRes, secRes, rRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("departments").select("*"),
      supabase.from("programs").select("*"),
      supabase.from("batches" as any).select("*"),
      supabase.from("sections" as any).select("*"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
    ]);
    const studentIds = new Set((rRes.data || []).map((r: any) => r.user_id));
    setStudents((sRes.data || []).filter((p: any) => studentIds.has(p.id)));
    setDepartments(dRes.data || []);
    setPrograms(pRes.data || []);
    setBatches((bRes.data as any[]) || []);
    setSections((secRes.data as any[]) || []);
    setLoading(false);
  };

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.admission_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openEdit = (student: any) => {
    setEditStudent(student);
    setForm({
      full_name: student.full_name, phone: student.phone || "",
      student_id_number: student.student_id_number || "",
      admission_number: student.admission_number || "",
      department_id: student.department_id || "", program_id: student.program_id || "",
      year_of_study: String(student.year_of_study || 1), status: student.status,
      date_of_birth: student.date_of_birth || "", gender: student.gender || "",
      blood_group: student.blood_group || "", aadhar_number: student.aadhar_number || "",
      category: student.category || "", admission_quota: student.admission_quota || "convener",
      father_name: student.father_name || "", father_mobile: student.father_mobile || "",
      mother_name: student.mother_name || "", mother_mobile: student.mother_mobile || "",
      guardian_name: student.guardian_name || "", guardian_mobile: student.guardian_mobile || "",
      permanent_address: student.permanent_address || "",
      communication_address: student.communication_address || "",
      admission_type: student.admission_type || "regular",
      fee_category: student.fee_category || "regular",
      previous_education: student.previous_education || "",
      scholarship_status: student.scholarship_status || "",
      batch_id: student.batch_id || "", section_id: student.section_id || "",
      mentor_id: student.mentor_id || "",
      hostel_allocation: student.hostel_allocation || "",
      transport_allocation: student.transport_allocation || "",
      library_card_number: student.library_card_number || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editStudent) return;
    const payload: any = {
      full_name: form.full_name, phone: form.phone || null,
      student_id_number: form.student_id_number || null,
      admission_number: form.admission_number || null,
      department_id: form.department_id || null, program_id: form.program_id || null,
      year_of_study: parseInt(form.year_of_study) || null, status: form.status,
      date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      blood_group: form.blood_group || null, aadhar_number: form.aadhar_number || null,
      category: form.category || null, admission_quota: form.admission_quota,
      father_name: form.father_name || null, father_mobile: form.father_mobile || null,
      mother_name: form.mother_name || null, mother_mobile: form.mother_mobile || null,
      guardian_name: form.guardian_name || null, guardian_mobile: form.guardian_mobile || null,
      permanent_address: form.permanent_address || null,
      communication_address: form.communication_address || null,
      admission_type: form.admission_type, fee_category: form.fee_category,
      previous_education: form.previous_education || null,
      scholarship_status: form.scholarship_status || null,
      batch_id: form.batch_id || null, section_id: form.section_id || null,
      mentor_id: form.mentor_id || null,
      hostel_allocation: form.hostel_allocation || null,
      transport_allocation: form.transport_allocation || null,
      library_card_number: form.library_card_number || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", editStudent.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Student updated" }); setDialogOpen(false); setEditStudent(null); fetchData();
  };

  const getDeptName = (id: string | null) => departments.find(d => d.id === id)?.name || "—";
  const getProgName = (id: string | null) => programs.find(p => p.id === id)?.name || "—";
  const getBatchName = (id: string | null) => batches.find((b: any) => b.id === id)?.name || "—";
  const getSectionName = (id: string | null) => sections.find((s: any) => s.id === id)?.name || "—";
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "suspended": case "discontinued": return "destructive";
      case "passout": case "alumni": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, roll no, or admission no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead><TableHead>Adm No</TableHead><TableHead>Name</TableHead>
                <TableHead>Program</TableHead><TableHead>Batch</TableHead><TableHead>Section</TableHead>
                <TableHead>Year</TableHead><TableHead>Status</TableHead>
                {role === "admin" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.student_id_number || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{s.admission_number || "—"}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{getProgName(s.program_id)}</TableCell>
                  <TableCell>{getBatchName(s.batch_id)}</TableCell>
                  <TableCell>{getSectionName(s.section_id)}</TableCell>
                  <TableCell>{s.year_of_study || "—"}</TableCell>
                  <TableCell><Badge variant={statusColor(s.status) as any}>{s.status}</Badge></TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewStudent(s)} title="View"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDocsStudent(s)} title="Documents"><Upload className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Student Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Student Profile — {viewStudent?.full_name}</DialogTitle></DialogHeader>
          {viewStudent && (
            <Tabs defaultValue="personal">
              <TabsList className="w-full flex-wrap">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="parents">Parents/Guardian</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
                <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                <TabsTrigger value="status">Status History</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewStudent.full_name}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewStudent.email}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewStudent.phone || "—"}</span></div>
                  <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{viewStudent.date_of_birth || "—"}</span></div>
                  <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium">{viewStudent.gender || "—"}</span></div>
                  <div><span className="text-muted-foreground">Blood Group:</span> <span className="font-medium">{viewStudent.blood_group || "—"}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{viewStudent.category || "—"}</span></div>
                  <div><span className="text-muted-foreground">Aadhar:</span> <span className="font-medium">{viewStudent.aadhar_number || "—"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="academic" className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Roll No:</span> <span className="font-mono font-medium">{viewStudent.student_id_number || "—"}</span></div>
                  <div><span className="text-muted-foreground">Admission No:</span> <span className="font-mono font-medium">{viewStudent.admission_number || "—"}</span></div>
                  <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{getDeptName(viewStudent.department_id)}</span></div>
                  <div><span className="text-muted-foreground">Program:</span> <span className="font-medium">{getProgName(viewStudent.program_id)}</span></div>
                  <div><span className="text-muted-foreground">Batch:</span> <span className="font-medium">{getBatchName(viewStudent.batch_id)}</span></div>
                  <div><span className="text-muted-foreground">Section:</span> <span className="font-medium">{getSectionName(viewStudent.section_id)}</span></div>
                  <div><span className="text-muted-foreground">Year:</span> <span className="font-medium">{viewStudent.year_of_study || "—"}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(viewStudent.status) as any}>{viewStudent.status}</Badge></div>
                  <div><span className="text-muted-foreground">Admission Type:</span> <span className="font-medium capitalize">{viewStudent.admission_type || "regular"}</span></div>
                  <div><span className="text-muted-foreground">Quota:</span> <span className="font-medium capitalize">{viewStudent.admission_quota || "—"}</span></div>
                  <div><span className="text-muted-foreground">Fee Category:</span> <span className="font-medium capitalize">{viewStudent.fee_category || "regular"}</span></div>
                  <div><span className="text-muted-foreground">Admission Date:</span> <span className="font-medium">{viewStudent.admission_date || "—"}</span></div>
                  <div><span className="text-muted-foreground">Credits Earned:</span> <span className="font-medium">{viewStudent.credits_earned || 0}</span></div>
                  <div><span className="text-muted-foreground">Backlogs:</span> <span className="font-medium">{viewStudent.backlogs || 0}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="parents" className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Father:</span> <span className="font-medium">{viewStudent.father_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Father Mobile:</span> <span className="font-medium">{viewStudent.father_mobile || "—"}</span></div>
                  <div><span className="text-muted-foreground">Mother:</span> <span className="font-medium">{viewStudent.mother_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Mother Mobile:</span> <span className="font-medium">{viewStudent.mother_mobile || "—"}</span></div>
                  <div><span className="text-muted-foreground">Guardian:</span> <span className="font-medium">{viewStudent.guardian_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Guardian Mobile:</span> <span className="font-medium">{viewStudent.guardian_mobile || "—"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="address" className="space-y-2 text-sm">
                <div className="space-y-3">
                  <div><span className="text-muted-foreground">Permanent Address:</span><p className="font-medium mt-1">{viewStudent.permanent_address || "—"}</p></div>
                  <div><span className="text-muted-foreground">Communication Address:</span><p className="font-medium mt-1">{viewStudent.communication_address || "—"}</p></div>
                </div>
              </TabsContent>
              <TabsContent value="other" className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Previous Education:</span> <span className="font-medium">{viewStudent.previous_education || "—"}</span></div>
                  <div><span className="text-muted-foreground">Scholarship:</span> <span className="font-medium">{viewStudent.scholarship_status || "—"}</span></div>
                  <div><span className="text-muted-foreground">Hostel:</span> <span className="font-medium">{viewStudent.hostel_allocation || "—"}</span></div>
                  <div><span className="text-muted-foreground">Transport:</span> <span className="font-medium">{viewStudent.transport_allocation || "—"}</span></div>
                  <div><span className="text-muted-foreground">Library Card:</span> <span className="font-medium">{viewStudent.library_card_number || "—"}</span></div>
                  <div><span className="text-muted-foreground">ID Card:</span> <span className="font-medium">{viewStudent.id_card_generated ? "Generated" : "Not Generated"}</span></div>
                </div>
              </TabsContent>
              <TabsContent value="custom">
                <CustomFieldsRenderer entityType="student" entityId={viewStudent.id} readOnly={role !== "admin"} />
              </TabsContent>
              <TabsContent value="status">
                <StudentStatusManager studentId={viewStudent.id} currentStatus={viewStudent.status} onStatusChange={() => { fetchData(); setViewStudent(null); }} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="parents">Parents</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
              <TabsTrigger value="custom">Custom Fields</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={e => update("full_name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => update("gender", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Blood Group</Label><Input value={form.blood_group} onChange={e => update("blood_group", e.target.value)} placeholder="A+" /></div>
                <div className="space-y-2"><Label>Aadhar Number</Label><Input value={form.aadhar_number} onChange={e => update("aadhar_number", e.target.value)} placeholder="12 digit number" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => update("category", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Admission Quota</Label>
                  <Select value={form.admission_quota} onValueChange={v => update("admission_quota", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{QUOTAS.map(q => <SelectItem key={q} value={q} className="capitalize">{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Roll Number</Label><Input value={form.student_id_number} onChange={e => update("student_id_number", e.target.value)} /></div>
                <div className="space-y-2"><Label>Admission Number</Label><Input value={form.admission_number} onChange={e => update("admission_number", e.target.value)} /></div>
                <div className="space-y-2"><Label>Year of Study</Label><Input type="number" min="1" max="8" value={form.year_of_study} onChange={e => update("year_of_study", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v => update("department_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Program</Label>
                  <Select value={form.program_id} onValueChange={v => update("program_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Batch</Label>
                  <Select value={form.batch_id} onValueChange={v => update("batch_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{batches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Section</Label>
                  <Select value={form.section_id} onValueChange={v => update("section_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{sections.filter((s: any) => !form.batch_id || s.batch_id === form.batch_id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Admission Type</Label>
                  <Select value={form.admission_type} onValueChange={v => update("admission_type", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="lateral">Lateral Entry</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Fee Category</Label>
                  <Select value={form.fee_category} onValueChange={v => update("fee_category", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="management">Management</SelectItem><SelectItem value="nri">NRI</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="parents" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Father Name</Label><Input value={form.father_name} onChange={e => update("father_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>Father Mobile</Label><Input value={form.father_mobile} onChange={e => update("father_mobile", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Mother Name</Label><Input value={form.mother_name} onChange={e => update("mother_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>Mother Mobile</Label><Input value={form.mother_mobile} onChange={e => update("mother_mobile", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Guardian Name</Label><Input value={form.guardian_name} onChange={e => update("guardian_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>Guardian Mobile</Label><Input value={form.guardian_mobile} onChange={e => update("guardian_mobile", e.target.value)} /></div>
              </div>
            </TabsContent>
            <TabsContent value="address" className="space-y-4">
              <div className="space-y-2"><Label>Permanent Address</Label><Textarea value={form.permanent_address} onChange={e => update("permanent_address", e.target.value)} /></div>
              <div className="space-y-2"><Label>Communication Address</Label><Textarea value={form.communication_address} onChange={e => update("communication_address", e.target.value)} /></div>
            </TabsContent>
            <TabsContent value="other" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Previous Education</Label><Input value={form.previous_education} onChange={e => update("previous_education", e.target.value)} /></div>
                <div className="space-y-2"><Label>Scholarship Status</Label><Input value={form.scholarship_status} onChange={e => update("scholarship_status", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Hostel Allocation</Label><Input value={form.hostel_allocation} onChange={e => update("hostel_allocation", e.target.value)} placeholder="e.g. Room 201, Block A" /></div>
                <div className="space-y-2"><Label>Transport Allocation</Label><Input value={form.transport_allocation} onChange={e => update("transport_allocation", e.target.value)} placeholder="e.g. Route 5" /></div>
              </div>
              <div className="space-y-2"><Label>Library Card Number</Label><Input value={form.library_card_number} onChange={e => update("library_card_number", e.target.value)} /></div>
            </TabsContent>
            <TabsContent value="custom" className="space-y-4">
              {editStudent && <CustomFieldsRenderer entityType="student" entityId={editStudent.id} />}
            </TabsContent>
          </Tabs>
          <Button onClick={handleSave} className="w-full mt-4">Save Changes</Button>
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={!!docsStudent} onOpenChange={() => setDocsStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documents — {docsStudent?.full_name}</DialogTitle></DialogHeader>
          {docsStudent && <StudentDocuments studentId={docsStudent.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
