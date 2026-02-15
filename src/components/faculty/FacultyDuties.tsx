import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Shield } from "lucide-react";

const DUTY_TYPES = [
  { value: "class_teacher", label: "Class Teacher" },
  { value: "hod", label: "HOD" },
  { value: "programme_coordinator", label: "Programme Coordinator" },
  { value: "exam_coordinator", label: "Exam Coordinator" },
  { value: "placement_coordinator", label: "Placement Coordinator" },
  { value: "timetable_coordinator", label: "Timetable Coordinator" },
  { value: "mentor", label: "Mentor" },
  { value: "committee_member", label: "Committee Member" },
  { value: "administrative", label: "Administrative" },
  { value: "additional_charge", label: "Additional Charge" },
];

export function FacultyDuties() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [faculty, setFaculty] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [newDuty, setNewDuty] = useState({
    faculty_id: "", duty_type: "", title: "", description: "",
    start_date: new Date().toISOString().slice(0, 10), end_date: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [facRes, rolesRes, dutiesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, employee_id, department_id").order("full_name"),
      supabase.from("user_roles").select("user_id").eq("role", "faculty"),
      supabase.from("faculty_duties").select("*").order("created_at", { ascending: false }),
    ]);
    const facultyIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    setFaculty((facRes.data || []).filter((p: any) => facultyIds.has(p.id)));
    setDuties(dutiesRes.data || []);
  };

  const handleAssign = async () => {
    if (!newDuty.faculty_id || !newDuty.duty_type || !newDuty.title) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("faculty_duties").insert({
      faculty_id: newDuty.faculty_id,
      duty_type: newDuty.duty_type,
      title: newDuty.title,
      description: newDuty.description || null,
      start_date: newDuty.start_date,
      end_date: newDuty.end_date || null,
      assigned_by: user?.id,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Duty assigned" });
    setDialogOpen(false);
    setNewDuty({ faculty_id: "", duty_type: "", title: "", description: "", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
    fetchData();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("faculty_duties").delete().eq("id", id);
    toast({ title: "Duty removed" });
    fetchData();
  };

  const handleStatusToggle = async (id: string, current: string) => {
    const newStatus = current === "active" ? "completed" : "active";
    await supabase.from("faculty_duties").update({ status: newStatus } as any).eq("id", id);
    toast({ title: `Status changed to ${newStatus}` });
    fetchData();
  };

  const getFacultyName = (id: string) => faculty.find((f) => f.id === id)?.full_name || "—";
  const getDutyLabel = (type: string) => DUTY_TYPES.find((d) => d.value === type)?.label || type;

  const filtered = filterType === "all" ? duties : duties.filter((d) => d.duty_type === filterType);

  // Summary counts
  const activeDuties = duties.filter((d) => d.status === "active").length;
  const dutyByType = DUTY_TYPES.map((t) => ({
    ...t, count: duties.filter((d) => d.duty_type === t.value && d.status === "active").length,
  })).filter((t) => t.count > 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Active Duties</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeDuties}</div></CardContent>
        </Card>
        {dutyByType.slice(0, 3).map((t) => (
          <Card key={t.value}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{t.count}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Duties Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Faculty Duties</CardTitle>
            <CardDescription>Manage administrative and academic duties</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DUTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Assign Duty</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Duty</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Faculty *</Label>
                      <Select value={newDuty.faculty_id} onValueChange={(v) => setNewDuty((p) => ({ ...p, faculty_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                        <SelectContent>{faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duty Type *</Label>
                      <Select value={newDuty.duty_type} onValueChange={(v) => setNewDuty((p) => ({ ...p, duty_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{DUTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Title *</Label><Input value={newDuty.title} onChange={(e) => setNewDuty((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Class Teacher for CSE-A" /></div>
                    <div><Label>Description</Label><Textarea value={newDuty.description} onChange={(e) => setNewDuty((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Start Date</Label><Input type="date" value={newDuty.start_date} onChange={(e) => setNewDuty((p) => ({ ...p, start_date: e.target.value }))} /></div>
                      <div><Label>End Date</Label><Input type="date" value={newDuty.end_date} onChange={(e) => setNewDuty((p) => ({ ...p, end_date: e.target.value }))} /></div>
                    </div>
                    <Button onClick={handleAssign} className="w-full">Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No duties assigned</TableCell></TableRow>
              ) : filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{getFacultyName(d.faculty_id)}</TableCell>
                  <TableCell><Badge variant="secondary">{getDutyLabel(d.duty_type)}</Badge></TableCell>
                  <TableCell>{d.title}</TableCell>
                  <TableCell>{d.start_date}</TableCell>
                  <TableCell>{d.end_date || "Ongoing"}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "active" ? "default" : "outline"} className="cursor-pointer" onClick={() => isAdmin && handleStatusToggle(d.id, d.status)}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
