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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ClipboardList } from "lucide-react";

const CALC_FORMULAS = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "best_of_n", label: "Best of N" },
  { value: "weighted_average", label: "Weighted Average" },
];
const ROUND_OFF_RULES = [
  { value: "none", label: "None" },
  { value: "ceiling", label: "Ceiling" },
  { value: "floor", label: "Floor" },
  { value: "nearest", label: "Nearest" },
  { value: "nearest_half", label: "Nearest 0.5" },
];

export default function AssessmentComponents() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [componentTypes, setComponentTypes] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [gracePolicies, setGracePolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [graceDialogOpen, setGraceDialogOpen] = useState(false);
  const [graceEditId, setGraceEditId] = useState<string | null>(null);
  const [graceForm, setGraceForm] = useState({ name: "", course_id: "", max_grace_marks: "0", max_percentage: "", is_active: true });
  const [form, setForm] = useState({
    course_id: "", academic_year_id: "", semester_id: "",
    component_type_id: "", name: "", max_marks: "100", weightage_percent: "0",
    calculation_formula: "sum", best_of_n_count: "", is_manual_entry: true,
calendar_event_id: "", entry_start_date: "", entry_deadline: "",
      grace_period_hours: "0", requires_approval: false, approval_deadline: "",
      round_off_rule: "none", depends_on_component_id: "",
  });

  const canManage = role === "admin" || role === "hod" || role === "faculty";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, yearsRes, semRes, typesRes, eventsRes, defRes, graceRes] = await Promise.all([
        supabase.from("courses").select("*").order("code"),
        supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
        supabase.from("semesters" as any).select("*").order("start_date"),
        supabase.from("assessment_component_types" as any).select("*").order("sort_order"),
        supabase.from("academic_calendar_events").select("id, title, start_date, end_date, event_type"),
        supabase.from("assessment_component_definitions" as any)
          .select("*, assessment_component_types(name, code), courses(code, title)")
          .order("sort_order"),
        (supabase.from("grace_marks_policies" as any).select("*, courses(code, title)").order("name") as any).then((r: any) => r).catch(() => ({ data: [] })),
      ]);
      setCourses(coursesRes.data || []);
      setAcademicYears((yearsRes.data as any[]) || []);
      setSemesters((semRes.data as any[]) || []);
      setComponentTypes((typesRes.data as any[]) || []);
      setCalendarEvents(eventsRes.data || []);
      setDefinitions((defRes.data as any[]) || []);
      setGracePolicies((graceRes.data as any[]) || []);
    } catch (_) {
      setDefinitions([]);
      setComponentTypes([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      course_id: "", academic_year_id: "", semester_id: "",
      component_type_id: "", name: "", max_marks: "100", weightage_percent: "0",
      calculation_formula: "sum", best_of_n_count: "", is_manual_entry: true,
      calendar_event_id: "", entry_start_date: "", entry_deadline: "",
      grace_period_hours: "0", requires_approval: false,
      round_off_rule: "none", depends_on_component_id: "", approval_deadline: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      course_id: d.course_id, academic_year_id: d.academic_year_id || "", semester_id: d.semester_id || "",
      component_type_id: d.component_type_id, name: d.name, max_marks: String(d.max_marks || 100),
      weightage_percent: String(d.weightage_percent || 0), calculation_formula: d.calculation_formula || "sum",
      best_of_n_count: d.best_of_n_count ? String(d.best_of_n_count) : "",
      is_manual_entry: d.is_manual_entry !== false,
      calendar_event_id: d.calendar_event_id || "", entry_start_date: d.entry_start_date || "",
      entry_deadline: d.entry_deadline || "", grace_period_hours: String(d.grace_period_hours || 0),
      requires_approval: d.requires_approval === true,
      approval_deadline: d.approval_deadline || "",
      round_off_rule: d.round_off_rule || "none", depends_on_component_id: d.depends_on_component_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.course_id || !form.component_type_id || !form.name.trim()) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    const payload = {
      course_id: form.course_id,
      academic_year_id: form.academic_year_id || null,
      semester_id: form.semester_id || null,
      component_type_id: form.component_type_id,
      name: form.name.trim(),
      max_marks: parseFloat(form.max_marks) || 100,
      weightage_percent: parseFloat(form.weightage_percent) || 0,
      calculation_formula: form.calculation_formula || null,
      best_of_n_count: form.best_of_n_count ? parseInt(form.best_of_n_count) : null,
      is_manual_entry: form.is_manual_entry,
      calendar_event_id: form.calendar_event_id || null,
      entry_start_date: form.entry_start_date || null,
      entry_deadline: form.entry_deadline || null,
      grace_period_hours: parseInt(form.grace_period_hours) || 0,
      requires_approval: form.requires_approval,
      approval_deadline: form.approval_deadline || null,
      round_off_rule: form.round_off_rule || null,
      depends_on_component_id: form.depends_on_component_id || null,
    };
    if (editId) {
      const { error } = await supabase.from("assessment_component_definitions" as any).update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Component updated" });
    } else {
      const { error } = await supabase.from("assessment_component_definitions" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Component created" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("assessment_component_definitions" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Component deleted" });
    fetchData();
  };

  const openGraceCreate = () => {
    setGraceEditId(null);
    setGraceForm({ name: "", course_id: "", max_grace_marks: "0", max_percentage: "", is_active: true });
    setGraceDialogOpen(true);
  };
  const openGraceEdit = (p: any) => {
    setGraceEditId(p.id);
    setGraceForm({
      name: p.name || "",
      course_id: p.course_id || "",
      max_grace_marks: String(p.max_grace_marks ?? 0),
      max_percentage: p.max_percentage != null ? String(p.max_percentage) : "",
      is_active: p.is_active !== false,
    });
    setGraceDialogOpen(true);
  };
  const handleGraceSave = async () => {
    if (!graceForm.name.trim() || !graceForm.course_id) {
      toast({ title: "Name and Course are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: graceForm.name.trim(),
      course_id: graceForm.course_id,
      max_grace_marks: parseFloat(graceForm.max_grace_marks) || 0,
      max_percentage: graceForm.max_percentage ? parseFloat(graceForm.max_percentage) : null,
      is_active: graceForm.is_active,
    };
    if (graceEditId) {
      const { error } = await supabase.from("grace_marks_policies" as any).update(payload).eq("id", graceEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Grace policy updated" });
    } else {
      const { error } = await supabase.from("grace_marks_policies" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Grace policy created" });
    }
    setGraceDialogOpen(false);
    fetchData();
  };
  const handleGraceDelete = async (id: string) => {
    const { error } = await supabase.from("grace_marks_policies" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Grace policy deleted" });
    fetchData();
  };

  const getCourseLabel = (c: any) => c ? `${c.code} — ${c.title}` : "—";
  const getTypeName = (t: any) => t?.name || "—";
  const update = (key: string, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assessment Components</h1>
            <p className="text-muted-foreground">Define components per subject (Mid-I, Mid-II, Assignment, Quiz, Attendance, etc.)</p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          )}
        </div>

        <Tabs defaultValue="definitions">
          <TabsList>
            <TabsTrigger value="definitions">Component Definitions</TabsTrigger>
            <TabsTrigger value="types">Component Types</TabsTrigger>
            <TabsTrigger value="grace">Grace Marks Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Weight %</TableHead>
                      <TableHead>Formula</TableHead>
                      <TableHead>Manual</TableHead>
                      <TableHead>Approval</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : definitions.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No components defined yet</TableCell></TableRow>
                    ) : (
                      definitions.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-sm">{getCourseLabel(d.courses)}</TableCell>
                          <TableCell>
                            <span className="font-medium">{d.name}</span>
                            <span className="text-muted-foreground text-xs ml-1">({getTypeName(d.assessment_component_types)})</span>
                          </TableCell>
                          <TableCell>{d.max_marks}</TableCell>
                          <TableCell>{d.weightage_percent}%</TableCell>
                          <TableCell><Badge variant="outline">{d.calculation_formula || "—"}</Badge></TableCell>
                          <TableCell>{d.is_manual_entry !== false ? "Yes" : "No"}</TableCell>
                          <TableCell>{d.requires_approval ? "Yes" : "No"}</TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4" /></Button>
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

          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Built-in Component Types</CardTitle>
              <p className="text-sm text-muted-foreground">Mid-I, Mid-II, Assignment, Quiz, Attendance, Seminar, Project, Viva, Practical, Lab, Semester End, Supplementary, Makeup</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {componentTypes.length === 0 ? (
                    <p className="text-muted-foreground">Run migration to seed component types.</p>
                  ) : (
                    componentTypes.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">{t.code} — {t.name}</Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grace" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Grace Marks Policies</CardTitle>
                  <p className="text-sm text-muted-foreground">Applied during internal marks calculation when policy exists for course</p>
                </div>
                {canManage && (
                  <Button onClick={openGraceCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Policy
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Max Grace</TableHead>
                      <TableHead>Max %</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gracePolicies.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No grace policies defined yet</TableCell></TableRow>
                    ) : (
                      gracePolicies.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="font-mono">{p.courses?.code || p.course_id || "—"}</TableCell>
                          <TableCell>{p.max_grace_marks ?? 0}</TableCell>
                          <TableCell>{p.max_percentage != null ? `${p.max_percentage}%` : "—"}</TableCell>
                          <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openGraceEdit(p)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleGraceDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
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
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Assessment Component</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Course *</Label>
                  <Select value={form.course_id} onValueChange={(v) => update("course_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Component Type *</Label>
                  <Select value={form.component_type_id} onValueChange={(v) => update("component_type_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {componentTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Mid-I Exam" />
                </div>
                <div>
                  <Label>Max Marks</Label>
                  <Input type="number" value={form.max_marks} onChange={(e) => update("max_marks", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weightage %</Label>
                  <Input type="number" value={form.weightage_percent} onChange={(e) => update("weightage_percent", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Calculation Formula</Label>
                  <Select value={form.calculation_formula} onValueChange={(v) => update("calculation_formula", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALC_FORMULAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.calculation_formula === "best_of_n" && (
                <div>
                  <Label>Best of N Count</Label>
                  <Input type="number" value={form.best_of_n_count} onChange={(e) => update("best_of_n_count", e.target.value)} placeholder="e.g. 3" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_manual_entry} onCheckedChange={(v) => update("is_manual_entry", v)} />
                  <Label>Manual Entry</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.requires_approval} onCheckedChange={(v) => update("requires_approval", v)} />
                  <Label>Requires Approval</Label>
                </div>
              </div>
              {form.requires_approval && (
                <div>
                  <Label>Approval Deadline (HOD)</Label>
                  <Input type="date" value={form.approval_deadline} onChange={(e) => update("approval_deadline", e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entry Start Date</Label>
                  <Input type="date" value={form.entry_start_date} onChange={(e) => update("entry_start_date", e.target.value)} />
                </div>
                <div>
                  <Label>Entry Deadline</Label>
                  <Input type="date" value={form.entry_deadline} onChange={(e) => update("entry_deadline", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Grace Period (hours)</Label>
                  <Input type="number" value={form.grace_period_hours} onChange={(e) => update("grace_period_hours", e.target.value)} />
                </div>
                <div>
                  <Label>Round-off Rule</Label>
                  <Select value={form.round_off_rule} onValueChange={(v) => update("round_off_rule", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROUND_OFF_RULES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Link to Calendar Event (Exam)</Label>
                <Select value={form.calendar_event_id} onValueChange={(v) => update("calendar_event_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {calendarEvents.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title} ({e.start_date})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {definitions.length > 0 && (
                <div>
                  <Label>Depends on Component</Label>
                  <Select value={form.depends_on_component_id} onValueChange={(v) => update("depends_on_component_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {definitions.filter((d) => d.id !== editId).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name} — {getCourseLabel(d.courses)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={graceDialogOpen} onOpenChange={setGraceDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{graceEditId ? "Edit" : "Add"} Grace Marks Policy</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input value={graceForm.name} onChange={(e) => setGraceForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Attendance Grace" />
              </div>
              <div>
                <Label>Course *</Label>
                <Select value={graceForm.course_id} onValueChange={(v) => setGraceForm((p) => ({ ...p, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Grace Marks</Label>
                  <Input type="number" value={graceForm.max_grace_marks} onChange={(e) => setGraceForm((p) => ({ ...p, max_grace_marks: e.target.value }))} />
                </div>
                <div>
                  <Label>Max Percentage (optional)</Label>
                  <Input type="number" value={graceForm.max_percentage} onChange={(e) => setGraceForm((p) => ({ ...p, max_percentage: e.target.value }))} placeholder="e.g. 2" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={graceForm.is_active} onCheckedChange={(v) => setGraceForm((p) => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGraceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleGraceSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
