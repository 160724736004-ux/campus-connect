import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, History } from "lucide-react";

export function AttendanceCorrection() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [corrections, setCorrections] = useState<any[]>([]);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<any>(null);
  const [remarks, setRemarks] = useState("");

  const canApprove = role === "faculty" || role === "hod" || role === "admin";

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      let query = supabase.from("attendance_corrections")
        .select("*, profiles!attendance_corrections_requested_by_fkey(full_name, student_id_number), attendance_records(date, course_id, courses(code, title))");

      if (role === "student") {
        query = query.eq("requested_by", user.id);
      }

      const { data } = await query.order("created_at", { ascending: false });
      setCorrections(data || []);
    };
    fetch();
  }, [user, role]);

  const handleApproval = async (approved: boolean) => {
    if (!selectedCorrection || !user) return;

    await supabase.from("attendance_corrections").update({
      status: approved ? "approved" : "rejected",
      approved_by: user.id,
    }).eq("id", selectedCorrection.id);

    // If approved, update the original attendance record
    if (approved) {
      await supabase.from("attendance_records").update({
        status: selectedCorrection.corrected_status,
        attendance_type_id: selectedCorrection.corrected_type_id,
      }).eq("id", selectedCorrection.attendance_record_id);
    }

    toast({ title: approved ? "Correction approved and applied" : "Correction rejected" });
    setApprovalDialogOpen(false);
    setSelectedCorrection(null);

    // Refresh
    const { data } = await supabase.from("attendance_corrections")
      .select("*, profiles!attendance_corrections_requested_by_fkey(full_name, student_id_number), attendance_records(date, course_id, courses(code, title))")
      .order("created_at", { ascending: false });
    setCorrections(data || []);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Correction Request</DialogTitle></DialogHeader>
          {selectedCorrection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Requested by:</span> {selectedCorrection.profiles?.full_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {selectedCorrection.attendance_records?.date}</div>
                <div><span className="text-muted-foreground">Course:</span> {selectedCorrection.attendance_records?.courses?.code}</div>
                <div><span className="text-muted-foreground">Change:</span> {selectedCorrection.original_status} → {selectedCorrection.corrected_status}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {selectedCorrection.reason}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleApproval(true)} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />Approve & Apply
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
          <CardTitle>Attendance Corrections</CardTitle>
          <CardDescription>Audit trail of all attendance corrections — original values are preserved</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested By</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                {canApprove && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.length === 0 ? (
                <TableRow><TableCell colSpan={canApprove ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />No correction requests
                </TableCell></TableRow>
              ) : corrections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.profiles?.full_name || "—"}</TableCell>
                  <TableCell>{c.attendance_records?.courses?.code || "—"}</TableCell>
                  <TableCell className="text-sm">{c.attendance_records?.date || "—"}</TableCell>
                  <TableCell>
                    <span className="text-destructive">{c.original_status}</span>
                    <span className="mx-1">→</span>
                    <span className="text-green-600">{c.corrected_status}</span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{c.reason}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  {canApprove && (
                    <TableCell>
                      {c.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedCorrection(c); setApprovalDialogOpen(true); }}>Review</Button>
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
