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
import { useToast } from "@/hooks/use-toast";
import { BookOpen, FileQuestion, MonitorPlay, Plus, CheckCircle, XCircle, Shuffle, List } from "lucide-react";

export default function QuestionBankAndOnlineExam() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const canManage = role === "admin" || role === "hod" || role === "faculty";

  const [courses, setCourses] = useState<any[]>([]);
  const [courseOutcomes, setCourseOutcomes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [paperSets, setPaperSets] = useState<any[]>([]);
  const [onlineTests, setOnlineTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({ course_id: "", question_type: "mcq", unit: "", topic: "", difficulty: "medium", blooms_level: "", course_outcome_id: "", marks: "1", question_text: "", options: "", correct_answer: "" });
  const [blueprintDialogOpen, setBlueprintDialogOpen] = useState(false);
  const [blueprintForm, setBlueprintForm] = useState({ course_id: "", name: "", total_marks: "70", num_sets: "3" });
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({ blueprint_id: "", set_label: "A" });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testForm, setTestForm] = useState({ course_id: "", name: "", test_type: "mcq", total_marks: "50", duration_minutes: "60", start_time: "", end_time: "", shuffle_questions: true, auto_submit: true, proctoring_enabled: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, cosRes, qRes, bpRes, psRes, testsRes, attRes] = await Promise.all([
        supabase.from("courses").select("id, code, title").order("code"),
        supabase.from("course_outcomes" as any).select("*, courses(code)"),
        role === "admin" || role === "hod" || role === "faculty"
          ? supabase.from("question_bank_questions" as any).select("*, courses(code, title), course_outcomes(code)").order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("question_paper_blueprints" as any).select("*, courses(code, title)").eq("is_active", true),
        supabase.from("question_paper_sets" as any).select("*, question_paper_blueprints(name, courses(code))"),
        role === "admin" || role === "hod" || role === "faculty"
          ? supabase.from("online_tests" as any).select("*, courses(code, title)").order("start_time", { ascending: false })
          : supabase.from("online_tests" as any).select("*, courses(code, title)").in("status", ["scheduled", "active", "completed"]).order("start_time", { ascending: false }),
        role === "admin" || role === "hod" || role === "faculty"
          ? supabase.from("online_test_attempts" as any).select("*, online_tests(name, courses(code)), profiles(full_name)").order("started_at", { ascending: false })
          : supabase.from("online_test_attempts" as any).select("*, online_tests(name, courses(code))").eq("student_id", user?.id || "").order("started_at", { ascending: false }),
      ]);
      setCourses(coursesRes.data || []);
      setCourseOutcomes(cosRes.data || []);
      setQuestions(qRes.data || []);
      setBlueprints(bpRes.data || []);
      setPaperSets(psRes.data || []);
      setOnlineTests(testsRes.data || []);
      setAttempts(attRes.data || []);
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.code || courses.find((c) => c.id === id)?.title || "—";
  const getStudentName = (id: string) => attempts.find((a: any) => a.student_id === id)?.profiles?.full_name || "—";

  const handleCreateQuestion = async () => {
    let optionsJson = null;
    if (questionForm.question_type === "mcq" && questionForm.options) {
      try {
        optionsJson = JSON.parse(questionForm.options);
      } catch {
        optionsJson = questionForm.options.split("\n").map((o, i) => ({ key: String.fromCharCode(65 + i), text: o }));
      }
    }
    const { error } = await supabase.from("question_bank_questions" as any).insert({
      course_id: questionForm.course_id, question_type: questionForm.question_type, unit: questionForm.unit || null, topic: questionForm.topic || null, difficulty: questionForm.difficulty, blooms_level: questionForm.blooms_level || null, course_outcome_id: questionForm.course_outcome_id || null, marks: parseFloat(questionForm.marks) || 1, question_text: questionForm.question_text, options: optionsJson, correct_answer: questionForm.correct_answer || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Question added" }); setQuestionDialogOpen(false); setQuestionForm({ course_id: "", question_type: "mcq", unit: "", topic: "", difficulty: "medium", blooms_level: "", course_outcome_id: "", marks: "1", question_text: "", options: "", correct_answer: "" }); fetchData();
  };

  const handleApproveQuestion = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_question_bank_question" as any, { p_question_id: id, p_status: status });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Question approved" : "Question rejected" }); fetchData();
  };

  const handleCreateBlueprint = async () => {
    const { error } = await supabase.from("question_paper_blueprints" as any).insert({
      course_id: blueprintForm.course_id, name: blueprintForm.name, total_marks: parseFloat(blueprintForm.total_marks) || 70, num_sets: parseInt(blueprintForm.num_sets) || 1,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Blueprint created" }); setBlueprintDialogOpen(false); setBlueprintForm({ course_id: "", name: "", total_marks: "70", num_sets: "3" }); fetchData();
  };

  const handleGeneratePaper = async () => {
    const blueprint = blueprints.find((b) => b.id === generateForm.blueprint_id);
    if (!blueprint) return;
    const courseQs = questions.filter((q: any) => q.course_id === blueprint.course_id && q.status === "approved");
    if (courseQs.length === 0) { toast({ title: "No approved questions", variant: "destructive" }); return; }
    const { data: setRow, error: setErr } = await supabase.from("question_paper_sets" as any).insert({ blueprint_id: generateForm.blueprint_id, set_label: generateForm.set_label, generated_by: user?.id }).select("id").single();
    if (setErr) { toast({ title: "Error", description: setErr.message, variant: "destructive" }); return; }
    const shuffled = [...courseQs].sort(() => Math.random() - 0.5);
    const totalMarks = parseFloat(blueprint.total_marks || 70);
    const perQ = totalMarks / Math.min(shuffled.length, 10);
    for (let i = 0; i < Math.min(shuffled.length, 15); i++) {
      await supabase.from("question_paper_set_questions" as any).insert({ paper_set_id: setRow.id, question_id: shuffled[i].id, sequence: i + 1, marks: perQ });
    }
    toast({ title: "Paper generated", description: `Set ${generateForm.set_label} with ${Math.min(shuffled.length, 15)} questions` }); setGenerateDialogOpen(false); setGenerateForm({ blueprint_id: "", set_label: "A" }); fetchData();
  };

  const handleCreateTest = async () => {
    const { error } = await supabase.from("online_tests" as any).insert({
      course_id: testForm.course_id, name: testForm.name, test_type: testForm.test_type, total_marks: parseFloat(testForm.total_marks) || 50, duration_minutes: parseInt(testForm.duration_minutes) || 60, start_time: testForm.start_time, end_time: testForm.end_time, shuffle_questions: testForm.shuffle_questions, auto_submit: testForm.auto_submit, proctoring_enabled: testForm.proctoring_enabled, status: "scheduled", created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Test created" }); setTestDialogOpen(false); setTestForm({ course_id: "", name: "", test_type: "mcq", total_marks: "50", duration_minutes: "60", start_time: "", end_time: "", shuffle_questions: true, auto_submit: true, proctoring_enabled: false }); fetchData();
  };

  const handleStartTest = async (testId: string) => {
    const { error } = await supabase.rpc("start_online_test_attempt" as any, { p_test_id: testId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Test started", description: "Navigate to the exam interface" }); fetchData();
    window.location.href = `/online-exam/${testId}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank & Online Examination</h1>
          <p className="text-muted-foreground">Subject-wise question repository, paper generation, online tests, proctoring, analytics</p>
        </div>

        <Tabs defaultValue={role === "student" ? "my-tests" : "questions"}>
          <TabsList>
            {role === "student" && <TabsTrigger value="my-tests"><MonitorPlay className="h-4 w-4 mr-1" />My Online Tests</TabsTrigger>}
            {canManage && <><TabsTrigger value="questions"><BookOpen className="h-4 w-4 mr-1" />Question Bank</TabsTrigger><TabsTrigger value="blueprints"><FileQuestion className="h-4 w-4 mr-1" />Paper Blueprints</TabsTrigger><TabsTrigger value="online-tests"><MonitorPlay className="h-4 w-4 mr-1" />Online Tests</TabsTrigger></>}
          </TabsList>

          {/* My Online Tests (Student) */}
          <TabsContent value="my-tests" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Available & Completed Tests</CardTitle><p className="text-sm text-muted-foreground">Start a test or view your attempts</p></CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    <h3 className="font-semibold mb-2">Available Tests</h3>
                    {onlineTests.filter((t: any) => t.status === "scheduled" || t.status === "active").filter((t: any) => !attempts.some((a: any) => a.test_id === t.id && a.status === "submitted")).length === 0 ? <p className="text-sm text-muted-foreground">No tests available</p> : (
                      <Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Course</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Start–End</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{onlineTests.filter((t: any) => t.status === "scheduled" || t.status === "active").filter((t: any) => !attempts.some((a: any) => a.test_id === t.id && a.status === "submitted")).map((t: any) => (
                        <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>{t.courses?.code}</TableCell><TableCell className="uppercase">{t.test_type}</TableCell><TableCell>{t.duration_minutes} min</TableCell><TableCell>{new Date(t.start_time).toLocaleString()} – {new Date(t.end_time).toLocaleString()}</TableCell><TableCell><Button size="sm" onClick={() => handleStartTest(t.id)}>Start Test</Button></TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">My Attempts</h3>
                    {attempts.length === 0 ? <p className="text-sm text-muted-foreground">No attempts yet</p> : (
                      <Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Course</TableHead><TableHead>Started</TableHead><TableHead>Submitted</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{attempts.map((a: any) => (
                        <TableRow key={a.id}><TableCell>{a.online_tests?.name}</TableCell><TableCell>{a.online_tests?.courses?.code}</TableCell><TableCell>{a.started_at ? new Date(a.started_at).toLocaleString() : "—"}</TableCell><TableCell>{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</TableCell><TableCell>{a.score != null ? `${a.score}/${a.max_score || "—"}` : "—"}</TableCell><TableCell><Badge variant={a.status === "evaluated" ? "default" : a.status === "submitted" ? "secondary" : "outline"}>{a.status}</Badge></TableCell></TableRow>
                      ))}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Question Bank */}
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Question Bank</CardTitle><p className="text-sm text-muted-foreground">MCQ, descriptive, numerical, coding. Unit, topic, difficulty, CO mapping, Blooms level, versioning, review workflow</p></div>
                  {canManage && <Button onClick={() => setQuestionDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Question</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions</p> : (
                  <Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Type</TableHead><TableHead>Unit</TableHead><TableHead>Difficulty</TableHead><TableHead>CO</TableHead><TableHead>Marks</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                  <TableBody>{questions.map((q: any) => (
                    <TableRow key={q.id}><TableCell>{q.courses?.code}</TableCell><TableCell className="uppercase">{q.question_type}</TableCell><TableCell>{q.unit || "—"}</TableCell><TableCell className="capitalize">{q.difficulty}</TableCell><TableCell>{q.course_outcomes?.code || "—"}</TableCell><TableCell>{q.marks}</TableCell><TableCell><Badge variant={q.status === "approved" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge></TableCell>{canManage && <TableCell>{(role === "admin" || role === "hod") && (q.status === "submitted" || q.status === "draft") ? <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => handleApproveQuestion(q.id, "approved")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => handleApproveQuestion(q.id, "rejected")}>Reject</Button></div> : "—"}</TableCell>}</TableRow>
                  ))}</TableBody></Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blueprints */}
          <TabsContent value="blueprints" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Question Paper Blueprints</CardTitle><p className="text-sm text-muted-foreground">Blueprint matching, difficulty balancing, multiple sets (A/B/C), random selection</p></div>
                  {canManage && <><Button variant="outline" onClick={() => setBlueprintDialogOpen(true)}>Add Blueprint</Button><Button onClick={() => setGenerateDialogOpen(true)}><Shuffle className="h-4 w-4 mr-2" />Generate Paper</Button></>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    {blueprints.length === 0 ? <p className="text-sm text-muted-foreground">No blueprints</p> : (
                      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Total Marks</TableHead><TableHead>Sets</TableHead></TableRow></TableHeader>
                      <TableBody>{blueprints.map((b: any) => <TableRow key={b.id}><TableCell>{b.name}</TableCell><TableCell>{b.courses?.code}</TableCell><TableCell>{b.total_marks}</TableCell><TableCell>{b.num_sets}</TableCell></TableRow>)}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">Generated Paper Sets</h3>
                    {paperSets.length === 0 ? <p className="text-sm text-muted-foreground">No paper sets</p> : (
                      <Table><TableHeader><TableRow><TableHead>Blueprint</TableHead><TableHead>Set</TableHead><TableHead>Generated</TableHead></TableRow></TableHeader>
                      <TableBody>{paperSets.map((p: any) => <TableRow key={p.id}><TableCell>{p.question_paper_blueprints?.name}</TableCell><TableCell>Set {p.set_label}</TableCell><TableCell>{new Date(p.generated_at).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Online Tests */}
          <TabsContent value="online-tests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Online Examination</CardTitle><p className="text-sm text-muted-foreground">Create tests, scheduling, time limit, shuffle, auto-submit, proctoring, MCQ auto-eval, analytics</p></div>
                  {canManage && <Button onClick={() => setTestDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Test</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    {onlineTests.length === 0 ? <p className="text-sm text-muted-foreground">No online tests</p> : (
                      <Table><TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Course</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Start–End</TableHead><TableHead>Proctoring</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{onlineTests.map((t: any) => <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>{t.courses?.code}</TableCell><TableCell className="uppercase">{t.test_type}</TableCell><TableCell>{t.duration_minutes} min</TableCell><TableCell>{new Date(t.start_time).toLocaleString()} – {new Date(t.end_time).toLocaleString()}</TableCell><TableCell>{t.proctoring_enabled ? "Yes" : "No"}</TableCell><TableCell><Badge variant={t.status === "active" ? "default" : t.status === "completed" ? "secondary" : "outline"}>{t.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
                    )}
                    <h3 className="font-semibold mt-6 mb-2">Attempts / Analytics</h3>
                    {attempts.length === 0 ? <p className="text-sm text-muted-foreground">No attempts</p> : (
                      <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Test</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead>Time Spent</TableHead><TableHead>Flagged</TableHead></TableRow></TableHeader>
                      <TableBody>{attempts.map((a: any) => <TableRow key={a.id}><TableCell>{a.profiles?.full_name || a.student_id?.slice(0, 8)}</TableCell><TableCell>{a.online_tests?.name}</TableCell><TableCell><Badge variant={a.status === "evaluated" ? "default" : "secondary"}>{a.status}</Badge></TableCell><TableCell>{a.score ?? "—"}/{a.max_score ?? "—"}</TableCell><TableCell>{a.time_spent_seconds ? `${Math.floor(a.time_spent_seconds / 60)}m` : "—"}</TableCell><TableCell>{a.flagged_suspicious ? <Badge variant="destructive">Flagged</Badge> : "—"}</TableCell></TableRow>)}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Course</Label><Select value={questionForm.course_id} onValueChange={(v) => setQuestionForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={questionForm.question_type} onValueChange={(v) => setQuestionForm((p) => ({ ...p, question_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="descriptive">Descriptive</SelectItem><SelectItem value="numerical">Numerical</SelectItem><SelectItem value="coding">Coding</SelectItem></SelectContent></Select></div>
              <div><Label>Unit</Label><Input value={questionForm.unit} onChange={(e) => setQuestionForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. Unit 1" /></div>
              <div><Label>Topic</Label><Input value={questionForm.topic} onChange={(e) => setQuestionForm((p) => ({ ...p, topic: e.target.value }))} /></div>
              <div><Label>Difficulty</Label><Select value={questionForm.difficulty} onValueChange={(v) => setQuestionForm((p) => ({ ...p, difficulty: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent></Select></div>
              <div><Label>Blooms Level</Label><Select value={questionForm.blooms_level} onValueChange={(v) => setQuestionForm((p) => ({ ...p, blooms_level: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="remember">Remember</SelectItem><SelectItem value="understand">Understand</SelectItem><SelectItem value="apply">Apply</SelectItem><SelectItem value="analyze">Analyze</SelectItem><SelectItem value="evaluate">Evaluate</SelectItem><SelectItem value="create">Create</SelectItem></SelectContent></Select></div>
              <div><Label>CO Mapping</Label><Select value={questionForm.course_outcome_id} onValueChange={(v) => setQuestionForm((p) => ({ ...p, course_outcome_id: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{courseOutcomes.filter((co) => co.course_id === questionForm.course_id).map((co) => <SelectItem key={co.id} value={co.id}>{co.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Marks</Label><Input type="number" value={questionForm.marks} onChange={(e) => setQuestionForm((p) => ({ ...p, marks: e.target.value }))} /></div>
            </div>
            <div><Label>Question Text</Label><Textarea value={questionForm.question_text} onChange={(e) => setQuestionForm((p) => ({ ...p, question_text: e.target.value }))} rows={4} placeholder="Enter question" /></div>
            {questionForm.question_type === "mcq" && <div><Label>Options (one per line or JSON)</Label><Textarea value={questionForm.options} onChange={(e) => setQuestionForm((p) => ({ ...p, options: e.target.value }))} placeholder="A) Option 1&#10;B) Option 2" rows={4} /></div>}
            {questionForm.question_type === "mcq" && <div><Label>Correct Answer</Label><Input value={questionForm.correct_answer} onChange={(e) => setQuestionForm((p) => ({ ...p, correct_answer: e.target.value }))} placeholder="A or key" /></div>}
            <Button onClick={handleCreateQuestion} className="w-full">Add Question</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blueprint Dialog */}
      <Dialog open={blueprintDialogOpen} onOpenChange={setBlueprintDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Blueprint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course</Label><Select value={blueprintForm.course_id} onValueChange={(v) => setBlueprintForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Name</Label><Input value={blueprintForm.name} onChange={(e) => setBlueprintForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mid-I Blueprint" /></div>
            <div><Label>Total Marks</Label><Input type="number" value={blueprintForm.total_marks} onChange={(e) => setBlueprintForm((p) => ({ ...p, total_marks: e.target.value }))} /></div>
            <div><Label>Number of Sets</Label><Input type="number" value={blueprintForm.num_sets} onChange={(e) => setBlueprintForm((p) => ({ ...p, num_sets: e.target.value }))} placeholder="1, 2, 3..." /></div>
            <Button onClick={handleCreateBlueprint} className="w-full">Create Blueprint</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Paper Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Question Paper</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Random selection from approved questions. Blueprint matching and difficulty balancing.</p>
          <div className="space-y-4">
            <div><Label>Blueprint</Label><Select value={generateForm.blueprint_id} onValueChange={(v) => setGenerateForm((p) => ({ ...p, blueprint_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{blueprints.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.courses?.code})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Set Label</Label><Select value={generateForm.set_label} onValueChange={(v) => setGenerateForm((p) => ({ ...p, set_label: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem></SelectContent></Select></div>
            <Button onClick={handleGeneratePaper} className="w-full">Generate Paper</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Online Test</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course</Label><Select value={testForm.course_id} onValueChange={(v) => setTestForm((p) => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Test Name</Label><Input value={testForm.name} onChange={(e) => setTestForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mid-I MCQ" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label><Select value={testForm.test_type} onValueChange={(v) => setTestForm((p) => ({ ...p, test_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="descriptive">Descriptive</SelectItem><SelectItem value="coding">Coding</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent></Select></div>
              <div><Label>Total Marks</Label><Input type="number" value={testForm.total_marks} onChange={(e) => setTestForm((p) => ({ ...p, total_marks: e.target.value }))} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={testForm.duration_minutes} onChange={(e) => setTestForm((p) => ({ ...p, duration_minutes: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Time</Label><Input type="datetime-local" value={testForm.start_time} onChange={(e) => setTestForm((p) => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" value={testForm.end_time} onChange={(e) => setTestForm((p) => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={testForm.shuffle_questions} onChange={(e) => setTestForm((p) => ({ ...p, shuffle_questions: e.target.checked }))} /><span>Shuffle questions</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={testForm.auto_submit} onChange={(e) => setTestForm((p) => ({ ...p, auto_submit: e.target.checked }))} /><span>Auto-submit on expiry</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={testForm.proctoring_enabled} onChange={(e) => setTestForm((p) => ({ ...p, proctoring_enabled: e.target.checked }))} /><span>Proctoring (camera/screen)</span></label>
            </div>
            <Button onClick={handleCreateTest} className="w-full">Create Test</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
