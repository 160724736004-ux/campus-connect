import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, BookOpen, Layers, Link } from "lucide-react";

const SUBJECT_CATEGORIES = [
  "core", "professional_elective", "open_elective", "audit", "mandatory", "lab", "project", "seminar",
];
const ELECTIVE_GROUP_TYPES = ["professional_elective", "open_elective", "departmental_elective"];

export function RegulationsManager() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [regulations, setRegulations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [electiveGroups, setElectiveGroups] = useState<any[]>([]);
  const [electiveGroupCourses, setElectiveGroupCourses] = useState<any[]>([]);
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [corequisites, setCorequisites] = useState<any[]>([]);
  const [equivalents, setEquivalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Regulation dialog
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [regEditId, setRegEditId] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({ code: "", name: "", effective_from_year: "2022", description: "" });

  // Curriculum dialog
  const [curDialogOpen, setCurDialogOpen] = useState(false);
  const [curForm, setCurForm] = useState({ regulation_id: "", program_id: "", course_id: "", semester_number: "1", subject_category: "core", ltp_lecture: "3", ltp_tutorial: "1", ltp_practical: "0", credits: "3", is_elective: false, elective_group_id: "" });

  // Elective group dialog
  const [egDialogOpen, setEgDialogOpen] = useState(false);
  const [egForm, setEgForm] = useState({ regulation_id: "", program_id: "", name: "", semester_number: "1", min_select: "1", max_select: "1", group_type: "professional_elective" });

  // Mapping dialog (prerequisites/corequisites/equivalents)
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapType, setMapType] = useState<"prerequisite" | "corequisite" | "equivalent">("prerequisite");
  const [mapForm, setMapForm] = useState({ course_id: "", target_course_id: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [regRes, progRes, courseRes, curRes, egRes, egcRes, preRes, coreRes, equivRes] = await Promise.all([
      supabase.from("regulations" as any).select("*").order("effective_from_year", { ascending: false }),
      supabase.from("programs").select("id, name, code"),
      supabase.from("courses").select("id, code, title, credits"),
      supabase.from("curriculum_subjects" as any).select("*"),
      supabase.from("elective_groups" as any).select("*"),
      supabase.from("elective_group_courses" as any).select("*"),
      supabase.from("subject_prerequisites" as any).select("*"),
      supabase.from("subject_corequisites" as any).select("*"),
      supabase.from("subject_equivalents" as any).select("*"),
    ]);
    setRegulations((regRes.data as any[]) || []);
    setPrograms(progRes.data || []);
    setCourses(courseRes.data || []);
    setCurriculum((curRes.data as any[]) || []);
    setElectiveGroups((egRes.data as any[]) || []);
    setElectiveGroupCourses((egcRes.data as any[]) || []);
    setPrerequisites((preRes.data as any[]) || []);
    setCorequisites((coreRes.data as any[]) || []);
    setEquivalents((equivRes.data as any[]) || []);
    setLoading(false);
  };

  const getCourseName = (id: string) => { const c = courses.find(c => c.id === id); return c ? `${c.code} - ${c.title}` : "—"; };
  const getProgName = (id: string) => programs.find(p => p.id === id)?.name || "—";
  const getRegName = (id: string) => regulations.find(r => r.id === id)?.code || "—";

  // Regulation CRUD
  const saveRegulation = async () => {
    if (!regForm.code || !regForm.name) return;
    const payload = { code: regForm.code, name: regForm.name, effective_from_year: parseInt(regForm.effective_from_year), description: regForm.description || null };
    if (regEditId) {
      await supabase.from("regulations" as any).update(payload as any).eq("id", regEditId);
    } else {
      await supabase.from("regulations" as any).insert(payload as any);
    }
    toast({ title: "Regulation saved" }); setRegDialogOpen(false); fetchAll();
  };
  const deleteRegulation = async (id: string) => {
    await supabase.from("regulations" as any).delete().eq("id", id);
    toast({ title: "Regulation deleted" }); fetchAll();
  };

  // Curriculum CRUD
  const saveCurriculum = async () => {
    if (!curForm.regulation_id || !curForm.program_id || !curForm.course_id) return;
    await supabase.from("curriculum_subjects" as any).insert({
      regulation_id: curForm.regulation_id, program_id: curForm.program_id, course_id: curForm.course_id,
      semester_number: parseInt(curForm.semester_number), subject_category: curForm.subject_category,
      ltp_lecture: parseInt(curForm.ltp_lecture), ltp_tutorial: parseInt(curForm.ltp_tutorial),
      ltp_practical: parseInt(curForm.ltp_practical), credits: parseInt(curForm.credits),
      is_elective: curForm.subject_category !== "core", elective_group_id: curForm.elective_group_id || null,
    } as any);
    toast({ title: "Curriculum entry added" }); setCurDialogOpen(false); fetchAll();
  };
  const deleteCurriculum = async (id: string) => {
    await supabase.from("curriculum_subjects" as any).delete().eq("id", id);
    toast({ title: "Removed" }); fetchAll();
  };

  // Elective group CRUD
  const saveElectiveGroup = async () => {
    if (!egForm.name || !egForm.regulation_id) return;
    await supabase.from("elective_groups" as any).insert({
      regulation_id: egForm.regulation_id, program_id: egForm.program_id || null,
      name: egForm.name, semester_number: parseInt(egForm.semester_number),
      min_select: parseInt(egForm.min_select), max_select: parseInt(egForm.max_select), group_type: egForm.group_type,
    } as any);
    toast({ title: "Elective group created" }); setEgDialogOpen(false); fetchAll();
  };
  const deleteElectiveGroup = async (id: string) => {
    await supabase.from("elective_groups" as any).delete().eq("id", id);
    toast({ title: "Elective group deleted" }); fetchAll();
  };

  // Add course to elective group
  const addCourseToGroup = async (groupId: string, courseId: string) => {
    await supabase.from("elective_group_courses" as any).insert({ elective_group_id: groupId, course_id: courseId } as any);
    toast({ title: "Course added to group" }); fetchAll();
  };
  const removeCourseFromGroup = async (id: string) => {
    await supabase.from("elective_group_courses" as any).delete().eq("id", id);
    fetchAll();
  };

  // Subject mappings
  const saveMapping = async () => {
    if (!mapForm.course_id || !mapForm.target_course_id) return;
    const table = mapType === "prerequisite" ? "subject_prerequisites" : mapType === "corequisite" ? "subject_corequisites" : "subject_equivalents";
    const col = mapType === "prerequisite" ? "prerequisite_course_id" : mapType === "corequisite" ? "corequisite_course_id" : "equivalent_course_id";
    await supabase.from(table as any).insert({ course_id: mapForm.course_id, [col]: mapForm.target_course_id } as any);
    toast({ title: `${mapType} mapping added` }); setMapDialogOpen(false); fetchAll();
  };
  const deleteMapping = async (table: string, id: string) => {
    await supabase.from(table as any).delete().eq("id", id);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="regulations">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="regulations">Regulations</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="electives">Elective Groups</TabsTrigger>
          <TabsTrigger value="mappings">Subject Mappings</TabsTrigger>
        </TabsList>

        {/* Regulations Tab */}
        <TabsContent value="regulations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Regulations</h2>
            {isAdmin && <Button size="sm" onClick={() => { setRegEditId(null); setRegForm({ code: "", name: "", effective_from_year: "2022", description: "" }); setRegDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Regulation</Button>}
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Effective From</TableHead><TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
                 regulations.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No regulations defined</TableCell></TableRow> :
                 regulations.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.effective_from_year}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    {isAdmin && <TableCell><div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setRegEditId(r.id); setRegForm({ code: r.code, name: r.name, effective_from_year: String(r.effective_from_year), description: r.description || "" }); setRegDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRegulation(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Curriculum Mapping</h2>
            {isAdmin && <Button size="sm" onClick={() => { setCurForm({ regulation_id: regulations[0]?.id || "", program_id: "", course_id: "", semester_number: "1", subject_category: "core", ltp_lecture: "3", ltp_tutorial: "1", ltp_practical: "0", credits: "3", is_elective: false, elective_group_id: "" }); setCurDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>}
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Regulation</TableHead><TableHead>Program</TableHead><TableHead>Sem</TableHead><TableHead>Course</TableHead><TableHead>Category</TableHead><TableHead>L-T-P</TableHead><TableHead>Credits</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {curriculum.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No curriculum entries</TableCell></TableRow> :
                 curriculum.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{getRegName(c.regulation_id)}</TableCell>
                    <TableCell>{getProgName(c.program_id)}</TableCell>
                    <TableCell>{c.semester_number}</TableCell>
                    <TableCell className="font-medium">{getCourseName(c.course_id)}</TableCell>
                    <TableCell><Badge variant="outline">{c.subject_category || "core"}</Badge></TableCell>
                    <TableCell>{c.ltp_lecture || 3}-{c.ltp_tutorial || 1}-{c.ltp_practical || 0}</TableCell>
                    <TableCell>{c.credits || 3}</TableCell>
                    {isAdmin && <TableCell><Button variant="ghost" size="icon" onClick={() => deleteCurriculum(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Elective Groups Tab */}
        <TabsContent value="electives" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Elective Groups / Baskets</h2>
            {isAdmin && <Button size="sm" onClick={() => { setEgForm({ regulation_id: regulations[0]?.id || "", program_id: "", name: "", semester_number: "1", min_select: "1", max_select: "1", group_type: "professional_elective" }); setEgDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Group</Button>}
          </div>
          {electiveGroups.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No elective groups</CardContent></Card> :
           electiveGroups.map(g => (
            <Card key={g.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div>
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <CardDescription>{getRegName(g.regulation_id)} • Sem {g.semester_number} • Select {g.min_select}-{g.max_select}</CardDescription>
                </div>
                {isAdmin && <Button variant="ghost" size="icon" onClick={() => deleteElectiveGroup(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {electiveGroupCourses.filter(gc => gc.elective_group_id === g.id).map(gc => (
                    <Badge key={gc.id} variant="secondary" className="flex items-center gap-1">
                      {getCourseName(gc.course_id)}
                      {isAdmin && <button onClick={() => removeCourseFromGroup(gc.id)} className="ml-1 hover:text-destructive">×</button>}
                    </Badge>
                  ))}
                </div>
                {isAdmin && (
                  <Select onValueChange={(v) => addCourseToGroup(g.id, v)}>
                    <SelectTrigger className="max-w-xs"><SelectValue placeholder="Add course to group..." /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Subject Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Subject Mappings</h2>
            {isAdmin && <Button size="sm" onClick={() => { setMapForm({ course_id: "", target_course_id: "" }); setMapType("prerequisite"); setMapDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Mapping</Button>}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Prerequisites</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {prerequisites.length === 0 ? <p className="text-sm text-muted-foreground">None</p> :
                 prerequisites.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{getCourseName(p.course_id)} → {getCourseName(p.prerequisite_course_id)}</span>
                    {isAdmin && <button onClick={() => deleteMapping("subject_prerequisites", p.id)} className="text-destructive hover:text-destructive/80">×</button>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Corequisites</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {corequisites.length === 0 ? <p className="text-sm text-muted-foreground">None</p> :
                 corequisites.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>{getCourseName(c.course_id)} ↔ {getCourseName(c.corequisite_course_id)}</span>
                    {isAdmin && <button onClick={() => deleteMapping("subject_corequisites", c.id)} className="text-destructive hover:text-destructive/80">×</button>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Equivalents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {equivalents.length === 0 ? <p className="text-sm text-muted-foreground">None</p> :
                 equivalents.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span>{getCourseName(e.course_id)} ≡ {getCourseName(e.equivalent_course_id)}</span>
                    {isAdmin && <button onClick={() => deleteMapping("subject_equivalents", e.id)} className="text-destructive hover:text-destructive/80">×</button>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Regulation Dialog */}
      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{regEditId ? "Edit" : "Add"} Regulation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={regForm.code} onChange={e => setRegForm(p => ({ ...p, code: e.target.value }))} placeholder="R22" /></div>
              <div><Label>Effective From Year</Label><Input type="number" value={regForm.effective_from_year} onChange={e => setRegForm(p => ({ ...p, effective_from_year: e.target.value }))} /></div>
            </div>
            <div><Label>Name *</Label><Input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} placeholder="Regulation 2022" /></div>
            <div><Label>Description</Label><Textarea value={regForm.description} onChange={e => setRegForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={saveRegulation} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Curriculum Dialog */}
      <Dialog open={curDialogOpen} onOpenChange={setCurDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Curriculum Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Regulation *</Label>
                <Select value={curForm.regulation_id} onValueChange={v => setCurForm(p => ({ ...p, regulation_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{regulations.map(r => <SelectItem key={r.id} value={r.id}>{r.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Program *</Label>
                <Select value={curForm.program_id} onValueChange={v => setCurForm(p => ({ ...p, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Course *</Label>
              <Select value={curForm.course_id} onValueChange={v => setCurForm(p => ({ ...p, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Semester</Label><Input type="number" min="1" max="10" value={curForm.semester_number} onChange={e => setCurForm(p => ({ ...p, semester_number: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <Select value={curForm.subject_category} onValueChange={v => setCurForm(p => ({ ...p, subject_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECT_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>L</Label><Input type="number" min="0" value={curForm.ltp_lecture} onChange={e => setCurForm(p => ({ ...p, ltp_lecture: e.target.value }))} /></div>
              <div><Label>T</Label><Input type="number" min="0" value={curForm.ltp_tutorial} onChange={e => setCurForm(p => ({ ...p, ltp_tutorial: e.target.value }))} /></div>
              <div><Label>P</Label><Input type="number" min="0" value={curForm.ltp_practical} onChange={e => setCurForm(p => ({ ...p, ltp_practical: e.target.value }))} /></div>
              <div><Label>Credits</Label><Input type="number" min="0" value={curForm.credits} onChange={e => setCurForm(p => ({ ...p, credits: e.target.value }))} /></div>
            </div>
            {curForm.subject_category !== "core" && (
              <div><Label>Elective Group</Label>
                <Select value={curForm.elective_group_id} onValueChange={v => setCurForm(p => ({ ...p, elective_group_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select group (optional)" /></SelectTrigger>
                  <SelectContent>{electiveGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={saveCurriculum} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Elective Group Dialog */}
      <Dialog open={egDialogOpen} onOpenChange={setEgDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Elective Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Regulation *</Label>
                <Select value={egForm.regulation_id} onValueChange={v => setEgForm(p => ({ ...p, regulation_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{regulations.map(r => <SelectItem key={r.id} value={r.id}>{r.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Program</Label>
                <Select value={egForm.program_id} onValueChange={v => setEgForm(p => ({ ...p, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Group Name *</Label><Input value={egForm.name} onChange={e => setEgForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. PE-III (Sem 5)" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Semester</Label><Input type="number" min="1" value={egForm.semester_number} onChange={e => setEgForm(p => ({ ...p, semester_number: e.target.value }))} /></div>
              <div><Label>Min Select</Label><Input type="number" min="1" value={egForm.min_select} onChange={e => setEgForm(p => ({ ...p, min_select: e.target.value }))} /></div>
              <div><Label>Max Select</Label><Input type="number" min="1" value={egForm.max_select} onChange={e => setEgForm(p => ({ ...p, max_select: e.target.value }))} /></div>
            </div>
            <div><Label>Group Type</Label>
              <Select value={egForm.group_type} onValueChange={v => setEgForm(p => ({ ...p, group_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ELECTIVE_GROUP_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={saveElectiveGroup} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subject Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Mapping Type</Label>
              <Select value={mapType} onValueChange={v => setMapType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prerequisite">Prerequisite</SelectItem>
                  <SelectItem value="corequisite">Corequisite</SelectItem>
                  <SelectItem value="equivalent">Equivalent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Course *</Label>
              <Select value={mapForm.course_id} onValueChange={v => setMapForm(p => ({ ...p, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{mapType === "prerequisite" ? "Prerequisite" : mapType === "corequisite" ? "Corequisite" : "Equivalent"} Course *</Label>
              <Select value={mapForm.target_course_id} onValueChange={v => setMapForm(p => ({ ...p, target_course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.filter(c => c.id !== mapForm.course_id).map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={saveMapping} className="w-full">Add Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
