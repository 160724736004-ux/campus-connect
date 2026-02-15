import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CourseRegistrationManager() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const isStudent = role === "student";
  const [windows, setWindows] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [waitlists, setWaitlists] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Window dialog
  const [winDialogOpen, setWinDialogOpen] = useState(false);
  const [winForm, setWinForm] = useState({ academic_year_id: "", semester_id: "", window_type: "regular", start_date: "", end_date: "", min_credits: "16", max_credits: "26" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [winRes, regRes, wlRes, courseRes, semRes, ayRes] = await Promise.all([
      supabase.from("registration_windows" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("course_registrations" as any).select("*").order("registered_at", { ascending: false }),
      supabase.from("registration_waitlists" as any).select("*"),
      supabase.from("courses").select("id, code, title, credits, max_students"),
      supabase.from("semesters" as any).select("*"),
      supabase.from("academic_years" as any).select("*"),
    ]);
    setWindows((winRes.data as any[]) || []);
    setRegistrations((regRes.data as any[]) || []);
    setWaitlists((wlRes.data as any[]) || []);
    setCourses(courseRes.data || []);
    setSemesters((semRes.data as any[]) || []);
    setAcademicYears((ayRes.data as any[]) || []);
    setLoading(false);
  };

  const getCourseName = (id: string) => { const c = courses.find(c => c.id === id); return c ? `${c.code} - ${c.title}` : "—"; };
  const getAYName = (id: string) => academicYears.find(a => a.id === id)?.name || "—";
  const getSemName = (id: string) => semesters.find(s => s.id === id)?.name || "—";

  // Active window check
  const activeWindow = windows.find(w => {
    const now = new Date();
    return new Date(w.start_date) <= now && new Date(w.end_date) >= now && w.status === "open";
  });

  // Student registration
  const handleRegister = async (courseId: string) => {
    if (!user || !activeWindow) return;
    const course = courses.find(c => c.id === courseId);
    // Check capacity
    const courseRegs = registrations.filter(r => r.course_id === courseId && r.status === "registered");
    if (course && courseRegs.length >= course.max_students) {
      // Add to waitlist
      const position = waitlists.filter(w => w.course_id === courseId).length + 1;
      await supabase.from("registration_waitlists" as any).insert({ student_id: user.id, course_id: courseId, position } as any);
      toast({ title: "Added to waitlist", description: `Position: ${position}` }); fetchAll(); return;
    }
    // Check credit limits
    const myRegs = registrations.filter(r => r.student_id === user.id && r.status === "registered");
    const totalCredits = myRegs.reduce((sum, r) => sum + (courses.find(c => c.id === r.course_id)?.credits || 0), 0);
    const newCredits = totalCredits + (course?.credits || 0);
    if (activeWindow && newCredits > (activeWindow.max_credits || 26)) {
      toast({ title: "Credit limit exceeded", description: `Max ${activeWindow.max_credits} credits allowed`, variant: "destructive" }); return;
    }
    await supabase.from("course_registrations" as any).insert({
      student_id: user.id, course_id: courseId, registration_window_id: activeWindow.id,
    } as any);
    toast({ title: "Course registered" }); fetchAll();
  };

  const handleDrop = async (regId: string) => {
    await supabase.from("course_registrations" as any).update({ status: "dropped" } as any).eq("id", regId);
    toast({ title: "Course dropped" }); fetchAll();
  };

  // Admin: window CRUD
  const handleSaveWindow = async () => {
    if (!winForm.start_date || !winForm.end_date) return;
    await supabase.from("registration_windows" as any).insert({
      academic_year_id: winForm.academic_year_id || null,
      semester_id: winForm.semester_id || null,
      window_type: winForm.window_type,
      start_date: winForm.start_date, end_date: winForm.end_date,
      min_credits: parseInt(winForm.min_credits), max_credits: parseInt(winForm.max_credits),
      status: "open",
    } as any);
    toast({ title: "Registration window created" }); setWinDialogOpen(false); fetchAll();
  };

  const toggleWindowStatus = async (id: string, current: string) => {
    const newStatus = current === "open" ? "closed" : "open";
    await supabase.from("registration_windows" as any).update({ status: newStatus } as any).eq("id", id);
    toast({ title: `Window ${newStatus}` }); fetchAll();
  };

  const deleteWindow = async (id: string) => {
    await supabase.from("registration_windows" as any).delete().eq("id", id);
    toast({ title: "Window deleted" }); fetchAll();
  };

  // Admin: approve registration
  const handleApprove = async (regId: string) => {
    await supabase.from("course_registrations" as any).update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() } as any).eq("id", regId);
    toast({ title: "Registration approved" }); fetchAll();
  };

  const myRegistrations = registrations.filter(r => r.student_id === user?.id);
  const myCredits = myRegistrations.filter(r => r.status === "registered" || r.status === "approved")
    .reduce((sum, r) => sum + (courses.find(c => c.id === r.course_id)?.credits || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue={isStudent ? "register" : "windows"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="windows">Registration Windows</TabsTrigger>}
          <TabsTrigger value="register">{isStudent ? "My Registration" : "Registrations"}</TabsTrigger>
          {isAdmin && <TabsTrigger value="waitlists">Waitlists</TabsTrigger>}
        </TabsList>

        {/* Admin: Windows */}
        {isAdmin && (
          <TabsContent value="windows" className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">Registration Windows</h2>
              <Button size="sm" onClick={() => { setWinForm({ academic_year_id: "", semester_id: "", window_type: "regular", start_date: "", end_date: "", min_credits: "16", max_credits: "26" }); setWinDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Window</Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead>Academic Year</TableHead><TableHead>Semester</TableHead><TableHead>Period</TableHead><TableHead>Credits</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {windows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No windows</TableCell></TableRow> :
                   windows.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="capitalize">{w.window_type}</TableCell>
                      <TableCell>{getAYName(w.academic_year_id)}</TableCell>
                      <TableCell>{getSemName(w.semester_id)}</TableCell>
                      <TableCell className="text-sm">{new Date(w.start_date).toLocaleDateString()} — {new Date(w.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{w.min_credits}-{w.max_credits}</TableCell>
                      <TableCell><Badge variant={w.status === "open" ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleWindowStatus(w.id, w.status)}>{w.status}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteWindow(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        )}

        {/* Registration */}
        <TabsContent value="register" className="space-y-4">
          {isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Registration</CardTitle>
                <CardDescription>
                  {activeWindow ? `Registration open until ${new Date(activeWindow.end_date).toLocaleDateString()} • Credits: ${myCredits}/${activeWindow.max_credits}` : "No active registration window"}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isStudent && activeWindow && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Available Courses</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Credits</TableHead><TableHead>Seats</TableHead><TableHead>Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {courses.map(c => {
                      const regCount = registrations.filter(r => r.course_id === c.id && r.status !== "dropped").length;
                      const isRegistered = myRegistrations.some(r => r.course_id === c.id && r.status !== "dropped");
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.code}</TableCell>
                          <TableCell>{c.title}</TableCell>
                          <TableCell>{c.credits}</TableCell>
                          <TableCell><Badge variant={regCount >= c.max_students ? "destructive" : "outline"}>{regCount}/{c.max_students}</Badge></TableCell>
                          <TableCell>
                            {isRegistered ? <Badge>Registered</Badge> :
                             <Button size="sm" variant="outline" onClick={() => handleRegister(c.id)}>Register</Button>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* My/All Registrations */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{isStudent ? "My Registrations" : "All Registrations"}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead>Registered</TableHead>
                  {isStudent && <TableHead>Action</TableHead>}
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {(isStudent ? myRegistrations : registrations).length === 0 ?
                   <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No registrations</TableCell></TableRow> :
                   (isStudent ? myRegistrations : registrations).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{getCourseName(r.course_id)}</TableCell>
                      <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "dropped" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(r.registered_at).toLocaleDateString()}</TableCell>
                      {isStudent && <TableCell>{r.status === "registered" && <Button size="sm" variant="ghost" onClick={() => handleDrop(r.id)}>Drop</Button>}</TableCell>}
                      {isAdmin && <TableCell>{r.status === "registered" && <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waitlists */}
        {isAdmin && (
          <TabsContent value="waitlists">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Course</TableHead><TableHead>Position</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {waitlists.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No waitlists</TableCell></TableRow> :
                   waitlists.map(w => (
                    <TableRow key={w.id}>
                      <TableCell>{getCourseName(w.course_id)}</TableCell>
                      <TableCell>#{w.position}</TableCell>
                      <TableCell><Badge>{w.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Window Dialog */}
      <Dialog open={winDialogOpen} onOpenChange={setWinDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Registration Window</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Academic Year</Label>
                <Select value={winForm.academic_year_id} onValueChange={v => setWinForm(p => ({ ...p, academic_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Semester</Label>
                <Select value={winForm.semester_id} onValueChange={v => setWinForm(p => ({ ...p, semester_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Type</Label>
              <Select value={winForm.window_type} onValueChange={v => setWinForm(p => ({ ...p, window_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="add_drop">Add/Drop</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="datetime-local" value={winForm.start_date} onChange={e => setWinForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="datetime-local" value={winForm.end_date} onChange={e => setWinForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Credits</Label><Input type="number" value={winForm.min_credits} onChange={e => setWinForm(p => ({ ...p, min_credits: e.target.value }))} /></div>
              <div><Label>Max Credits</Label><Input type="number" value={winForm.max_credits} onChange={e => setWinForm(p => ({ ...p, max_credits: e.target.value }))} /></div>
            </div>
            <Button onClick={handleSaveWindow} className="w-full">Create Window</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
