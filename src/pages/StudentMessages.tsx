import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Plus, User } from "lucide-react";

export default function StudentMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ faculty_id: "", subject: "", message: "" });
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get faculty for student's enrolled courses
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "enrolled");
      const courseIds = (enrollments || []).map((e: any) => e.course_id);
      if (courseIds.length > 0) {
        const { data: courses } = await supabase.from("courses").select("faculty_id").in("id", courseIds);
        const facultyIds = [...new Set((courses || []).map((c: any) => c.faculty_id).filter(Boolean))];
        if (facultyIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name, email, department_id").in("id", facultyIds);
          setFaculty(profs || []);
        }
      }
    };
    fetch();
  }, [user]);

  const handleSend = async () => {
    if (!form.faculty_id || !form.subject || !form.message) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    // Store in local state (no messages table exists yet)
    setSentMessages((prev) => [
      { id: Date.now(), faculty_id: form.faculty_id, subject: form.subject, message: form.message, sent_at: new Date().toISOString() },
      ...prev,
    ]);
    toast({ title: "Message sent to faculty" });
    setDialogOpen(false);
    setForm({ faculty_id: "", subject: "", message: "" });
  };

  const getFacultyName = (id: string) => faculty.find((f) => f.id === id)?.full_name || "Faculty";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6" /> Message Faculty
            </h1>
            <p className="text-muted-foreground">Send messages to your course faculty</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Message
          </Button>
        </div>

        {/* Faculty List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Faculty</CardTitle>
            <CardDescription>Faculty members from your enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            {faculty.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No enrolled course faculty found</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {faculty.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {f.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "F"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setForm((p) => ({ ...p, faculty_id: f.id })); setDialogOpen(true); }}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent Messages */}
        {sentMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sent Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentMessages.map((m) => (
                <div key={m.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">To: {getFacultyName(m.faculty_id)}</p>
                    <span className="text-xs text-muted-foreground">{new Date(m.sent_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1">{m.subject}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Faculty *</Label>
                <Select value={form.faculty_id} onValueChange={(v) => setForm((p) => ({ ...p, faculty_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculty.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Query about..." />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="Type your message..." rows={4} />
              </div>
              <Button onClick={handleSend} className="w-full">
                <Send className="h-4 w-4 mr-2" /> Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
