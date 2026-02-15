import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, Plus, Clock, CheckCircle, XCircle } from "lucide-react";

export default function FacultyLeave() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ leave_type_id: "", start_date: "", end_date: "", reason: "" });

  const fetchData = async () => {
    if (!user) return;
    const [typesRes, reqRes] = await Promise.all([
      supabase.from("leave_types").select("*").order("name"),
      supabase.from("leave_requests").select("*, leave_types(name), profiles!leave_requests_approved_by_fkey(full_name)").eq("staff_id", user.id).order("created_at", { ascending: false }),
    ]);
    setLeaveTypes(typesRes.data || []);
    setRequests(reqRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await supabase.from("leave_requests").insert({
      staff_id: user!.id,
      leave_type_id: form.leave_type_id,
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      reason: form.reason || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Leave request submitted" });
    setDialogOpen(false);
    setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
    fetchData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
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
              <Send className="h-6 w-6" /> Leave Application
            </h1>
            <p className="text-muted-foreground">Apply for leave and track your requests</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No leave requests</p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4" variant="outline">Apply Now</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(r.status)}
                      <div>
                        <p className="text-sm font-semibold">{r.leave_types?.name || "Leave"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.start_date).toLocaleDateString()} — {new Date(r.end_date).toLocaleDateString()} ({r.days} day{r.days !== 1 ? "s" : ""})
                        </p>
                        {r.reason && <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant={getStatusVariant(r.status)} className="text-xs capitalize">{r.status}</Badge>
                          {r.profiles?.full_name && <span className="text-xs text-muted-foreground">Reviewed by {r.profiles.full_name}</span>}
                        </div>
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
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={form.leave_type_id} onValueChange={(v) => setForm((p) => ({ ...p, leave_type_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} (max {t.max_days_per_year} days/year)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave..." rows={3} />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                <Send className="h-4 w-4 mr-2" /> Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
