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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users } from "lucide-react";

export default function Batches() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch dialog
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [bName, setBName] = useState("");
  const [bProgram, setBProgram] = useState("");
  const [bAdmYear, setBAdmYear] = useState("");
  const [bPassYear, setBPassYear] = useState("");
  const [bAcadYear, setBAcadYear] = useState("");
  const [bIntake, setBIntake] = useState("60");
  const [bCurrentYear, setBCurrentYear] = useState("1");

  // Section dialog
  const [secDialogOpen, setSecDialogOpen] = useState(false);
  const [sEditId, setSEditId] = useState<string | null>(null);
  const [sBatchId, setSBatchId] = useState("");
  const [sName, setSName] = useState("");
  const [sYear, setSYear] = useState("1");
  const [sSemester, setSSemester] = useState("1");
  const [sCapacity, setSCapacity] = useState("60");
  const [sClassroom, setSClassroom] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [bRes, sRes, pRes, aRes] = await Promise.all([
      supabase.from("batches" as any).select("*").order("admission_year", { ascending: false }),
      supabase.from("sections" as any).select("*").order("name"),
      supabase.from("programs").select("*").order("name"),
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
    ]);
    setBatches((bRes.data as any[]) || []);
    setSections((sRes.data as any[]) || []);
    setPrograms(pRes.data || []);
    setAcademicYears((aRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getProgName = (id: string) => programs.find(p => p.id === id)?.name || "—";
  const getAcadName = (id: string) => academicYears.find(a => a.id === id)?.name || "—";

  // Batch CRUD
  const openCreateBatch = () => { setBEditId(null); setBName(""); setBProgram(""); setBAdmYear(""); setBPassYear(""); setBAcadYear(""); setBIntake("60"); setBCurrentYear("1"); setBatchDialogOpen(true); };
  const openEditBatch = (b: any) => { setBEditId(b.id); setBName(b.name); setBProgram(b.program_id); setBAdmYear(String(b.admission_year)); setBPassYear(String(b.passout_year)); setBAcadYear(b.academic_year_id || ""); setBIntake(String(b.total_intake)); setBCurrentYear(String(b.current_year)); setBatchDialogOpen(true); };

  const handleSaveBatch = async () => {
    if (!bName || !bProgram || !bAdmYear || !bPassYear) return;
    const payload = { name: bName, program_id: bProgram, admission_year: parseInt(bAdmYear), passout_year: parseInt(bPassYear), academic_year_id: bAcadYear || null, total_intake: parseInt(bIntake), current_year: parseInt(bCurrentYear) };
    if (bEditId) {
      const { error } = await supabase.from("batches" as any).update(payload as any).eq("id", bEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("batches" as any).insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Batch saved" }); setBatchDialogOpen(false); fetchData();
  };

  const deleteBatch = async (id: string) => {
    const { error } = await supabase.from("batches" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Batch deleted" }); fetchData();
  };

  // Section CRUD
  const openCreateSection = (batchId?: string) => { setSEditId(null); setSBatchId(batchId || ""); setSName(""); setSYear("1"); setSSemester("1"); setSCapacity("60"); setSClassroom(""); setSecDialogOpen(true); };
  const openEditSection = (s: any) => { setSEditId(s.id); setSBatchId(s.batch_id); setSName(s.name); setSYear(String(s.year)); setSSemester(String(s.semester)); setSCapacity(String(s.capacity)); setSClassroom(s.classroom || ""); setSecDialogOpen(true); };

  const handleSaveSection = async () => {
    if (!sName || !sBatchId) return;
    const payload = { name: sName, batch_id: sBatchId, year: parseInt(sYear), semester: parseInt(sSemester), capacity: parseInt(sCapacity), classroom: sClassroom || null };
    if (sEditId) {
      const { error } = await supabase.from("sections" as any).update(payload as any).eq("id", sEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("sections" as any).insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Section saved" }); setSecDialogOpen(false); fetchData();
  };

  const deleteSection = async (id: string) => {
    await supabase.from("sections" as any).delete().eq("id", id);
    toast({ title: "Section deleted" }); fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batches & Sections</h1>
            <p className="text-muted-foreground">Manage student batches and class sections</p>
          </div>
          {role === "admin" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openCreateSection()}><Plus className="h-4 w-4 mr-2" />Add Section</Button>
              <Button onClick={openCreateBatch}><Plus className="h-4 w-4 mr-2" />Add Batch</Button>
            </div>
          )}
        </div>

        {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> :
          batches.length === 0 ? <p className="text-muted-foreground py-8 text-center">No batches yet. Create one to get started.</p> :
          batches.map(b => (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{getProgName(b.program_id)} • Year {b.current_year} • Intake: {b.total_intake}</p>
                  </div>
                  <Badge variant="outline">{b.admission_year}–{b.passout_year}</Badge>
                </div>
                {role === "admin" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditBatch(b)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openCreateSection(b.id)}><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteBatch(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {sections.filter(s => s.batch_id === b.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-4">No sections</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Section</TableHead><TableHead>Year</TableHead><TableHead>Semester</TableHead><TableHead>Capacity</TableHead><TableHead>Classroom</TableHead>
                      {role === "admin" && <TableHead>Actions</TableHead>}
                    </TableRow></TableHeader>
                    <TableBody>
                      {sections.filter(s => s.batch_id === b.id).map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.year}</TableCell>
                          <TableCell>{s.semester}</TableCell>
                          <TableCell>{s.capacity}</TableCell>
                          <TableCell>{s.classroom || "TBD"}</TableCell>
                          {role === "admin" && (
                            <TableCell><div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditSection(s)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteSection(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div></TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{bEditId ? "Edit" : "Add"} Batch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Batch Name</Label><Input value={bName} onChange={e => setBName(e.target.value)} placeholder="e.g. 2024-28" /></div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={bProgram} onValueChange={setBProgram}><SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Admission Year</Label><Input type="number" value={bAdmYear} onChange={e => setBAdmYear(e.target.value)} placeholder="2024" /></div>
              <div className="space-y-2"><Label>Passout Year</Label><Input type="number" value={bPassYear} onChange={e => setBPassYear(e.target.value)} placeholder="2028" /></div>
              <div className="space-y-2"><Label>Current Year</Label><Input type="number" min="1" max="8" value={bCurrentYear} onChange={e => setBCurrentYear(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Total Intake</Label><Input type="number" value={bIntake} onChange={e => setBIntake(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={bAcadYear} onValueChange={setBAcadYear}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveBatch} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={secDialogOpen} onOpenChange={setSecDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sEditId ? "Edit" : "Add"} Section</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={sBatchId} onValueChange={setSBatchId}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({getProgName(b.program_id)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Section Name</Label><Input value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g. A" /></div>
              <div className="space-y-2"><Label>Classroom</Label><Input value={sClassroom} onChange={e => setSClassroom(e.target.value)} placeholder="Room 301" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Year</Label><Input type="number" min="1" value={sYear} onChange={e => setSYear(e.target.value)} /></div>
              <div className="space-y-2"><Label>Semester</Label><Input type="number" min="1" value={sSemester} onChange={e => setSSemester(e.target.value)} /></div>
              <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={sCapacity} onChange={e => setSCapacity(e.target.value)} /></div>
            </div>
            <Button onClick={handleSaveSection} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
