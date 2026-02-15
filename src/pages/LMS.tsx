import { useState, useEffect, useRef } from "react";
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
import { BookOpen, Video, Plus, MessageSquare, Send, Trophy, BarChart3, FileText, Link2, Upload, ExternalLink, CheckCircle } from "lucide-react";

const BUCKET = "lms-content";

export default function LMS() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const canManage = role === "admin" || role === "hod" || role === "faculty";
  const fileRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [studentBadges, setStudentBadges] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ course_id: "", name: "", description: "" });
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [contentForm, setContentForm] = useState({ course_id: "", module_id: "", title: "", content_type: "pdf", external_url: "", description: "" });
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [liveForm, setLiveForm] = useState({ course_id: "", title: "", meeting_url: "", platform: "zoom", start_time: "" });
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ course_id: "", module_id: "", title: "", description: "", due_date: "", max_marks: "100" });
  const [discussionDialogOpen, setDiscussionDialogOpen] = useState(false);
  const [discussionForm, setDiscussionForm] = useState({ course_id: "", topic: "", body: "", parent_id: "" });
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ course_id: "", recipient_id: "", subject: "", body: "" });
  const [uploading, setUploading] = useState(false);

  const studentCourseIds = enrollments.map((e: any) => e.course_id);
  const myCourses = courses.filter((c: any) => studentCourseIds.includes(c.id) || canManage);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, mRes, contRes, liveRes, aRes, subRes, dRes, msgRes, progRes, bRes, sbRes, ptRes, eRes, pRes] = await Promise.all([
        supabase.from("courses").select("id, code, title").order("code"),
        supabase.from("lms_modules" as any).select("*, courses(code)"),
        supabase.from("lms_content" as any).select("*, lms_modules(name), courses(code)"),
        supabase.from("lms_live_sessions" as any).select("*, courses(code)").gte("start_time", new Date().toISOString()).order("start_time"),
        supabase.from("lms_assignments" as any).select("*, courses(code), lms_modules(name)"),
        role === "student" && user ? supabase.from("lms_assignment_submissions" as any).select("*, lms_assignments(title, courses(code))").eq("student_id", user.id) : supabase.from("lms_assignment_submissions" as any).select("*, lms_assignments(title, courses(code)), profiles(full_name)"),
        supabase.from("lms_discussions" as any).select("*, courses(code), profiles(full_name)").is("parent_id", null).order("created_at", { ascending: false }),
        role === "student" && user ? supabase.from("lms_messages" as any).select("*").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false }) : supabase.from("lms_messages" as any).select("*").order("created_at", { ascending: false }),
        role === "student" && user ? supabase.from("lms_progress" as any).select("*, lms_content(title, courses(code))").eq("student_id", user.id) : supabase.from("lms_progress" as any).select("*, lms_content(title), profiles(full_name)"),
        supabase.from("lms_badges" as any).select("*, courses(code)"),
        supabase.from("lms_student_badges" as any).select("*, lms_badges(name, icon_url), profiles(full_name)"),
        supabase.from("lms_student_points" as any).select("*, profiles(full_name), courses(code)").order("points", { ascending: false }),
        role === "student" && user ? supabase.from("enrollments" as any).select("course_id").eq("student_id", user.id) : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id, full_name").limit(300),
      ]);
      setCourses(cRes.data || []);
      setModules(mRes.data || []);
      setContent(contRes.data || []);
      setLiveSessions(liveRes.data || []);
      setAssignments(aRes.data || []);
      setSubmissions(subRes.data || []);
      setDiscussions(dRes.data || []);
      setMessages(msgRes.data || []);
      setProgress(progRes.data || []);
      setBadges(bRes.data || []);
      setStudentBadges(sbRes.data || []);
      setPoints(ptRes.data || []);
      setEnrollments(eRes.data || []);
      setProfiles(pRes.data || []);
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [role, user]);

  const getModulesForCourse = (cid: string) => modules.filter((m: any) => m.course_id === cid).sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const getContentForModule = (mid: string) => content.filter((c: any) => c.module_id === mid);
  const getContentForCourse = (cid: string) => content.filter((c: any) => c.course_id === cid);
  const getAssignmentsForCourse = (cid: string) => assignments.filter((a: any) => a.course_id === cid);
  const getLiveForCourse = (cid: string) => liveSessions.filter((l: any) => l.course_id === cid);

  const handleCreateModule = async () => {
    if (!moduleForm.course_id || !moduleForm.name) return;
    const seq = getModulesForCourse(moduleForm.course_id).length + 1;
    const { error } = await supabase.from("lms_modules" as any).insert({ course_id: moduleForm.course_id, name: moduleForm.name, description: moduleForm.description || null, sequence: seq });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Module added" }); setModuleDialogOpen(false); setModuleForm({ course_id: "", name: "", description: "" }); fetchData();
  };

  const handleCreateContent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!contentForm.course_id || !contentForm.title) return;
    const file = fileRef.current?.files?.[0];
    let fileUrl: string | null = null;
    if (file && (contentForm.content_type === "pdf" || contentForm.content_type === "video")) {
      setUploading(true);
      const path = `${contentForm.course_id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }
    const { error } = await supabase.from("lms_content" as any).insert({
      course_id: contentForm.course_id, module_id: contentForm.module_id || null, title: contentForm.title, content_type: contentForm.content_type,
      file_url: fileUrl, external_url: contentForm.external_url || null, description: contentForm.description || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Content added" }); setContentDialogOpen(false); setContentForm({ course_id: "", module_id: "", title: "", content_type: "pdf", external_url: "", description: "" }); if (fileRef.current) fileRef.current.value = ""; fetchData();
  };

  const handleCreateLive = async () => {
    if (!liveForm.course_id || !liveForm.title || !liveForm.meeting_url || !liveForm.start_time) return;
    const { error } = await supabase.from("lms_live_sessions" as any).insert({
      course_id: liveForm.course_id, title: liveForm.title, meeting_url: liveForm.meeting_url, platform: liveForm.platform, start_time: liveForm.start_time, created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Live session added" }); setLiveDialogOpen(false); setLiveForm({ course_id: "", title: "", meeting_url: "", platform: "zoom", start_time: "" }); fetchData();
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.course_id || !assignmentForm.title) return;
    const { error } = await supabase.from("lms_assignments" as any).insert({
      course_id: assignmentForm.course_id, module_id: assignmentForm.module_id || null, title: assignmentForm.title, description: assignmentForm.description || null,
      due_date: assignmentForm.due_date || null, max_marks: parseFloat(assignmentForm.max_marks) || 100, created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assignment created" }); setAssignmentDialogOpen(false); setAssignmentForm({ course_id: "", module_id: "", title: "", description: "", due_date: "", max_marks: "100" }); fetchData();
  };

  const handlePostDiscussion = async () => {
    if (!discussionForm.course_id || !discussionForm.body || !user) return;
    const { error } = await supabase.from("lms_discussions" as any).insert({
      course_id: discussionForm.course_id, parent_id: discussionForm.parent_id || null, author_id: user.id, topic: discussionForm.topic || null, body: discussionForm.body,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Posted" }); setDiscussionDialogOpen(false); setDiscussionForm({ course_id: "", topic: "", body: "", parent_id: "" }); fetchData();
  };

  const handleSendMessage = async () => {
    if (!messageForm.recipient_id || !messageForm.body || !user) return;
    const { error } = await supabase.from("lms_messages" as any).insert({
      course_id: messageForm.course_id || null, sender_id: user.id, recipient_id: messageForm.recipient_id, subject: messageForm.subject || null, body: messageForm.body,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Message sent" }); setMessageDialogOpen(false); setMessageForm({ course_id: "", recipient_id: "", subject: "", body: "" }); fetchData();
  };

  const handleMarkComplete = async (contentId: string) => {
    if (!user) return;
    const existing = progress.find((p: any) => p.content_id === contentId && p.student_id === user.id);
    if (existing) {
      await supabase.from("lms_progress" as any).update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("lms_progress" as any).insert({ student_id: user.id, content_id: contentId, status: "completed", completed_at: new Date().toISOString() });
    }
    toast({ title: "Marked complete" }); fetchData();
  };

  const handleSubmitAssignment = async (assignmentId: string, file?: File, text?: string) => {
    if (!user) return;
    let fileUrl: string | null = null;
    if (file) {
      setUploading(true);
      const path = `submissions/${assignmentId}/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }
    const { error } = await supabase.from("lms_assignment_submissions" as any).upsert({
      assignment_id: assignmentId, student_id: user.id, file_url: fileUrl, submission_text: text || null, submitted_at: new Date().toISOString(),
    }, { onConflict: "assignment_id,student_id" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Submitted" }); fetchData();
  };

  const myPoints = role === "student" ? points.filter((p: any) => p.student_id === user?.id) : [];
  const leaderboard = points.slice(0, 10);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Management System</h1>
          <p className="text-muted-foreground">Course content, live classes, assignments, discussions, progress tracking, gamification</p>
        </div>

        <Tabs defaultValue="content">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="content"><BookOpen className="h-4 w-4 mr-1" />Content</TabsTrigger>
            <TabsTrigger value="live"><Video className="h-4 w-4 mr-1" />Live Classes</TabsTrigger>
            <TabsTrigger value="assignments"><FileText className="h-4 w-4 mr-1" />Assignments</TabsTrigger>
            <TabsTrigger value="discussions"><MessageSquare className="h-4 w-4 mr-1" />Discussions</TabsTrigger>
            <TabsTrigger value="messages"><Send className="h-4 w-4 mr-1" />Messages</TabsTrigger>
            {role === "student" && <TabsTrigger value="progress"><CheckCircle className="h-4 w-4 mr-1" />My Progress</TabsTrigger>}
            <TabsTrigger value="gamification"><Trophy className="h-4 w-4 mr-1" />Badges & Leaderboard</TabsTrigger>
          </TabsList>

          {/* Content Repository */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Course Content</CardTitle><p className="text-sm text-muted-foreground">Modules, lecture notes, PDFs, videos, recorded lectures</p></div>
                  {canManage && <Button onClick={() => { setContentForm((f) => ({ ...f, course_id: selectedCourseId || "" })); setContentDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Content</Button>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Course</Label>
                  <Select value={selectedCourseId || ""} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{myCourses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : !selectedCourseId ? <p className="text-muted-foreground">Select a course</p> : (
                  <div className="space-y-6">
                    {canManage && <Button variant="outline" size="sm" onClick={() => { setModuleForm({ course_id: selectedCourseId, name: "", description: "" }); setModuleDialogOpen(true); }}>+ Add Module</Button>}
                    {getModulesForCourse(selectedCourseId).map((mod: any) => (
                      <div key={mod.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold">{mod.name}</h3>
                        {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
                        <div className="mt-3 space-y-2">
                          {getContentForModule(mod.id).map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{c.content_type}</Badge>
                                <span>{c.title}</span>
                                {c.file_url && <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm"><ExternalLink className="h-3 w-3" /></a>}
                                {c.external_url && <a href={c.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm"><Link2 className="h-3 w-3" /></a>}
                              </div>
                              {role === "student" && (
                                <Button size="sm" variant="ghost" onClick={() => handleMarkComplete(c.id)}>
                                  {progress.some((p: any) => p.content_id === c.id && p.student_id === user?.id && p.status === "completed") ? <CheckCircle className="h-4 w-4 text-green-600" /> : "Mark Complete"}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {getContentForCourse(selectedCourseId).filter((c: any) => !c.module_id).length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold">Other Content</h3>
                        {getContentForCourse(selectedCourseId).filter((c: any) => !c.module_id).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50 mt-2">
                            <div className="flex items-center gap-2"><Badge variant="outline">{c.content_type}</Badge><span>{c.title}</span>
                              {c.file_url && <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm"><ExternalLink className="h-3 w-3" /></a>}
                              {c.external_url && <a href={c.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm"><Link2 className="h-3 w-3" /></a>}
                            </div>
                            {role === "student" && <Button size="sm" variant="ghost" onClick={() => handleMarkComplete(c.id)}>{progress.some((p: any) => p.content_id === c.id && p.student_id === user?.id) ? <CheckCircle className="h-4 w-4 text-green-600" /> : "Mark Complete"}</Button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Classes */}
          <TabsContent value="live" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Live Classes</CardTitle><p className="text-sm text-muted-foreground">Zoom, Teams, Google Meet integration</p></div>
                  {canManage && <Button onClick={() => setLiveDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Live Session</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : liveSessions.length === 0 ? <p className="text-muted-foreground">No upcoming live sessions</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Title</TableHead><TableHead>Platform</TableHead><TableHead>Start</TableHead><TableHead>Link</TableHead></TableRow></TableHeader>
                    <TableBody>{liveSessions.map((l: any) => (
                      <TableRow key={l.id}><TableCell>{l.courses?.code}</TableCell><TableCell>{l.title}</TableCell><TableCell className="capitalize">{l.platform}</TableCell><TableCell>{new Date(l.start_time).toLocaleString()}</TableCell><TableCell><a href={l.meeting_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Join</a></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Assignments</CardTitle><p className="text-sm text-muted-foreground">Distribution and submission</p></CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : (
                  <>
                    {canManage && <Button className="mb-4" onClick={() => setAssignmentDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Assignment</Button>}
                    {role === "student" ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold">My Submissions</h3>
                        {submissions.length === 0 ? <p className="text-muted-foreground">No submissions yet</p> : (
                          <Table><TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Course</TableHead><TableHead>Submitted</TableHead><TableHead>Marks</TableHead></TableRow></TableHeader>
                            <TableBody>{submissions.map((s: any) => (
                              <TableRow key={s.id}><TableCell>{s.lms_assignments?.title}</TableCell><TableCell>{s.lms_assignments?.courses?.code}</TableCell><TableCell>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</TableCell><TableCell>{s.marks_awarded != null ? `${s.marks_awarded}` : "—"}</TableCell></TableRow>
                            ))}</TableBody></Table>
                        )}
                        <h3 className="font-semibold mt-6">Available Assignments</h3>
                        {assignments.filter((a: any) => studentCourseIds.includes(a.course_id)).map((a: any) => {
                          const sub = submissions.find((s: any) => s.assignment_id === a.id);
                          return (
                            <div key={a.id} className="border rounded p-4 flex justify-between items-center">
                              <div><p className="font-medium">{a.title}</p><p className="text-sm text-muted-foreground">{a.courses?.code} • Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</p></div>
                              {sub ? <Badge>Submitted</Badge> : (
                                <AssignmentSubmit onSubmit={(file, text) => handleSubmitAssignment(a.id, file, text)} uploading={uploading} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Assignment</TableHead><TableHead>Due</TableHead><TableHead>Max Marks</TableHead></TableRow></TableHeader>
                        <TableBody>{assignments.map((a: any) => (
                          <TableRow key={a.id}><TableCell>{a.courses?.code}</TableCell><TableCell>{a.title}</TableCell><TableCell>{a.due_date ? new Date(a.due_date).toLocaleString() : "—"}</TableCell><TableCell>{a.max_marks}</TableCell></TableRow>
                        ))}</TableBody></Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discussions */}
          <TabsContent value="discussions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Discussion Forums</CardTitle><p className="text-sm text-muted-foreground">Peer collaboration</p></div>
                  <Button onClick={() => setDiscussionDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Post</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : discussions.length === 0 ? <p className="text-muted-foreground">No discussions yet</p> : (
                  <div className="space-y-4">
                    {discussions.map((d: any) => (
                      <div key={d.id} className="border rounded p-4">
                        <p className="font-medium">{d.topic || "Discussion"}</p>
                        <p className="text-sm text-muted-foreground">{d.courses?.code} • {d.profiles?.full_name} • {new Date(d.created_at).toLocaleString()}</p>
                        <p className="mt-2">{d.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle>Messages</CardTitle><p className="text-sm text-muted-foreground">Student-faculty messaging</p></div>
                  <Button onClick={() => setMessageDialogOpen(true)}><Send className="h-4 w-4 mr-2" />New Message</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : messages.filter((m: any) => m.sender_id === user?.id || m.recipient_id === user?.id).length === 0 ? <p className="text-muted-foreground">No messages</p> : (
                  <div className="space-y-3">
                    {messages.filter((m: any) => m.sender_id === user?.id || m.recipient_id === user?.id).slice(0, 20).map((m: any) => (
                      <div key={m.id} className={`border rounded p-3 ${m.recipient_id === user?.id && !m.read_at ? "bg-primary/5" : ""}`}>
                        <p className="text-sm font-medium">{m.subject || "No subject"}</p>
                        <p className="text-xs text-muted-foreground">{profiles.find((p: any) => p.id === m.sender_id)?.full_name || "—"} • {new Date(m.created_at).toLocaleString()}</p>
                        <p className="mt-1 text-sm truncate">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Progress */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>My Progress</CardTitle><p className="text-sm text-muted-foreground">Content completion tracking</p></CardHeader>
              <CardContent>
                {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : progress.length === 0 ? <p className="text-muted-foreground">No progress recorded</p> : (
                  <div className="space-y-2">
                    {progress.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span>{p.lms_content?.title} ({p.lms_content?.courses?.code})</span>
                        <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status === "completed" ? <CheckCircle className="h-3 w-3 mr-1" /> : null}{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gamification */}
          <TabsContent value="gamification" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Badges</CardTitle><p className="text-sm text-muted-foreground">Achievements earned</p></CardHeader>
                <CardContent>
                  {role === "student" ? (
                    studentBadges.filter((b: any) => b.student_id === user?.id).length === 0 ? <p className="text-muted-foreground">No badges yet</p> : (
                      <div className="flex flex-wrap gap-2">
                        {studentBadges.filter((b: any) => b.student_id === user?.id).map((b: any) => (
                          <Badge key={b.id} variant="secondary" className="text-sm">{b.lms_badges?.name}</Badge>
                        ))}
                      </div>
                    )
                  ) : badges.length === 0 ? <p className="text-muted-foreground">No badges defined</p> : (
                    <div className="flex flex-wrap gap-2">{badges.map((b: any) => <Badge key={b.id}>{b.name}</Badge>)}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Leaderboard</CardTitle><p className="text-sm text-muted-foreground">Top performers by course</p></CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? <p className="text-muted-foreground">No points yet</p> : (
                    <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
                      <TableBody>{leaderboard.map((p: any, i: number) => (
                        <TableRow key={p.id} className={p.student_id === user?.id ? "bg-primary/5" : ""}><TableCell>{i + 1}</TableCell><TableCell>{p.profiles?.full_name}</TableCell><TableCell>{p.courses?.code}</TableCell><TableCell>{p.points}</TableCell></TableRow>
                      ))}</TableBody></Table>
                  )}
                  {role === "student" && myPoints.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Your points: {myPoints.map((p: any) => `${p.courses?.code}: ${p.points}`).join(", ")}</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Add Module</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Course</Label><Select value={moduleForm.course_id} onValueChange={(v) => setModuleForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Name</Label><Input value={moduleForm.name} onChange={(e) => setModuleForm((f) => ({ ...f, name: e.target.value }))} placeholder="Module/Unit name" /></div>
              <div><Label>Description</Label><Textarea value={moduleForm.description} onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <Button onClick={handleCreateModule}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
          <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add Content</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateContent} className="space-y-4">
              <div><Label>Course</Label><Select value={contentForm.course_id} onValueChange={(v) => setContentForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Module (optional)</Label><Select value={contentForm.module_id} onValueChange={(v) => setContentForm((f) => ({ ...f, module_id: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem>{modules.filter((m: any) => m.course_id === contentForm.course_id).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Title</Label><Input value={contentForm.title} onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))} required /></div>
              <div><Label>Type</Label><Select value={contentForm.content_type} onValueChange={(v) => setContentForm((f) => ({ ...f, content_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="notes">Notes</SelectItem><SelectItem value="link">Link</SelectItem><SelectItem value="recorded_lecture">Recorded Lecture</SelectItem></SelectContent></Select></div>
              {(contentForm.content_type === "pdf" || contentForm.content_type === "video") && <div><Label>Upload File</Label><Input ref={fileRef} type="file" accept={contentForm.content_type === "pdf" ? ".pdf" : "video/*"} /></div>}
              {contentForm.content_type === "link" && <div><Label>URL</Label><Input value={contentForm.external_url} onChange={(e) => setContentForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://..." /></div>}
              <div><Label>Description</Label><Textarea value={contentForm.description} onChange={(e) => setContentForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Add"}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={liveDialogOpen} onOpenChange={setLiveDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Add Live Session</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Course</Label><Select value={liveForm.course_id} onValueChange={(v) => setLiveForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Title</Label><Input value={liveForm.title} onChange={(e) => setLiveForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Platform</Label><Select value={liveForm.platform} onValueChange={(v) => setLiveForm((f) => ({ ...f, platform: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zoom">Zoom</SelectItem><SelectItem value="teams">Teams</SelectItem><SelectItem value="google_meet">Google Meet</SelectItem></SelectContent></Select></div>
              <div><Label>Meeting URL</Label><Input value={liveForm.meeting_url} onChange={(e) => setLiveForm((f) => ({ ...f, meeting_url: e.target.value }))} placeholder="https://zoom.us/..." /></div>
              <div><Label>Start Time</Label><Input type="datetime-local" value={liveForm.start_time} onChange={(e) => setLiveForm((f) => ({ ...f, start_time: e.target.value }))} /></div>
              <Button onClick={handleCreateLive}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Course</Label><Select value={assignmentForm.course_id} onValueChange={(v) => setAssignmentForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Module (optional)</Label><Select value={assignmentForm.module_id} onValueChange={(v) => setAssignmentForm((f) => ({ ...f, module_id: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem>{modules.filter((m: any) => m.course_id === assignmentForm.course_id).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Title</Label><Input value={assignmentForm.title} onChange={(e) => setAssignmentForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="datetime-local" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>Max Marks</Label><Input type="number" value={assignmentForm.max_marks} onChange={(e) => setAssignmentForm((f) => ({ ...f, max_marks: e.target.value }))} /></div>
              <Button onClick={handleCreateAssignment}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={discussionDialogOpen} onOpenChange={setDiscussionDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>New Discussion Post</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Course</Label><Select value={discussionForm.course_id} onValueChange={(v) => setDiscussionForm((f) => ({ ...f, course_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{myCourses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Topic</Label><Input value={discussionForm.topic} onChange={(e) => setDiscussionForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Body</Label><Textarea value={discussionForm.body} onChange={(e) => setDiscussionForm((f) => ({ ...f, body: e.target.value }))} rows={4} required /></div>
              <Button onClick={handlePostDiscussion}>Post</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Recipient</Label><Select value={messageForm.recipient_id} onValueChange={(v) => setMessageForm((f) => ({ ...f, recipient_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{profiles.filter((p: any) => p.id !== user?.id).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Subject</Label><Input value={messageForm.subject} onChange={(e) => setMessageForm((f) => ({ ...f, subject: e.target.value }))} /></div>
              <div><Label>Message</Label><Textarea value={messageForm.body} onChange={(e) => setMessageForm((f) => ({ ...f, body: e.target.value }))} rows={4} required /></div>
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function AssignmentSubmit({ onSubmit, uploading }: { onSubmit: (file?: File, text?: string) => void; uploading: boolean }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Input placeholder="Or paste link / text" value={text} onChange={(e) => setText(e.target.value)} />
      <Button size="sm" disabled={uploading} onClick={() => onSubmit(file || undefined, text || undefined)}>Submit</Button>
    </div>
  );
}
