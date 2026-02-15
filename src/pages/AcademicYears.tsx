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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Archive, CheckCircle } from "lucide-react";

export default function AcademicYears() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [years, setYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Year dialog
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [yearEditId, setYearEditId] = useState<string | null>(null);
  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  // Semester dialog
  const [semDialogOpen, setSemDialogOpen] = useState(false);
  const [semEditId, setSemEditId] = useState<string | null>(null);
  const [semYearId, setSemYearId] = useState("");
  const [semName, setSemName] = useState("");
  const [semStart, setSemStart] = useState("");
  const [semEnd, setSemEnd] = useState("");
  const [semNumber, setSemNumber] = useState("1");

  const fetchData = async () => {
    setLoading(true);
    const [yRes, sRes] = await Promise.all([
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("semesters" as any).select("*").order("start_date"),
    ]);
    setYears((yRes.data as any[]) || []);
    setSemesters((sRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreateYear = () => { setYearEditId(null); setYearName(""); setYearStart(""); setYearEnd(""); setYearDialogOpen(true); };
  const openEditYear = (y: any) => { setYearEditId(y.id); setYearName(y.name); setYearStart(y.start_date); setYearEnd(y.end_date); setYearDialogOpen(true); };

  const handleSaveYear = async () => {
    if (!yearName || !yearStart || !yearEnd) return;
    const payload = { name: yearName, start_date: yearStart, end_date: yearEnd };
    if (yearEditId) {
      const { error } = await supabase.from("academic_years" as any).update(payload as any).eq("id", yearEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("academic_years" as any).insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Academic year saved" }); setYearDialogOpen(false); fetchData();
  };

  const setActiveYear = async (id: string) => {
    await supabase.from("academic_years" as any).update({ is_active: false } as any).neq("id", id);
    await supabase.from("academic_years" as any).update({ is_active: true } as any).eq("id", id);
    toast({ title: "Active year updated" }); fetchData();
  };

  const archiveYear = async (id: string) => {
    await supabase.from("academic_years" as any).update({ is_archived: true, is_active: false } as any).eq("id", id);
    toast({ title: "Year archived" }); fetchData();
  };

  const deleteYear = async (id: string) => {
    const { error } = await supabase.from("academic_years" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Year deleted" }); fetchData();
  };

  // Semesters
  const openCreateSem = (yearId?: string) => {
    setSemEditId(null); setSemYearId(yearId || ""); setSemName(""); setSemStart(""); setSemEnd(""); setSemNumber("1"); setSemDialogOpen(true);
  };
  const openEditSem = (s: any) => {
    setSemEditId(s.id); setSemYearId(s.academic_year_id); setSemName(s.name); setSemStart(s.start_date); setSemEnd(s.end_date); setSemNumber(String(s.semester_number)); setSemDialogOpen(true);
  };

  const handleSaveSem = async () => {
    if (!semName || !semStart || !semEnd || !semYearId) return;
    const payload = { name: semName, start_date: semStart, end_date: semEnd, academic_year_id: semYearId, semester_number: parseInt(semNumber) };
    if (semEditId) {
      const { error } = await supabase.from("semesters" as any).update(payload as any).eq("id", semEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("semesters" as any).insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Semester saved" }); setSemDialogOpen(false); fetchData();
  };

  const setActiveSem = async (id: string) => {
    await supabase.from("semesters" as any).update({ is_active: false } as any).neq("id", id);
    await supabase.from("semesters" as any).update({ is_active: true } as any).eq("id", id);
    toast({ title: "Active semester updated" }); fetchData();
  };

  const deleteSem = async (id: string) => {
    await supabase.from("semesters" as any).delete().eq("id", id);
    toast({ title: "Semester deleted" }); fetchData();
  };

  const getYearName = (id: string) => years.find(y => y.id === id)?.name || "—";
  const activeYears = years.filter(y => !y.is_archived);
  const archivedYears = years.filter(y => y.is_archived);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Academic Years & Semesters</h1>
            <p className="text-muted-foreground">Manage academic calendar</p>
          </div>
          {role === "admin" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openCreateSem()}><Plus className="h-4 w-4 mr-2" />Add Semester</Button>
              <Button onClick={openCreateYear}><Plus className="h-4 w-4 mr-2" />Add Academic Year</Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="active">
          <TabsList><TabsTrigger value="active">Active Years</TabsTrigger><TabsTrigger value="archived">Archived</TabsTrigger></TabsList>

          <TabsContent value="active" className="space-y-4">
            {loading ? <p className="text-muted-foreground py-8 text-center">Loading...</p> :
              activeYears.length === 0 ? <p className="text-muted-foreground py-8 text-center">No academic years. Create one to get started.</p> :
              activeYears.map(y => (
                <Card key={y.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{y.name}</CardTitle>
                      {y.is_active && <Badge>Active</Badge>}
                      <span className="text-sm text-muted-foreground">{y.start_date} — {y.end_date}</span>
                    </div>
                    {role === "admin" && (
                      <div className="flex gap-1">
                        {!y.is_active && <Button variant="ghost" size="sm" onClick={() => setActiveYear(y.id)} title="Set Active"><CheckCircle className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => openEditYear(y)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => archiveYear(y.id)}><Archive className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openCreateSem(y.id)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {semesters.filter(s => s.academic_year_id === y.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground px-6 pb-4">No semesters defined</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Semester</TableHead><TableHead>#</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
                          {role === "admin" && <TableHead>Actions</TableHead>}
                        </TableRow></TableHeader>
                        <TableBody>
                          {semesters.filter(s => s.academic_year_id === y.id).map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.semester_number}</TableCell>
                              <TableCell>{s.start_date}</TableCell>
                              <TableCell>{s.end_date}</TableCell>
                              <TableCell>{s.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                              {role === "admin" && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    {!s.is_active && <Button variant="ghost" size="sm" onClick={() => setActiveSem(s.id)} title="Set Active"><CheckCircle className="h-4 w-4" /></Button>}
                                    <Button variant="ghost" size="icon" onClick={() => openEditSem(s)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteSem(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </div>
                                </TableCell>
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
          </TabsContent>

          <TabsContent value="archived">
            {archivedYears.length === 0 ? <p className="text-muted-foreground py-8 text-center">No archived years</p> :
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Period</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {archivedYears.map(y => (
                      <TableRow key={y.id}>
                        <TableCell className="font-medium">{y.name}</TableCell>
                        <TableCell>{y.start_date} — {y.end_date}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteYear(y.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* Year Dialog */}
      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{yearEditId ? "Edit" : "Add"} Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={yearName} onChange={e => setYearName(e.target.value)} placeholder="e.g. 2024-25" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={yearStart} onChange={e => setYearStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={yearEnd} onChange={e => setYearEnd(e.target.value)} /></div>
            </div>
            <Button onClick={handleSaveYear} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Semester Dialog */}
      <Dialog open={semDialogOpen} onOpenChange={setSemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{semEditId ? "Edit" : "Add"} Semester</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={semYearId} onValueChange={setSemYearId}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{activeYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Semester Name</Label><Input value={semName} onChange={e => setSemName(e.target.value)} placeholder="e.g. Semester 1" /></div>
              <div className="space-y-2"><Label>Semester #</Label><Input type="number" min="1" max="10" value={semNumber} onChange={e => setSemNumber(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={semStart} onChange={e => setSemStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)} /></div>
            </div>
            <Button onClick={handleSaveSem} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
