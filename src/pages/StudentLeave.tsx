import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function StudentLeave() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [condonations, setCondonations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ course_id: "", reason: "", dates: "" });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [condRes, enrollRes] = await Promise.all([
        supabase.from("attendance_condonations").select("*, courses(code, title)").eq("student_id", user.id).order("applied_at", { ascending: false }),
        supabase.from("enrollments").select("course_id, courses(id, code, title)").eq("student_id", user.id).eq("status", "enrolled"),
      ]);
      setCondonations(condRes.data || []);
      setCourses((enrollRes.data || []).map((e: any) => e.courses).filter(Boolean));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSubmit = async () => {
    if (!form.course_id || !form.reason || !form.dates) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    const dates = form.dates.split(",").map((d) => d.trim()).filter(Boolean);
    const { error } = await supabase.from("attendance_condonations").insert({
      student_id: user!.id,
      course_id: form.course_id,
      reason: form.reason,
      condone_dates: dates,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Leave/condonation request submitted" });
    setDialogOpen(false);
    setForm({ course_id: "", reason: "", dates: "" });
    // Refresh
    const { data } = await supabase.from("attendance_condonations").select("*, courses(code, title)").eq("student_id", user!.id).order("applied_at", { ascending: false });
    setCondonations(data || []);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Send className="h-6 w-6" /> Leave & Condonation
            </h1>
            <p className="text-muted-foreground">Apply for attendance condonation or view status</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : condonations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No condonation requests yet</p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4" variant="outline">Apply Now</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {condonations.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {getStatusIcon(c.status)}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{c.courses?.code} — {c.courses?.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{c.reason}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant={getStatusVariant(c.status)} className="text-xs capitalize">{c.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Applied {new Date(c.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {c.faculty_remarks && <p className="text-xs text-muted-foreground mt-1">Faculty: {c.faculty_remarks}</p>}
                        {c.hod_remarks && <p className="text-xs text-muted-foreground mt-1">HOD: {c.hod_remarks}</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave / Condonation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm((p) => ({ ...p, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dates (comma-separated) *</Label>
                <Input
                  value={form.dates}
                  onChange={(e) => setForm((p) => ({ ...p, dates: e.target.value }))}
                  placeholder="2026-02-10, 2026-02-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Medical leave / Family emergency / etc."
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                <Send className="h-4 w-4 mr-2" /> Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
