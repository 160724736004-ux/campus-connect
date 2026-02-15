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

export default function Departments() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", hod_id: "", email: "", phone: "", building: "", status: "active" });

  const fetchData = async () => {
    setLoading(true);
    const [dRes, rRes] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("user_roles").select("user_id").in("role", ["faculty", "hod"]),
    ]);
    const fIds = (rRes.data || []).map((r: any) => r.user_id);
    let faculty: any[] = [];
    if (fIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", fIds);
      faculty = data || [];
    }
    setDepartments(dRes.data || []);
    setFacultyList(faculty);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditId(null); setForm({ name: "", code: "", hod_id: "", email: "", phone: "", building: "", status: "active" }); setDialogOpen(true); };
  const openEdit = (d: any) => { setEditId(d.id); setForm({ name: d.name, code: d.code, hod_id: d.hod_id || "", email: d.email || "", phone: d.phone || "", building: d.building || "", status: d.status || "active" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const payload = { name: form.name, code: form.code, hod_id: form.hod_id || null, email: form.email || null, phone: form.phone || null, building: form.building || null, status: form.status };
    if (editId) {
      const { error } = await supabase.from("departments").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Department updated" });
    } else {
      const { error } = await supabase.from("departments").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Department created" });
    }
    setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Department deleted" }); fetchData();
  };

  const getHodName = (id: string | null) => facultyList.find(f => f.id === id)?.full_name || "—";
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground">Manage academic departments</p>
          </div>
          {role === "admin" && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Department</Button>}
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>HOD</TableHead><TableHead>Email</TableHead><TableHead>Building</TableHead><TableHead>Status</TableHead>
                  {role === "admin" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : departments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No departments yet</TableCell></TableRow>
                ) : (
                  departments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">{d.code}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{getHodName(d.hod_id)}</TableCell>
                      <TableCell className="text-sm">{d.email || "—"}</TableCell>
                      <TableCell>{d.building || "—"}</TableCell>
                      <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                      {role === "admin" && (
                        <TableCell><div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Department</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={e => update("code", e.target.value)} placeholder="e.g. CSE" /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Computer Science & Engineering" /></div>
            <div className="space-y-2">
              <Label>HOD</Label>
              <Select value={form.hod_id} onValueChange={v => update("hod_id", v)}><SelectTrigger><SelectValue placeholder="Select HOD" /></SelectTrigger>
                <SelectContent>{facultyList.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => update("email", e.target.value)} placeholder="cse@college.edu" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91-..." /></div>
            </div>
            <div className="space-y-2"><Label>Building / Block</Label><Input value={form.building} onChange={e => update("building", e.target.value)} placeholder="Block A" /></div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
