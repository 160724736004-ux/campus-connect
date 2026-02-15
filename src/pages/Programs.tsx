import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function Programs() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", code: "", department_id: "", duration_years: "4",
    total_credits: "160", degree_type: "undergraduate", intake_capacity: "60",
    eligibility: "", affiliation: "", accreditation: "", status: "active",
  });

  const fetchData = async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      supabase.from("programs").select("*").order("name"),
      supabase.from("departments").select("*").order("name"),
    ]);
    setPrograms(pRes.data || []);
    setDepartments(dRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", code: "", department_id: "", duration_years: "4", total_credits: "160", degree_type: "undergraduate", intake_capacity: "60", eligibility: "", affiliation: "", accreditation: "", status: "active" });
    setDialogOpen(true);
  };
  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({ name: p.name, code: p.code, department_id: p.department_id, duration_years: String(p.duration_years), total_credits: String(p.total_credits || 160), degree_type: p.degree_type || "undergraduate", intake_capacity: String(p.intake_capacity || 60), eligibility: p.eligibility || "", affiliation: p.affiliation || "", accreditation: p.accreditation || "", status: p.status || "active" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.department_id) return;
    const payload = {
      name: form.name, code: form.code, department_id: form.department_id,
      duration_years: parseInt(form.duration_years), total_credits: parseInt(form.total_credits),
      degree_type: form.degree_type, intake_capacity: parseInt(form.intake_capacity),
      eligibility: form.eligibility || null, affiliation: form.affiliation || null,
      accreditation: form.accreditation || null, status: form.status,
    };
    if (editId) {
      const { error } = await supabase.from("programs").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Program updated" });
    } else {
      const { error } = await supabase.from("programs").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Program created" });
    }
    setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Program deleted" }); fetchData();
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || "—";
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programs</h1>
            <p className="text-muted-foreground">Manage academic programs</p>
          </div>
          {role === "admin" && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Program</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Duration</TableHead><TableHead>Degree</TableHead><TableHead>Intake</TableHead><TableHead>Status</TableHead>
                  {role === "admin" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : programs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No programs yet</TableCell></TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{getDeptName(p.department_id)}</TableCell>
                      <TableCell>{p.duration_years}y</TableCell>
                      <TableCell><Badge variant="outline">{p.degree_type || "UG"}</Badge></TableCell>
                      <TableCell>{p.intake_capacity || "—"}</TableCell>
                      <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status || "active"}</Badge></TableCell>
                      {role === "admin" && (
                        <TableCell><div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div></TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Program</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => update("code", e.target.value)} placeholder="B.TECH-CSE" /></div>
              <div className="space-y-2">
                <Label>Degree Type</Label>
                <Select value={form.degree_type} onValueChange={v => update("degree_type", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="undergraduate">Undergraduate</SelectItem><SelectItem value="postgraduate">Postgraduate</SelectItem><SelectItem value="diploma">Diploma</SelectItem><SelectItem value="doctoral">Doctoral</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Bachelor of Technology in Computer Science" /></div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => update("department_id", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Duration (yrs)</Label><Input type="number" min="1" max="8" value={form.duration_years} onChange={e => update("duration_years", e.target.value)} /></div>
              <div className="space-y-2"><Label>Total Credits</Label><Input type="number" value={form.total_credits} onChange={e => update("total_credits", e.target.value)} /></div>
              <div className="space-y-2"><Label>Intake</Label><Input type="number" value={form.intake_capacity} onChange={e => update("intake_capacity", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Eligibility</Label><Input value={form.eligibility} onChange={e => update("eligibility", e.target.value)} placeholder="12th with Math/Physics/Chemistry" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Affiliation</Label><Input value={form.affiliation} onChange={e => update("affiliation", e.target.value)} placeholder="JNTU Hyderabad" /></div>
              <div className="space-y-2"><Label>Accreditation</Label><Input value={form.accreditation} onChange={e => update("accreditation", e.target.value)} placeholder="NBA Accredited" /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
