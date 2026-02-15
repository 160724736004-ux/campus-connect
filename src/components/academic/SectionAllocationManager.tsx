import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, UserPlus, Shuffle, Users } from "lucide-react";

export function SectionAllocationManager() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [regulations, setRegulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocSection, setAllocSection] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [bRes, sRes, pRes, rRes, allocRes] = await Promise.all([
      supabase.from("batches" as any).select("*").order("admission_year", { ascending: false }),
      supabase.from("sections" as any).select("*"),
      supabase.from("programs").select("id, name, code"),
      supabase.from("regulations" as any).select("id, code"),
      supabase.from("section_allocations" as any).select("*"),
    ]);
    setBatches((bRes.data as any[]) || []);
    setSections((sRes.data as any[]) || []);
    setPrograms(pRes.data || []);
    setRegulations((rRes.data as any[]) || []);
    setAllocations((allocRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedBatch) return;
    const batch = batches.find(b => b.id === selectedBatch);
    if (!batch) return;
    supabase.from("profiles").select("id, full_name, student_id_number, section_id")
      .eq("program_id", batch.program_id).eq("status", "active")
      .order("full_name")
      .then(({ data }) => setStudents(data || []));
  }, [selectedBatch, batches]);

  const batchSections = sections.filter(s => s.batch_id === selectedBatch);
  const getProgName = (id: string) => programs.find(p => p.id === id)?.name || "—";
  const getRegName = (id: string) => regulations.find(r => r.id === id)?.code || "—";
  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || "—";

  const handleAllocate = async () => {
    if (!allocSection || selectedStudents.length === 0) return;
    // Update profiles and create allocation records
    for (const sid of selectedStudents) {
      await supabase.from("profiles").update({ section_id: allocSection } as any).eq("id", sid);
      await supabase.from("section_allocations" as any).insert({
        student_id: sid, section_id: allocSection, allocation_method: "manual", allocated_by: user?.id,
      } as any);
    }
    toast({ title: `${selectedStudents.length} students allocated` });
    setDialogOpen(false); setSelectedStudents([]); fetchAll();
    // Refresh students
    setSelectedBatch(prev => { const v = prev; setSelectedBatch(""); setTimeout(() => setSelectedBatch(v), 0); return prev; });
  };

  const handleAutoAllocate = async () => {
    if (!selectedBatch || batchSections.length === 0) return;
    const unallocated = students.filter(s => !s.section_id);
    if (unallocated.length === 0) { toast({ title: "All students already allocated" }); return; }
    const perSection = Math.ceil(unallocated.length / batchSections.length);
    for (let i = 0; i < unallocated.length; i++) {
      const sectionIdx = Math.floor(i / perSection);
      const section = batchSections[sectionIdx] || batchSections[batchSections.length - 1];
      await supabase.from("profiles").update({ section_id: section.id } as any).eq("id", unallocated[i].id);
      await supabase.from("section_allocations" as any).insert({
        student_id: unallocated[i].id, section_id: section.id, allocation_method: "auto", allocated_by: user?.id,
      } as any);
    }
    toast({ title: `${unallocated.length} students auto-allocated` });
    fetchAll();
  };

  // Update batch regulation
  const updateBatchRegulation = async (batchId: string, regulationId: string) => {
    await supabase.from("batches" as any).update({ regulation_id: regulationId } as any).eq("id", batchId);
    toast({ title: "Batch regulation updated" }); fetchAll();
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* Batch Selection & Regulation Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Batch & Section Management</CardTitle>
          <CardDescription>Select a batch to manage regulation mapping and student allocation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger><SelectValue placeholder="Choose batch" /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({getProgName(b.program_id)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedBatch && (
              <div>
                <Label>Regulation</Label>
                <Select value={batches.find(b => b.id === selectedBatch)?.regulation_id || ""} onValueChange={v => updateBatchRegulation(selectedBatch, v)}>
                  <SelectTrigger><SelectValue placeholder="Assign regulation" /></SelectTrigger>
                  <SelectContent>{regulations.map(r => <SelectItem key={r.id} value={r.id}>{r.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedBatch && (
        <>
          {/* Section Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Sections</CardTitle>
                <CardDescription>{batchSections.length} sections • {students.length} students</CardDescription>
              </div>
              <div className="flex gap-2">
                {isAdmin && <Button variant="outline" size="sm" onClick={handleAutoAllocate}><Shuffle className="h-4 w-4 mr-1" />Auto Allocate</Button>}
                {isAdmin && <Button size="sm" onClick={() => { setAllocSection(""); setSelectedStudents([]); setDialogOpen(true); }}><UserPlus className="h-4 w-4 mr-1" />Manual Allocate</Button>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Section</TableHead><TableHead>Year</TableHead><TableHead>Semester</TableHead><TableHead>Capacity</TableHead><TableHead>Allocated</TableHead><TableHead>Classroom</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batchSections.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sections</TableCell></TableRow> :
                   batchSections.map(s => {
                    const allocated = students.filter(st => st.section_id === s.id).length;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.year}</TableCell>
                        <TableCell>{s.semester}</TableCell>
                        <TableCell>{s.capacity}</TableCell>
                        <TableCell>
                          <Badge variant={allocated >= s.capacity ? "destructive" : "default"}>{allocated}/{s.capacity}</Badge>
                        </TableCell>
                        <TableCell>{s.classroom || "TBD"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Students</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>ID</TableHead><TableHead>Section</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {students.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No students</TableCell></TableRow> :
                   students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.student_id_number || "—"}</TableCell>
                      <TableCell>{s.section_id ? <Badge>{getSectionName(s.section_id)}</Badge> : <Badge variant="outline">Unallocated</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Manual Allocation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader><DialogTitle>Manual Student Allocation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Section</Label>
              <Select value={allocSection} onValueChange={setAllocSection}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>{batchSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (Cap: {s.capacity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="max-h-[40vh] overflow-y-auto border rounded-lg p-2 space-y-1">
              {students.filter(s => !s.section_id).map(s => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                  <span className="text-sm">{s.full_name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{s.student_id_number || ""}</span>
                </label>
              ))}
              {students.filter(s => !s.section_id).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All students allocated</p>}
            </div>
            <Button onClick={handleAllocate} className="w-full" disabled={!allocSection || selectedStudents.length === 0}>
              Allocate {selectedStudents.length} Students
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
