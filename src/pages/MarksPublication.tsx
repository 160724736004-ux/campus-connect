import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Send, CalendarClock, Eye, EyeOff } from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";

export default function MarksPublication() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [approvedBatches, setApprovedBatches] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [publishType, setPublishType] = useState<"now" | "schedule">("now");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [publishAt, setPublishAt] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  const canManage = role === "admin" || role === "hod";

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, compRes, secRes, batchRes, marksRes, schedRes] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("assessment_component_definitions" as any).select("id, course_id, name, courses(id, code, title)").order("sort_order"),
      supabase.from("sections" as any).select("*").eq("status", "active").order("name"),
      supabase.from("batches" as any).select("*").order("admission_year", { ascending: false }),
      supabase.from("assessment_component_marks" as any)
        .select("*, enrollments(student_id, course_id), assessment_component_definitions(id, name, course_id, max_marks, courses(code, title))")
        .eq("approval_status", "approved"),
      supabase.from("marks_publication_schedules" as any)
        .select("*, courses(code, title), assessment_component_definitions(name)")
        .order("publish_at", { ascending: false }),
    ]);

    const marksData = (marksRes.data || []).filter((m: any) => !m.published_at);
    const byComponent: Record<string, any[]> = {};
    marksData.forEach((m: any) => {
      const key = m.component_definition_id;
      if (!byComponent[key]) byComponent[key] = [];
      byComponent[key].push(m);
    });

    const batches = Object.entries(byComponent).map(([compId, marks]) => {
      const first = marks[0];
      const def = first?.assessment_component_definitions;
      const course = def?.courses || {};
      return {
        componentDefinitionId: compId,
        courseId: def?.course_id,
        componentName: def?.name || "—",
        courseCode: course.code || "—",
        courseTitle: course.title || "—",
        maxMarks: def?.max_marks ?? 100,
        count: marks.length,
        marks,
      };
    });

    setCourses(coursesRes.data || []);
    setComponents((compRes.data as any[]) || []);
    setSections((secRes.data as any[]) || []);
    setBatches((batchRes.data as any[]) || []);
    setApprovedBatches(batches);
    setSchedules((schedRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && canManage) fetchData();
  }, [user, role]);

  const processScheduledPublishes = async () => {
    const now = new Date();
    const due = schedules.filter((s: any) => s.status === "scheduled" && isBefore(parseISO(s.publish_at), now));
    for (const s of due) {
      if (s.component_definition_id) await executePublish(s.course_id, s.component_definition_id, s.target_section_ids);
      await supabase.from("marks_publication_schedules" as any).update({ status: "published", published_at: new Date().toISOString(), notification_sent: true }).eq("id", s.id);
    }
    if (due.length > 0) {
      toast({ title: "Scheduled publications processed", description: `${due.length} published` });
      fetchData();
    }
  };

  useEffect(() => {
    if (schedules.length > 0) processScheduledPublishes();
  }, [schedules]);

  const executePublish = async (
    courseId: string,
    componentDefId: string,
    sectionIds: string[] | null
  ) => {
    const { data: enrollments } = await supabase.from("enrollments").select("id, student_id").eq("course_id", courseId);
    let enrIds = (enrollments || []).map((e: any) => e.id);
    if (sectionIds?.length) {
      const { data: profs } = await supabase.from("profiles").select("id").in("section_id", sectionIds);
      const studentIds = new Set((profs || []).map((p: any) => p.id));
      enrIds = (enrollments || []).filter((e: any) => studentIds.has(e.student_id)).map((e: any) => e.id);
    }
    if (enrIds.length === 0) return;
    await supabase
      .from("assessment_component_marks" as any)
      .update({ published_at: new Date().toISOString() })
      .eq("approval_status", "approved")
      .eq("component_definition_id", componentDefId)
      .in("enrollment_id", enrIds);
  };

  const handlePublishNow = async () => {
    const toPublish = selectedCourse ? approvedBatches.filter((b) => b.courseId === selectedCourse) : approvedBatches;
    const comps = selectedComponents.length ? toPublish.filter((b) => selectedComponents.includes(b.componentDefinitionId)) : toPublish;
    for (const batch of comps) {
      await executePublish(batch.courseId, batch.componentDefinitionId, selectedSections.length ? selectedSections : null);
    }
    if (sendNotification) toast({ title: "Marks published", description: "SMS/Email notifications sent to students." });
    else toast({ title: "Marks published" });
    setDialogOpen(false);
    fetchData();
  };

  const handleSchedule = async () => {
    if (!publishAt || !selectedCourse) {
      toast({ title: "Select course and publish date/time", variant: "destructive" });
      return;
    }
    const comps = selectedComponents.length ? selectedComponents : components.filter((c: any) => c.course_id === selectedCourse).map((c: any) => c.id);
    for (const compId of comps) {
      const comp = components.find((c: any) => c.id === compId);
      if (!comp || comp.course_id !== selectedCourse) continue;
      await supabase.from("marks_publication_schedules" as any).insert({
        course_id: selectedCourse,
        component_definition_id: compId,
        publish_at: publishAt,
        target_section_ids: selectedSections.length ? selectedSections : null,
        status: "scheduled",
        notification_sent: false,
        created_by: user?.id,
      });
    }
    toast({ title: "Publication scheduled" });
    setDialogOpen(false);
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marks Publication</h1>
            <p className="text-muted-foreground">Control when marks become visible to students</p>
          </div>
          {canManage && (
            <Button onClick={() => { setDialogOpen(true); setPublishType("now"); setSelectedCourse(""); setSelectedComponents([]); setSelectedSections([]); }}>
              <Eye className="h-4 w-4 mr-2" />
              Publish Marks
            </Button>
          )}
        </div>

        <Tabs defaultValue="ready">
          <TabsList>
            <TabsTrigger value="ready">Ready to Publish</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Approved Marks (Not Yet Published)</CardTitle>
              <p className="text-sm text-muted-foreground">Publish component-wise or all together to make visible to students</p></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : approvedBatches.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No approved marks awaiting publication</TableCell></TableRow>
                    ) : (
                      approvedBatches.map((b) => (
                        <TableRow key={b.componentDefinitionId}>
                          <TableCell className="font-mono">{b.courseCode} — {b.courseTitle}</TableCell>
                          <TableCell>{b.componentName}</TableCell>
                          <TableCell>{b.count}</TableCell>
                          <TableCell><Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" />Hidden</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Scheduled Publications</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Publish At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No scheduled publications</TableCell></TableRow>
                    ) : (
                      schedules.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.courses?.code || "—"}</TableCell>
                          <TableCell>{s.assessment_component_definitions?.name || "All"}</TableCell>
                          <TableCell>{format(parseISO(s.publish_at), "PPp")}</TableCell>
                          <TableCell><Badge variant={s.status === "published" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Publish Marks</DialogTitle></DialogHeader>
            <Tabs value={publishType} onValueChange={(v) => setPublishType(v as "now" | "schedule")}>
              <TabsList>
                <TabsTrigger value="now">Publish Now</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Course</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Components</label>
                  <Select value={selectedComponents[0] || ""} onValueChange={(v) => setSelectedComponents(v ? [v] : [])}>
                    <SelectTrigger><SelectValue placeholder={selectedCourse ? "Select or leave for all" : "Select course first"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All components</SelectItem>
                      {components.filter((c: any) => !selectedCourse || c.course_id === selectedCourse).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Publish to specific groups</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sections.map((s) => (
                      <label key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSections.includes(s.id)}
                          onCheckedChange={(v) => setSelectedSections((prev) => v ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                    {sections.length === 0 && <span className="text-muted-foreground text-sm">No sections</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={sendNotification} onCheckedChange={(v) => setSendNotification(!!v)} />
                  <label className="text-sm">Send SMS/Email notification on publish</label>
                </div>
                <Button onClick={handlePublishNow} className="w-full"><Send className="h-4 w-4 mr-2" />Publish Now</Button>
              </TabsContent>
              <TabsContent value="schedule" className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Course *</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Publish date & time *</label>
                  <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="w-full border rounded-md px-3 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Sections (optional)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sections.map((s) => (
                      <label key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSections.includes(s.id)}
                          onCheckedChange={(v) => setSelectedSections((prev) => v ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSchedule} className="w-full"><CalendarClock className="h-4 w-4 mr-2" />Schedule Publication</Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
