import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Clock, FileText } from "lucide-react";

export function AttendanceCondonation() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [condonations, setCondonations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedCondonation, setSelectedCondonation] = useState<any>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const [form, setForm] = useState({ course_id: "", condone_dates: "", reason: "" });

  const isStudent = role === "student";
  const canApprove = role === "faculty" || role === "hod" || role === "admin";

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [condRes, coursesRes] = await Promise.all([
        isStudent
          ? supabase.from("attendance_condonations").select("*, courses(code, title)").eq("student_id", user.id).order("created_at", { ascending: false })
          : supabase.from("attendance_condonations").select("*, courses(code, title), profiles!attendance_condonations_student_id_fkey(full_name, student_id_number)").order("created_at", { ascending: false }),
        isStudent
          ? supabase.from("enrollments").select("course_id, courses(id, code, title)").eq("student_id", user.id).eq("status", "enrolled")
          : supabase.from("courses").select("id, code, title").order("code"),
      ]);
      setCondonations(condRes.data || []);
      if (isStudent) {
        setCourses((coursesRes.data || []).map((e: any) => e.courses).filter(Boolean));
      } else {
        setCourses(coursesRes.data || []);
      }
    };
    fetch();
  }, [user, role]);

  const submitCondonation = async () => {
    if (!user || !form.course_id || !form.reason || !form.condone_dates) return;
    const dates = form.condone_dates.split(",").map((d) => d.trim()).filter(Boolean);
    const { error } = await supabase.from("attendance_condonations").insert({
      student_id: user.id,
      course_id: form.course_id,
      condone_dates: dates,
      reason: form.reason,
    });
    if (error) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Condonation request submitted" });
      setDialogOpen(false);
      setForm({ course_id: "", condone_dates: "", reason: "" });
      // Refresh
      const { data } = await supabase.from("attendance_condonations").select("*, courses(code, title)").eq("student_id", user.id).order("created_at", { ascending: false });
      setCondonations(data || []);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!selectedCondonation || !user) return;
    let newStatus = "";
    const remarkField = role === "faculty" ? "faculty_remarks" : role === "hod" ? "hod_remarks" : "hod_remarks";

    if (!approved) {
      newStatus = "rejected";
    } else if (role === "faculty") {
      newStatus = "faculty_approved";
    } else if (role === "hod" || role === "admin") {
      newStatus = "approved";
    }

    await supabase.from("attendance_condonations").update({
      status: newStatus,
      [remarkField]: approvalRemarks,
      ...(approved && (role === "hod" || role === "admin") ? { approved_dates: selectedCondonation.condone_dates } : {}),
    }).eq("id", selectedCondonation.id);

    toast({ title: approved ? "Condonation approved" : "Condonation rejected" });
    setApprovalDialogOpen(false);
    setSelectedCondonation(null);
    setApprovalRemarks("");

    // Refresh
    const { data } = await supabase.from("attendance_condonations")
      .select("*, courses(code, title), profiles!attendance_condonations_student_id_fkey(full_name, student_id_number)")
      .order("created_at", { ascending: false });
    setCondonations(data || []);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "faculty_approved": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Faculty Approved</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "partially_approved": return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {isStudent && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Request Condonation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Attendance Condonation</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dates to Condone (comma-separated, YYYY-MM-DD)</Label>
                  <Input value={form.condone_dates} onChange={(e) => setForm({ ...form, condone_dates: e.target.value })} placeholder="2026-02-10, 2026-02-11" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Medical leave / On-duty / etc." />
                </div>
                <Button onClick={submitCondonation} className="w-full">Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Approval dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Condonation Request</DialogTitle></DialogHeader>
          {selectedCondonation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Student:</span> {selectedCondonation.profiles?.full_name}</div>
                <div><span className="text-muted-foreground">Course:</span> {selectedCondonation.courses?.code}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Dates:</span> {Array.isArray(selectedCondonation.condone_dates) ? selectedCondonation.condone_dates.join(", ") : "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {selectedCondonation.reason}</div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea value={approvalRemarks} onChange={(e) => setApprovalRemarks(e.target.value)} placeholder="Add remarks..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleApproval(true)} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                </Button>
                <Button variant="destructive" onClick={() => handleApproval(false)} className="flex-1">
                  <XCircle className="h-4 w-4 mr-1" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Condonation Requests</CardTitle>
          <CardDescription>{isStudent ? "Your condonation requests" : "All condonation requests for review"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {!isStudent && <TableHead>Student</TableHead>}
                <TableHead>Course</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                {canApprove && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {condonations.length === 0 ? (
                <TableRow><TableCell colSpan={isStudent ? 5 : 7} className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />No condonation requests
                </TableCell></TableRow>
              ) : condonations.map((c) => (
                <TableRow key={c.id}>
                  {!isStudent && <TableCell className="font-medium">{c.profiles?.full_name || "—"}</TableCell>}
                  <TableCell>{c.courses?.code} — {c.courses?.title}</TableCell>
                  <TableCell className="text-sm">{Array.isArray(c.condone_dates) ? c.condone_dates.join(", ") : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{c.reason}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.applied_at).toLocaleDateString()}</TableCell>
                  {canApprove && (
                    <TableCell>
                      {(c.status === "pending" || (c.status === "faculty_approved" && (role === "hod" || role === "admin"))) && (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedCondonation(c); setApprovalDialogOpen(true); }}>
                          Review
                        </Button>
                      )}
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
