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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Calendar, Plus, CheckCircle, AlertCircle, BarChart3, FileText, Link2 } from "lucide-react";

export default function LessonPlan() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const canManage = role === "admin" || role === "hod" || role === "faculty";

  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<any[]>([]);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ course_id: "", academic_year_id: "", semester_text: "Odd 2025-26", syllabus_link: "", syllabus_ref: "" });
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [weekForm, setWeekForm] = useState({ lesson_plan_id: "", week_number: "1", topics: "", hours_planned: "2", teaching_methodology: "", assessment_tools: "", references_resources: "" });
  const [markCompleteDialogOpen, setMarkCompleteDialogOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ week_id: "", hours_actual: "" });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, weeksRes, coursesRes, yearsRes, enrollRes, facultyRes] = await Promise.all([
        canManage
          ? supabase.from("lesson_plans" as any).select("*, courses(code, title, department_id), profiles(full_name, department_id)")
          : supabase.from("lesson_plans" as any).select("*, courses(code, title, department_id), profiles(full_name, department_id)"),
        supabase.from("lesson_plan_weeks" as any).select("*").order("week_number"),
        supabase.from("courses").select("id, code, title").order("code"),
        supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
        role === "student" && user ? supabase.from("enrollments" as any).select("course_id").eq("student_id", user.id) : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id, full_name, department_id").limit(500),
      ]);
      let plans = plansRes.data || [];
      if (role === "faculty" && user) plans = plans.filter((p: any) => p.faculty_id === user.id);
      if (role === "hod" && user) {
        const prof = facultyRes.data?.find((f: any) => f.id === user.id);
        const deptId = (prof as any)?.department_id;
        if (deptId) plans = plans.filter((p: any) => p.courses?.department_id === deptId);
      }
      setLessonPlans(plans);
      setWeeks(weeksRes.data || []);
      setCourses(coursesRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setEnrollments(enrollRes.data || []);
      setFacultyProfiles(facultyRes.data || []);
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const getWeeksForPlan = (planId: string) => weeks.filter((w: any) => w.lesson_plan_id === planId);
  const getPlanById = (id: string) => lessonPlans.find((p: any) => p.id === id);
  const studentCourseIds = enrollments.map((e: any) => e.course_id);
  const studentPlans = lessonPlans.filter((p: any) => studentCourseIds.includes(p.course_id));

  const handleCreatePlan = async () => {
    if (!planForm.course_id || !user) return;
    const { error } = await supabase.from("lesson_plans" as any).upsert({
      course_id: planForm.course_id,
      faculty_id: user.id,
      academic_year_id: planForm.academic_year_id || null,
      semester_text: planForm.semester_text,
      syllabus_link: planForm.syllabus_link || null,
      syllabus_ref: planForm.syllabus_ref || null,
      status: "active",
    }, { onConflict: "course_id,faculty_id,semester_text" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lesson plan created/updated" }); setPlanDialogOpen(false); setPlanForm({ course_id: "", academic_year_id: "", semester_text: "Odd 2025-26", syllabus_link: "", syllabus_ref: "" }); fetchData();
  };

  const handleAddWeek = async () => {
    if (!weekForm.lesson_plan_id || !weekForm.topics) return;
    const { error } = await supabase.from("lesson_plan_weeks" as any).upsert({
      lesson_plan_id: weekForm.lesson_plan_id,
      week_number: parseInt(weekForm.week_number) || 1,
      topics: weekForm.topics,
      hours_planned: parseFloat(weekForm.hours_planned) || 0,
      teaching_methodology: weekForm.teaching_methodology || null,
      assessment_tools: weekForm.assessment_tools || null,
      references_resources: weekForm.references_resources || null,
    }, { onConflict: "lesson_plan_id,week_number" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const plan = getPlanById(weekForm.lesson_plan_id);
    if (plan) await supabase.rpc("update_lesson_plan_progress" as any, { p_lesson_plan_id: plan.id });
    toast({ title: "Week added/updated" }); setWeekDialogOpen(false); setWeekForm({ lesson_plan_id: "", week_number: "1", topics: "", hours_planned: "2", teaching_methodology: "", assessment_tools: "", references_resources: "" }); fetchData();
  };

  const handleMarkComplete = async () => {
    if (!completeForm.week_id) return;
    const { error } = await supabase.from("lesson_plan_weeks" as any).update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      hours_actual: parseFloat(completeForm.hours_actual) || null,
    }).eq("id", completeForm.week_id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    const week = weeks.find((w: any) => w.id === completeForm.week_id);
    if (week) await supabase.rpc("update_lesson_plan_progress" as any, { p_lesson_plan_id: week.lesson_plan_id });
    toast({ title: "Week marked complete" }); setMarkCompleteDialogOpen(false); setCompleteForm({ week_id: "", hours_actual: "" }); fetchData();
  };

  const behindScheduleCount = lessonPlans.reduce((acc, p) => acc + getWeeksForPlan(p.id).filter((w: any) => w.behind_schedule).length, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lesson Plan Management</h1>
          <p className="text-muted-foreground">Week-wise topics, syllabus link, hour allocation, teaching methodology, assessment tools, actual vs planned tracking</p>
        </div>

        <Tabs defaultValue={role === "student" ? "upcoming" : "my-plans"}>
          <TabsList>
            {canManage && <TabsTrigger value="my-plans"><BookOpen className="h-4 w-4 mr-1" />{role === "faculty" ? "My Lesson Plans" : "Lesson Plans"}</TabsTrigger>}
            {(role === "admin" || role === "hod") && <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" />HOD Reports</TabsTrigger>}
            {role === "student" && <TabsTrigger value="upcoming"><Calendar className="h-4 w-4 mr-1" />Upcoming Topics</TabsTrigger>}
          </TabsList>

          {/* My Lesson Plans (Faculty) / All Plans (HOD/Admin) */}
          <TabsContent value="my-plans" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Lesson Plans</CardTitle><p className="text-sm text-muted-foreground">Create plan at semester start, add week-wise topics, link syllabus, mark completion</p></div>
                  {role === "faculty" && <Button onClick={() => setPlanDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Lesson Plan</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : lessonPlans.length === 0 ? <p className="text-sm text-muted-foreground">No lesson plans</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Faculty</TableHead><TableHead>Semester</TableHead><TableHead>Syllabus</TableHead><TableHead>Coverage</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                    <TableBody>
                      {lessonPlans.map((p: any) => {
                        const planWeeks = getWeeksForPlan(p.id);
                        const coverage = p.coverage_percent ?? (planWeeks.length ? (planWeeks.filter((w: any) => w.is_completed).length / planWeeks.length * 100) : 0);
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{p.courses?.code} – {p.courses?.title}</TableCell>
                            <TableCell>{p.profiles?.full_name || "—"}</TableCell>
                            <TableCell>{p.semester_text}</TableCell>
                            <TableCell>{p.syllabus_link ? <a href={p.syllabus_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" />Link</a> : p.syllabus_ref || "—"}</TableCell>
                            <TableCell><Progress value={coverage} className="w-20 h-2" /><span className="text-xs ml-2">{coverage.toFixed(0)}%</span></TableCell>
                            <TableCell>{p.total_hours_actual ?? 0}/{p.total_hours_planned ?? 0}</TableCell>
                            <TableCell><Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                            {canManage && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => { setWeekForm((f) => ({ ...f, lesson_plan_id: p.id, week_number: String(planWeeks.length + 1) })); setWeekDialogOpen(true); }}>Add Week</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setSelectedPlanId(p.id)}>View Weeks</Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedPlanId && (
              <Card>
                <CardHeader><CardTitle>Week-wise Topics – {getPlanById(selectedPlanId)?.courses?.code}</CardTitle><Button variant="ghost" size="sm" onClick={() => setSelectedPlanId(null)}>Close</Button></CardHeader>
                <CardContent>
                  {getWeeksForPlan(selectedPlanId).length === 0 ? <p className="text-sm text-muted-foreground">No weeks added</p> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Week</TableHead><TableHead>Topics</TableHead><TableHead>Hours (Planned/Actual)</TableHead><TableHead>Methodology</TableHead><TableHead>Assessment</TableHead><TableHead>References</TableHead><TableHead>Status</TableHead>{role === "faculty" && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                      <TableBody>
                        {getWeeksForPlan(selectedPlanId).map((w: any) => (
                          <TableRow key={w.id} className={w.behind_schedule ? "bg-destructive/5" : ""}>
                            <TableCell>Week {w.week_number}</TableCell>
                            <TableCell className="max-w-xs truncate">{w.topics}</TableCell>
                            <TableCell>{w.hours_actual ?? "—"}/{w.hours_planned}</TableCell>
                            <TableCell className="max-w-[120px] truncate text-xs">{w.teaching_methodology || "—"}</TableCell>
                            <TableCell className="max-w-[120px] truncate text-xs">{w.assessment_tools || "—"}</TableCell>
                            <TableCell className="max-w-[120px] truncate text-xs">{w.references_resources || "—"}</TableCell>
                            <TableCell>
                              {w.is_completed ? <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge> : w.behind_schedule ? <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Behind</Badge> : <Badge variant="outline">Planned</Badge>}
                            </TableCell>
                            {role === "faculty" && !w.is_completed && (
                              <TableCell><Button size="sm" onClick={() => { setCompleteForm({ week_id: w.id, hours_actual: String(w.hours_planned || "") }); setMarkCompleteDialogOpen(true); }}>Mark Complete</Button></TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* HOD Reports */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Syllabus Coverage & Monitoring</CardTitle><p className="text-sm text-muted-foreground">Reports for accreditation, behind schedule alerts</p></CardHeader>
              <CardContent>
                {behindScheduleCount > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span><strong>{behindScheduleCount}</strong> week(s) behind schedule across lesson plans</span>
                  </div>
                )}
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : lessonPlans.length === 0 ? <p className="text-sm text-muted-foreground">No lesson plans to report</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Faculty</TableHead><TableHead>Semester</TableHead><TableHead>Coverage %</TableHead><TableHead>Planned vs Actual (hrs)</TableHead><TableHead>Behind Schedule</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lessonPlans.map((p: any) => {
                        const planWeeks = getWeeksForPlan(p.id);
                        const behind = planWeeks.filter((w: any) => w.behind_schedule).length;
                        const coverage = p.coverage_percent ?? (planWeeks.length ? (planWeeks.filter((w: any) => w.is_completed).length / planWeeks.length * 100) : 0);
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{p.courses?.code}</TableCell>
                            <TableCell>{p.profiles?.full_name || "—"}</TableCell>
                            <TableCell>{p.semester_text}</TableCell>
                            <TableCell>{coverage.toFixed(1)}%</TableCell>
                            <TableCell>{p.total_hours_actual ?? 0} / {p.total_hours_planned ?? 0}</TableCell>
                            <TableCell>{behind > 0 ? <Badge variant="destructive">{behind} week(s)</Badge> : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student: Upcoming Topics */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Upcoming Topics (My Courses)</CardTitle><p className="text-sm text-muted-foreground">Week-wise topics planned by faculty</p></CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : studentPlans.length === 0 ? <p className="text-sm text-muted-foreground">No lesson plans available for your enrolled courses</p> : (
                  <div className="space-y-6">
                    {studentPlans.map((p: any) => {
                      const planWeeks = getWeeksForPlan(p.id).sort((a: any, b: any) => a.week_number - b.week_number);
                      const upcoming = planWeeks.filter((w: any) => !w.is_completed);
                      return (
                        <div key={p.id} className="border rounded-lg p-4">
                          <h3 className="font-semibold">{p.courses?.code} – {p.courses?.title}</h3>
                          <p className="text-sm text-muted-foreground">{p.semester_text}</p>
                          {upcoming.length === 0 ? <p className="text-sm mt-2 text-muted-foreground">All topics completed</p> : (
                            <ul className="mt-3 space-y-2">
                              {upcoming.slice(0, 5).map((w: any) => (
                                <li key={w.id} className="flex gap-2 text-sm">
                                  <span className="font-medium text-muted-foreground">Week {w.week_number}:</span>
                                  <span>{w.topics}</span>
                                  <span className="text-muted-foreground">({w.hours_planned}h)</span>
                                </li>
                              ))}
                              {upcoming.length > 5 && <li className="text-xs text-muted-foreground">+{upcoming.length - 5} more weeks</li>}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>New Lesson Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Course</Label><Select value={planForm.course_id} onValueChange={(v) => setPlanForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Academic Year</Label><Select value={planForm.academic_year_id} onValueChange={(v) => setPlanForm((f) => ({ ...f, academic_year_id: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem>{academicYears.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name || y.start_date}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Semester</Label><Input value={planForm.semester_text} onChange={(e) => setPlanForm((f) => ({ ...f, semester_text: e.target.value }))} placeholder="e.g. Odd 2025-26" /></div>
              <div><Label>Syllabus Link (URL)</Label><Input value={planForm.syllabus_link} onChange={(e) => setPlanForm((f) => ({ ...f, syllabus_link: e.target.value }))} placeholder="https://..." /></div>
              <div><Label>Syllabus Ref</Label><Input value={planForm.syllabus_ref} onChange={(e) => setPlanForm((f) => ({ ...f, syllabus_ref: e.target.value }))} placeholder="Curriculum/syllabus reference" /></div>
              <Button onClick={handleCreatePlan}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={weekDialogOpen} onOpenChange={setWeekDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Add Week</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Lesson Plan</Label><Select value={weekForm.lesson_plan_id} onValueChange={(v) => setWeekForm((f) => ({ ...f, lesson_plan_id: v }))}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent>{lessonPlans.filter((p: any) => role === "faculty" ? p.faculty_id === user?.id : true).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.courses?.code} – {p.semester_text}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Week Number</Label><Input type="number" value={weekForm.week_number} onChange={(e) => setWeekForm((f) => ({ ...f, week_number: e.target.value }))} /></div>
              <div><Label>Topics</Label><Textarea value={weekForm.topics} onChange={(e) => setWeekForm((f) => ({ ...f, topics: e.target.value }))} placeholder="Topics to be covered" rows={3} /></div>
              <div><Label>Hours Planned</Label><Input type="number" value={weekForm.hours_planned} onChange={(e) => setWeekForm((f) => ({ ...f, hours_planned: e.target.value }))} /></div>
              <div><Label>Teaching Methodology</Label><Input value={weekForm.teaching_methodology} onChange={(e) => setWeekForm((f) => ({ ...f, teaching_methodology: e.target.value }))} placeholder="e.g. Lecture, Demo, Discussion" /></div>
              <div><Label>Assessment Tools</Label><Input value={weekForm.assessment_tools} onChange={(e) => setWeekForm((f) => ({ ...f, assessment_tools: e.target.value }))} placeholder="e.g. Quiz, Assignment" /></div>
              <div><Label>References & Resources</Label><Textarea value={weekForm.references_resources} onChange={(e) => setWeekForm((f) => ({ ...f, references_resources: e.target.value }))} placeholder="Books, links, materials" rows={2} /></div>
              <Button onClick={handleAddWeek}>Add Week</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={markCompleteDialogOpen} onOpenChange={setMarkCompleteDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Mark Week Complete</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Hours Actual</Label><Input type="number" value={completeForm.hours_actual} onChange={(e) => setCompleteForm((f) => ({ ...f, hours_actual: e.target.value }))} placeholder="Hours spent" /></div>
              <Button onClick={handleMarkComplete}>Mark Complete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
