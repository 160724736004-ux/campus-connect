import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Settings2 } from "lucide-react";

export function AttendanceConfig() {
  const { toast } = useToast();
  const [types, setTypes] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);

  const [typeForm, setTypeForm] = useState({ code: "", name: "", counts_as_present: false, color: "#6b7280" });
  const [configForm, setConfigForm] = useState({
    program_id: "", department_id: "", min_attendance_overall: 75, min_attendance_theory: 75,
    min_attendance_lab: 75, alert_threshold_warning: 75, alert_threshold_critical: 70,
    alert_threshold_danger: 65, detention_threshold: 65, condonation_limit_percent: 5,
    grace_period_minutes: 10, late_marking_window_minutes: 15, marking_deadline_hours: 48,
    allow_past_date_days: 3, session_type: "subject", track_theory_lab_separately: true,
  });
  const [periodForm, setPeriodForm] = useState({
    name: "", period_number: 1, start_time: "09:00", end_time: "09:50",
    session_label: "morning", is_lab_slot: false, department_id: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [typesRes, configsRes, periodsRes, programsRes, deptsRes] = await Promise.all([
      supabase.from("attendance_types").select("*").order("sort_order"),
      supabase.from("attendance_config").select("*, programs(name), departments(name)"),
      supabase.from("attendance_periods").select("*, departments(name)").order("period_number"),
      supabase.from("programs").select("id, name, code"),
      supabase.from("departments").select("id, name, code"),
    ]);
    setTypes(typesRes.data || []);
    setConfigs(configsRes.data || []);
    setPeriods(periodsRes.data || []);
    setPrograms(programsRes.data || []);
    setDepartments(deptsRes.data || []);
  };

  // --- Attendance Types CRUD ---
  const openTypeDialog = (type?: any) => {
    if (type) {
      setEditingType(type);
      setTypeForm({ code: type.code, name: type.name, counts_as_present: type.counts_as_present, color: type.color });
    } else {
      setEditingType(null);
      setTypeForm({ code: "", name: "", counts_as_present: false, color: "#6b7280" });
    }
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    if (!typeForm.code || !typeForm.name) return;
    if (editingType) {
      await supabase.from("attendance_types").update(typeForm).eq("id", editingType.id);
    } else {
      await supabase.from("attendance_types").insert({ ...typeForm, sort_order: types.length + 1 });
    }
    setTypeDialogOpen(false);
    fetchAll();
    toast({ title: editingType ? "Type updated" : "Type created" });
  };

  const deleteType = async (id: string) => {
    await supabase.from("attendance_types").delete().eq("id", id);
    fetchAll();
    toast({ title: "Type deleted" });
  };

  // --- Config CRUD ---
  const openConfigDialog = (config?: any) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        program_id: config.program_id || "", department_id: config.department_id || "",
        min_attendance_overall: config.min_attendance_overall, min_attendance_theory: config.min_attendance_theory,
        min_attendance_lab: config.min_attendance_lab, alert_threshold_warning: config.alert_threshold_warning,
        alert_threshold_critical: config.alert_threshold_critical, alert_threshold_danger: config.alert_threshold_danger,
        detention_threshold: config.detention_threshold, condonation_limit_percent: config.condonation_limit_percent,
        grace_period_minutes: config.grace_period_minutes, late_marking_window_minutes: config.late_marking_window_minutes,
        marking_deadline_hours: config.marking_deadline_hours, allow_past_date_days: config.allow_past_date_days,
        session_type: config.session_type, track_theory_lab_separately: config.track_theory_lab_separately,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        program_id: "", department_id: "", min_attendance_overall: 75, min_attendance_theory: 75,
        min_attendance_lab: 75, alert_threshold_warning: 75, alert_threshold_critical: 70,
        alert_threshold_danger: 65, detention_threshold: 65, condonation_limit_percent: 5,
        grace_period_minutes: 10, late_marking_window_minutes: 15, marking_deadline_hours: 48,
        allow_past_date_days: 3, session_type: "subject", track_theory_lab_separately: true,
      });
    }
    setConfigDialogOpen(true);
  };

  const saveConfig = async () => {
    const payload = {
      ...configForm,
      program_id: configForm.program_id || null,
      department_id: configForm.department_id || null,
    };
    if (editingConfig) {
      await supabase.from("attendance_config").update(payload).eq("id", editingConfig.id);
    } else {
      await supabase.from("attendance_config").insert(payload);
    }
    setConfigDialogOpen(false);
    fetchAll();
    toast({ title: editingConfig ? "Config updated" : "Config created" });
  };

  // --- Period CRUD ---
  const openPeriodDialog = (period?: any) => {
    if (period) {
      setEditingPeriod(period);
      setPeriodForm({
        name: period.name, period_number: period.period_number,
        start_time: period.start_time, end_time: period.end_time,
        session_label: period.session_label, is_lab_slot: period.is_lab_slot,
        department_id: period.department_id || "",
      });
    } else {
      setEditingPeriod(null);
      setPeriodForm({ name: "", period_number: periods.length + 1, start_time: "09:00", end_time: "09:50", session_label: "morning", is_lab_slot: false, department_id: "" });
    }
    setPeriodDialogOpen(true);
  };

  const savePeriod = async () => {
    if (!periodForm.name) return;
    const payload = { ...periodForm, department_id: periodForm.department_id || null };
    if (editingPeriod) {
      await supabase.from("attendance_periods").update(payload).eq("id", editingPeriod.id);
    } else {
      await supabase.from("attendance_periods").insert(payload);
    }
    setPeriodDialogOpen(false);
    fetchAll();
    toast({ title: editingPeriod ? "Period updated" : "Period created" });
  };

  const deletePeriod = async (id: string) => {
    await supabase.from("attendance_periods").delete().eq("id", id);
    fetchAll();
    toast({ title: "Period deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Attendance Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendance Types</CardTitle>
            <CardDescription>Define custom attendance statuses (P, A, L, OD, ML, etc.)</CardDescription>
          </div>
          <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openTypeDialog()}><Plus className="h-4 w-4 mr-1" />Add Type</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingType ? "Edit" : "Add"} Attendance Type</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })} placeholder="P" maxLength={5} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Present" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={typeForm.counts_as_present} onCheckedChange={(v) => setTypeForm({ ...typeForm, counts_as_present: v })} />
                    <Label>Counts as Present</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input type="color" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} className="w-16 h-8 p-1" />
                  </div>
                </div>
                <Button onClick={saveType} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Counts as Present</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Badge variant="outline" className="font-mono">{t.code}</Badge></TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.counts_as_present ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell><div className="h-5 w-5 rounded" style={{ backgroundColor: t.color }} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openTypeDialog(t)}><Pencil className="h-4 w-4" /></Button>
                      {!t.is_default && <Button variant="ghost" size="icon" onClick={() => deleteType(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attendance Rules & Thresholds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendance Rules & Thresholds</CardTitle>
            <CardDescription>Configure minimum attendance, alert thresholds, and marking rules per program/department</CardDescription>
          </div>
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openConfigDialog()}><Settings2 className="h-4 w-4 mr-1" />Add Config</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingConfig ? "Edit" : "Add"} Attendance Configuration</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program (optional)</Label>
                    <Select value={configForm.program_id} onValueChange={(v) => setConfigForm({ ...configForm, program_id: v })}>
                      <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Programs</SelectItem>
                        {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Select value={configForm.department_id} onValueChange={(v) => setConfigForm({ ...configForm, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Session Type</Label>
                  <Select value={configForm.session_type} onValueChange={(v) => setConfigForm({ ...configForm, session_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="period">Period-wise</SelectItem>
                      <SelectItem value="session">Session-wise</SelectItem>
                      <SelectItem value="subject">Subject-wise per day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Overall (%)</Label>
                    <Input type="number" value={configForm.min_attendance_overall} onChange={(e) => setConfigForm({ ...configForm, min_attendance_overall: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Theory (%)</Label>
                    <Input type="number" value={configForm.min_attendance_theory} onChange={(e) => setConfigForm({ ...configForm, min_attendance_theory: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Lab (%)</Label>
                    <Input type="number" value={configForm.min_attendance_lab} onChange={(e) => setConfigForm({ ...configForm, min_attendance_lab: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Warning Alert (%)</Label>
                    <Input type="number" value={configForm.alert_threshold_warning} onChange={(e) => setConfigForm({ ...configForm, alert_threshold_warning: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Critical Alert (%)</Label>
                    <Input type="number" value={configForm.alert_threshold_critical} onChange={(e) => setConfigForm({ ...configForm, alert_threshold_critical: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Danger Alert (%)</Label>
                    <Input type="number" value={configForm.alert_threshold_danger} onChange={(e) => setConfigForm({ ...configForm, alert_threshold_danger: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Detention Threshold (%)</Label>
                    <Input type="number" value={configForm.detention_threshold} onChange={(e) => setConfigForm({ ...configForm, detention_threshold: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Condonation Limit (%)</Label>
                    <Input type="number" value={configForm.condonation_limit_percent} onChange={(e) => setConfigForm({ ...configForm, condonation_limit_percent: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Grace Period (min)</Label>
                    <Input type="number" value={configForm.grace_period_minutes} onChange={(e) => setConfigForm({ ...configForm, grace_period_minutes: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Late Window (min)</Label>
                    <Input type="number" value={configForm.late_marking_window_minutes} onChange={(e) => setConfigForm({ ...configForm, late_marking_window_minutes: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Marking Deadline (hrs)</Label>
                    <Input type="number" value={configForm.marking_deadline_hours} onChange={(e) => setConfigForm({ ...configForm, marking_deadline_hours: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Past Date Limit (days)</Label>
                    <Input type="number" value={configForm.allow_past_date_days} onChange={(e) => setConfigForm({ ...configForm, allow_past_date_days: +e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={configForm.track_theory_lab_separately} onCheckedChange={(v) => setConfigForm({ ...configForm, track_theory_lab_separately: v })} />
                  <Label>Track Theory & Lab separately</Label>
                </div>
                <Button onClick={saveConfig} className="w-full">Save Configuration</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Session Type</TableHead>
                <TableHead>Min Overall</TableHead>
                <TableHead>Alerts (W/C/D)</TableHead>
                <TableHead>Detention</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No configurations. Add one to override defaults.</TableCell></TableRow>
              ) : configs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.programs?.name || c.departments?.name || "Global Default"}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{c.session_type}</Badge></TableCell>
                  <TableCell>{c.min_attendance_overall}%</TableCell>
                  <TableCell>{c.alert_threshold_warning}% / {c.alert_threshold_critical}% / {c.alert_threshold_danger}%</TableCell>
                  <TableCell>{c.detention_threshold}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openConfigDialog(c)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Periods/Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Periods / Time Slots</CardTitle>
            <CardDescription>Define daily periods for period-wise attendance tracking</CardDescription>
          </div>
          <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openPeriodDialog()}><Plus className="h-4 w-4 mr-1" />Add Period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPeriod ? "Edit" : "Add"} Period</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="Period 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Number</Label>
                    <Input type="number" value={periodForm.period_number} onChange={(e) => setPeriodForm({ ...periodForm, period_number: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={periodForm.start_time} onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={periodForm.end_time} onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Session</Label>
                    <Select value={periodForm.session_label} onValueChange={(v) => setPeriodForm({ ...periodForm, session_label: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={periodForm.department_id} onValueChange={(v) => setPeriodForm({ ...periodForm, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={periodForm.is_lab_slot} onCheckedChange={(v) => setPeriodForm({ ...periodForm, is_lab_slot: v })} />
                  <Label>Lab Slot</Label>
                </div>
                <Button onClick={savePeriod} className="w-full">Save Period</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No periods defined</TableCell></TableRow>
              ) : periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period_number}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.start_time} – {p.end_time}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.session_label}</Badge></TableCell>
                  <TableCell>{p.is_lab_slot ? <Badge>Lab</Badge> : "—"}</TableCell>
                  <TableCell>{p.departments?.name || "All"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openPeriodDialog(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePeriod(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
