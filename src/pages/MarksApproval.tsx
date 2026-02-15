import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Send, ChevronDown, ChevronRight, BarChart3, AlertTriangle } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

export default function MarksApproval() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [pendingBatches, setPendingBatches] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchMarks, setBatchMarks] = useState<Record<string, any[]>>({});
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionBatch, setActionBatch] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "send_back">("approve");
  const [comments, setComments] = useState("");

  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | "send_back">("approve");
  const [bulkComments, setBulkComments] = useState("");

  const canManage = role === "admin" || role === "hod";

  const fetchData = async () => {
    setLoading(true);
    const { data: rawMarks } = await supabase
      .from("assessment_component_marks" as any)
      .select("*, enrollments(student_id, course_id), assessment_component_definitions(name, max_marks, requires_approval, approval_deadline, courses(code, title))")
      .eq("status", "submitted");
    const marksData = (rawMarks || []).filter((m: any) =>
      !m.approval_status || m.approval_status === "pending" || m.approval_status === "sent_back"
    );

    if (!marksData || marksData.length === 0) {
      setPendingBatches([]);
      setAllBatches([]);
      setBatchMarks({});
      setLoading(false);
      return;
    }

    const byKey: Record<string, any[]> = {};
    marksData.forEach((m: any) => {
      const def = m.assessment_component_definitions;
      const key = `${m.component_definition_id}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(m);
    });

    const batches = Object.entries(byKey).map(([key, marks]) => {
      const first = marks[0];
      const def = first?.assessment_component_definitions;
      const course = def?.courses;
      return {
        key,
        componentDefinitionId: first.component_definition_id,
        courseId: first.enrollments?.course_id,
        componentName: def?.name || "—",
        courseCode: course?.code || "—",
        courseTitle: course?.title || "—",
        maxMarks: def?.max_marks ?? 100,
        approvalDeadline: def?.approval_deadline,
        marks,
        count: marks.length,
      };
    });

    setPendingBatches(batches);
    setAllBatches(batches);
    setBatchMarks(byKey);

    const allStudentIds = [...new Set(marksData.map((m: any) => m.enrollments?.student_id).filter(Boolean))];
    if (allStudentIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, student_id_number").in("id", allStudentIds);
      setStudentsMap(Object.fromEntries((profs || []).map((p: any) => [p.id, p])));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && canManage) fetchData();
  }, [user, role]);

  const computeStats = (marks: any[], maxMarks: number) => {
    const numeric = marks.filter((m: any) => m.marks_obtained != null && !m.is_absent).map((m: any) => Number(m.marks_obtained));
    const passThreshold = maxMarks * 0.4;
    const passed = numeric.filter((n) => n >= passThreshold).length;
    const failed = numeric.filter((n) => n < passThreshold).length;
    const absent = marks.filter((m: any) => m.is_absent).length;
    return {
      count: marks.length,
      avg: numeric.length ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(2) : "—",
      highest: numeric.length ? Math.max(...numeric).toFixed(2) : "—",
      lowest: numeric.length ? Math.min(...numeric).toFixed(2) : "—",
      passed,
      failed,
      absent,
      passRate: numeric.length ? ((passed / numeric.length) * 100).toFixed(0) + "%" : "—",
      distribution: numeric.length
        ? [
            { label: "0-25%", count: numeric.filter((n) => n < maxMarks * 0.25).length },
            { label: "25-50%", count: numeric.filter((n) => n >= maxMarks * 0.25 && n < maxMarks * 0.5).length },
            { label: "50-75%", count: numeric.filter((n) => n >= maxMarks * 0.5 && n < maxMarks * 0.75).length },
            { label: "75-100%", count: numeric.filter((n) => n >= maxMarks * 0.75).length },
          ]
        : [],
    };
  };

  const performAction = async (batch: any, type: "approve" | "reject" | "send_back", comment: string, isBulk = false) => {
    const markIds = batch.marks.map((m: any) => m.id);
    const payload: any = {
      approval_status: type === "approve" ? "approved" : type === "reject" ? "rejected" : "sent_back",
      approval_comments: comment || null,
    };
    if (type === "approve") {
      payload.approved_by = user?.id;
      payload.approved_at = new Date().toISOString();
      payload.is_approved = true;
    }
    if (type === "send_back") {
      payload.status = "draft";
    }
    for (const id of markIds) {
      await supabase.from("assessment_component_marks" as any).update(payload).eq("id", id);
    }
    if (!isBulk) {
      if (type === "approve") {
        toast({ title: "Marks approved", description: "Students can now view their marks." });
      } else if (type === "reject") {
        toast({ title: "Marks rejected", description: comment || "Faculty will need to re-submit." });
      } else {
        toast({ title: "Sent back", description: "Faculty can edit and resubmit." });
      }
      setActionDialogOpen(false);
      setActionBatch(null);
      setComments("");
      fetchData();
    }
  };

  const performBulkAction = async () => {
    for (const key of selectedForBulk) {
      const batch = allBatches.find((b) => b.key === key);
      if (batch) await performAction(b, bulkActionType, bulkComments);
    }
    setSelectedForBulk(new Set());
    setBulkActionDialogOpen(false);
    setBulkComments("");
    setBulkActionType("approve");
    toast({ title: "Bulk action completed" });
    fetchData();
  };

  const openAction = (batch: any, type: "approve" | "reject" | "send_back") => {
    setActionBatch(batch);
    setActionType(type);
    setComments("");
    setActionDialogOpen(true);
  };

  const isOverdue = (deadline: string | null) => deadline && isAfter(new Date(), parseISO(deadline));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marks Approval</h1>
            <p className="text-muted-foreground">Review and approve marks submitted by faculty</p>
          </div>
          {selectedForBulk.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedForBulk(new Set())}>Clear selection</Button>
              <Button size="sm" onClick={() => { setBulkActionType("approve"); setBulkActionDialogOpen(true); }}>
                <CheckCircle className="h-4 w-4 mr-2" />Bulk Approve ({selectedForBulk.size})
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { setBulkActionType("reject"); setBulkActionDialogOpen(true); }}>
                <XCircle className="h-4 w-4 mr-2" />Bulk Reject
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setBulkActionType("send_back"); setBulkActionDialogOpen(true); }}>
                <Send className="h-4 w-4 mr-2" />Bulk Send Back
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : pendingBatches.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No pending approvals</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {pendingBatches.map((batch) => {
              const stats = computeStats(batch.marks, batch.maxMarks);
              const expanded = expandedBatch === batch.key;
              const overdue = isOverdue(batch.approvalDeadline);

              return (
                <Card key={batch.key}>
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedBatch(expanded ? null : batch.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div>
                          <CardTitle className="text-base">
                            {batch.courseCode} — {batch.componentName} <span className="text-muted-foreground font-normal">({batch.count} students)</span>
                          </CardTitle>
                          <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                            <span>Avg: {stats.avg}</span>
                            <span>High: {stats.highest}</span>
                            <span>Low: {stats.lowest}</span>
                            <span>Pass: {stats.passed} / Fail: {stats.failed}</span>
                            <span>Pass rate: {stats.passRate}</span>
                            {batch.approvalDeadline && (
                              <span className={overdue ? "text-destructive font-medium" : ""}>
                                Deadline: {format(parseISO(batch.approvalDeadline), "PP")} {overdue && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedForBulk.has(batch.key)}
                          onChange={(e) => {
                            setSelectedForBulk((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(batch.key);
                              else next.delete(batch.key);
                              return next;
                            });
                          }}
                        />
                        <Button size="sm" variant="default" onClick={() => openAction(batch, "approve")}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => openAction(batch, "reject")}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        <Button size="sm" variant="secondary" onClick={() => openAction(batch, "send_back")}><Send className="h-4 w-4 mr-1" />Send Back</Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="grid gap-6 mt-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Marks distribution</h4>
                          <div className="space-y-2 max-w-md">
                            {stats.distribution.map((d) => (
                              <div key={d.label} className="flex items-center gap-3">
                                <span className="text-sm w-16">{d.label}</span>
                                <Progress value={(d.count / stats.count) * 100} className="flex-1 h-2" />
                                <span className="text-sm text-muted-foreground w-8">{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Marks</TableHead>
                              <TableHead>Absent</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.marks.map((m: any) => {
                              const s = studentsMap[m.enrollments?.student_id] || {};
                              return (
                                <TableRow key={m.id}>
                                  <TableCell className="font-mono">{s.student_id_number || "—"}</TableCell>
                                  <TableCell>{s.full_name || "—"}</TableCell>
                                  <TableCell>{m.is_absent ? "Absent" : (m.marks_obtained != null ? Number(m.marks_obtained).toFixed(2) : "—")}</TableCell>
                                  <TableCell>{m.is_absent ? "Yes" : "No"}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{m.remarks || "—"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Send Back"} Marks
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {actionBatch && `${actionBatch.courseCode} — ${actionBatch.componentName}`}
            </p>
            <div className="py-4">
              <label className="text-sm font-medium">Comments / Remarks</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={actionType === "approve" ? "Optional approval note" : "Required for reject / send back"}
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => actionBatch && performAction(actionBatch, actionType, comments)}
                disabled={actionType !== "approve" && !comments.trim()}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk {bulkActionType === "approve" ? "Approve" : bulkActionType === "reject" ? "Reject" : "Send Back"}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{selectedForBulk.size} subjects selected</p>
            <div className="py-4">
              <label className="text-sm font-medium">Comments (optional for approve)</label>
              <Textarea value={bulkComments} onChange={(e) => setBulkComments(e.target.value)} rows={3} className="mt-2" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)}>Cancel</Button>
              <Button onClick={performBulkAction} disabled={bulkActionType !== "approve" && !bulkComments.trim()}>Confirm</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
