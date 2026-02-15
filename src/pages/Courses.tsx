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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, UserPlus, Calendar, Search } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Courses() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Course dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCredits, setFormCredits] = useState("3");
  const [formDept, setFormDept] = useState("");
  const [formFaculty, setFormFaculty] = useState("");
  const [formSemester, setFormSemester] = useState("Fall 2026");
  const [formMax, setFormMax] = useState("50");
  const [formDesc, setFormDesc] = useState("");
  const [formPrereqs, setFormPrereqs] = useState("");

  // Schedule dialog
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedCourse, setSchedCourse] = useState("");
  const [schedDay, setSchedDay] = useState("1");
  const [schedStart, setSchedStart] = useState("09:00");
  const [schedEnd, setSchedEnd] = useState("10:00");
  const [schedRoom, setSchedRoom] = useState("");
  const [schedEditId, setSchedEditId] = useState<string | null>(null);

  const canManage = role === "admin" || role === "hod";

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, deptsRes, rolesRes, schedsRes] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("departments").select("*"),
      supabase.from("user_roles").select("user_id").eq("role", "faculty"),
      supabase.from("course_schedules").select("*"),
    ]);
    const facultyIds = (rolesRes.data || []).map((r: any) => r.user_id);
    let facultyProfiles: any[] = [];
    if (facultyIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", facultyIds);
      facultyProfiles = data || [];
    }
    if (role === "student" && user) {
      const { data } = await supabase.from("enrollments").select("*").eq("student_id", user.id);
      setEnrollments(data || []);
    }
    setCourses(coursesRes.data || []);
    setDepartments(deptsRes.data || []);
    setFacultyList(facultyProfiles);
    setSchedules(schedsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [role]);

  const openCreate = () => {
    setEditId(null); setFormCode(""); setFormTitle(""); setFormCredits("3"); setFormDept(""); setFormFaculty("");
    setFormSemester("Fall 2026"); setFormMax("50"); setFormDesc(""); setFormPrereqs(""); setDialogOpen(true);
  };
  const openEdit = (c: any) => {
    setEditId(c.id); setFormCode(c.code); setFormTitle(c.title); setFormCredits(String(c.credits));
    setFormDept(c.department_id || ""); setFormFaculty(c.faculty_id || ""); setFormSemester(c.semester);
    setFormMax(String(c.max_students)); setFormDesc(c.description || ""); setFormPrereqs(c.prerequisites || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCode.trim() || !formTitle.trim()) return;
    const payload = {
      code: formCode, title: formTitle, credits: parseInt(formCredits), department_id: formDept || null,
      faculty_id: formFaculty || null, semester: formSemester, max_students: parseInt(formMax),
      description: formDesc || null, prerequisites: formPrereqs || null,
    };
    if (editId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Course updated" });
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Course created" });
    }
    setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Course deleted" }); fetchData();
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    // Check prerequisites
    const course = courses.find(c => c.id === courseId);
    if (course?.prerequisites) {
      const prereqCodes = course.prerequisites.split(",").map((p: string) => p.trim());
      const enrolledCourseIds = enrollments.filter(e => e.status === "completed" || e.status === "enrolled").map(e => e.course_id);
      const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
      const enrolledCodes = enrolledCourses.map(c => c.code);
      const missing = prereqCodes.filter((p: string) => !enrolledCodes.includes(p));
      if (missing.length > 0) {
        toast({ title: "Prerequisites not met", description: `You need: ${missing.join(", ")}`, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase.from("enrollments").insert({ student_id: user.id, course_id: courseId, semester: "Fall 2026" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Enrolled successfully!" }); fetchData();
  };

  // Schedule management
  const openAddSchedule = (courseId: string) => {
    setSchedEditId(null); setSchedCourse(courseId); setSchedDay("1"); setSchedStart("09:00"); setSchedEnd("10:00"); setSchedRoom("");
    setSchedDialogOpen(true);
  };
  const openEditSchedule = (s: any) => {
    setSchedEditId(s.id); setSchedCourse(s.course_id); setSchedDay(String(s.day_of_week)); setSchedStart(s.start_time?.slice(0,5)); setSchedEnd(s.end_time?.slice(0,5)); setSchedRoom(s.room || "");
    setSchedDialogOpen(true);
  };
  const handleSaveSchedule = async () => {
    const payload = { course_id: schedCourse, day_of_week: parseInt(schedDay), start_time: schedStart, end_time: schedEnd, room: schedRoom || null };
    if (schedEditId) {
      const { error } = await supabase.from("course_schedules").update(payload).eq("id", schedEditId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("course_schedules").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Schedule saved" }); setSchedDialogOpen(false); fetchData();
  };
  const handleDeleteSchedule = async (id: string) => {
    await supabase.from("course_schedules").delete().eq("id", id);
    toast({ title: "Schedule removed" }); fetchData();
  };

  const getDeptName = (id: string | null) => departments.find((d) => d.id === id)?.name || "—";
  const getFacultyName = (id: string | null) => facultyList.find((f) => f.id === id)?.full_name || "—";
  const isEnrolled = (courseId: string) => enrollments.some((e) => e.course_id === courseId && e.status === "enrolled");
  const getCourseSchedules = (courseId: string) => schedules.filter(s => s.course_id === courseId);

  const filtered = courses.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground">
              {canManage ? "Manage course catalog & scheduling" : role === "student" ? "Browse and enroll in courses" : "Your assigned courses"}
            </p>
          </div>
          {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Course</Button>}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="catalog">
          <TabsList>
            <TabsTrigger value="catalog">Course Catalog</TabsTrigger>
            {(canManage || role === "faculty") && <TabsTrigger value="schedules">Class Schedules</TabsTrigger>}
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Prerequisites</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No courses found</TableCell></TableRow>
                    ) : (
                      filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.code}</TableCell>
                          <TableCell className="font-medium">{c.title}</TableCell>
                          <TableCell>{c.credits}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.prerequisites || "None"}</TableCell>
                          <TableCell>{getDeptName(c.department_id)}</TableCell>
                          <TableCell>{getFacultyName(c.faculty_id)}</TableCell>
                          <TableCell><Badge variant="outline">{c.semester}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canManage && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit"><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => openAddSchedule(c.id)} title="Add Schedule"><Calendar className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </>
                              )}
                              {role === "student" && !isEnrolled(c.id) && (
                                <Button variant="outline" size="sm" onClick={() => handleEnroll(c.id)}><UserPlus className="h-4 w-4 mr-1" />Enroll</Button>
                              )}
                              {role === "student" && isEnrolled(c.id) && <Badge>Enrolled</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {(canManage || role === "faculty") && (
            <TabsContent value="schedules" className="space-y-4">
              {courses.map((c) => {
                const courseScheds = getCourseSchedules(c.id);
                if (role === "faculty" && c.faculty_id !== user?.id) return null;
                return (
                  <Card key={c.id}>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">{c.code} — {c.title}</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => openAddSchedule(c.id)}>
                        <Plus className="h-3 w-3 mr-1" />Add Slot
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {courseScheds.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-6 pb-4">No schedule set</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Day</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Room</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {courseScheds.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell>{DAYS[s.day_of_week]}</TableCell>
                                <TableCell>{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</TableCell>
                                <TableCell>{s.room || "TBD"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditSchedule(s)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Course</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Code</Label><Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="CS101" /></div>
              <div className="space-y-2"><Label>Credits</Label><Input type="number" min="1" max="12" value={formCredits} onChange={(e) => setFormCredits(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Title</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Introduction to CS" /></div>
            <div className="space-y-2"><Label>Prerequisites</Label><Input value={formPrereqs} onChange={(e) => setFormPrereqs(e.target.value)} placeholder="CS100, MATH101 (comma-separated course codes)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formDept} onValueChange={setFormDept}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Faculty</Label>
                <Select value={formFaculty} onValueChange={setFormFaculty}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{facultyList.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Semester</Label><Input value={formSemester} onChange={(e) => setFormSemester(e.target.value)} /></div>
              <div className="space-y-2"><Label>Max Students</Label><Input type="number" value={formMax} onChange={(e) => setFormMax(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{schedEditId ? "Edit" : "Add"} Class Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={schedDay} onValueChange={setSchedDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Time</Label><Input type="time" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Room</Label><Input value={schedRoom} onChange={(e) => setSchedRoom(e.target.value)} placeholder="e.g. Room 301" /></div>
            <Button onClick={handleSaveSchedule} className="w-full">Save Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
