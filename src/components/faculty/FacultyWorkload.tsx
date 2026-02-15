import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function FacultyWorkload() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [faculty, setFaculty] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssign, setNewAssign] = useState({ course_id: "", section_id: "", hours_per_week: 4 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [facRes, courseRes, secRes, assignRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, employee_id, department_id").order("full_name"),
      supabase.from("courses").select("id, code, title, credits, contact_hours, faculty_id"),
      supabase.from("sections").select("id, name, batch_id"),
      supabase.from("faculty_workload_assignments").select("*"),
    ]);
    // Filter faculty by role
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "faculty");
    const facultyIds = new Set((roles || []).map((r: any) => r.user_id));
    setFaculty((facRes.data || []).filter((p: any) => facultyIds.has(p.id)));
    setCourses(courseRes.data || []);
    setSections(secRes.data || []);
    setAssignments(assignRes.data || []);
  };

  const facultyAssignments = assignments.filter((a) => a.faculty_id === selectedFaculty);
  const totalHours = facultyAssignments.reduce((sum: number, a: any) => sum + (a.hours_per_week || 0), 0);
  const maxHours = facultyAssignments[0]?.max_hours_per_week || 18;
  const loadPercent = Math.min(100, (totalHours / maxHours) * 100);

  const handleAssign = async () => {
    if (!selectedFaculty || !newAssign.course_id) {
      toast({ title: "Select faculty and course", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("faculty_workload_assignments").insert({
      faculty_id: selectedFaculty,
      course_id: newAssign.course_id,
      section_id: newAssign.section_id || null,
      hours_per_week: newAssign.hours_per_week,
      assigned_by: user?.id,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Also update course faculty_id
    await supabase.from("courses").update({ faculty_id: selectedFaculty }).eq("id", newAssign.course_id);
    toast({ title: "Subject assigned" });
    setDialogOpen(false);
    setNewAssign({ course_id: "", section_id: "", hours_per_week: 4 });
    fetchData();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("faculty_workload_assignments").delete().eq("id", id);
    toast({ title: "Assignment removed" });
    fetchData();
  };

  const getCourseName = (id: string) => {
    const c = courses.find((c) => c.id === id);
    return c ? `${c.code} - ${c.title}` : "—";
  };

  const getSectionName = (id: string | null) => {
    if (!id) return "—";
    return sections.find((s) => s.id === id)?.name || "—";
  };

  // Workload summary for all faculty
  const workloadSummary = faculty.map((f) => {
    const fa = assignments.filter((a) => a.faculty_id === f.id);
    const hours = fa.reduce((s: number, a: any) => s + (a.hours_per_week || 0), 0);
    const max = fa[0]?.max_hours_per_week || 18;
    return { ...f, hours, max, courses: fa.length, status: hours === 0 ? "unassigned" : hours < 12 ? "underload" : hours > max ? "overload" : "normal" };
  });

  return (
    <div className="space-y-6">
      {/* Load Distribution Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Load Distribution</CardTitle>
          <CardDescription>Faculty workload overview for current semester</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Hours/Week</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workloadSummary.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No faculty found</TableCell></TableRow>
              ) : workloadSummary.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFaculty(f.id)}>
                  <TableCell className="font-medium">{f.full_name}</TableCell>
                  <TableCell>{f.employee_id || "—"}</TableCell>
                  <TableCell>{f.courses}</TableCell>
                  <TableCell>{f.hours} / {f.max}</TableCell>
                  <TableCell>
                    <Badge variant={f.status === "overload" ? "destructive" : f.status === "underload" ? "secondary" : f.status === "unassigned" ? "outline" : "default"}>
                      {f.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected Faculty Detail */}
      {selectedFaculty && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{faculty.find((f) => f.id === selectedFaculty)?.full_name} — Assignments</CardTitle>
              <CardDescription>
                Total: {totalHours}h / {maxHours}h per week
              </CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Assign Subject</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Subject</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Course *</Label>
                      <Select value={newAssign.course_id} onValueChange={(v) => setNewAssign((p) => ({ ...p, course_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                        <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Section</Label>
                      <Select value={newAssign.section_id} onValueChange={(v) => setNewAssign((p) => ({ ...p, section_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                        <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Hours/Week</Label>
                      <Input type="number" value={newAssign.hours_per_week} onChange={(e) => setNewAssign((p) => ({ ...p, hours_per_week: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <Button onClick={handleAssign} className="w-full">Assign</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <Progress value={loadPercent} className="mb-4" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Hours/Week</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyAssignments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assignments</TableCell></TableRow>
                ) : facultyAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{getCourseName(a.course_id)}</TableCell>
                    <TableCell>{getSectionName(a.section_id)}</TableCell>
                    <TableCell>{a.hours_per_week}</TableCell>
                    <TableCell><Badge>{a.status}</Badge></TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
