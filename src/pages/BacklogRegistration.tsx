import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CreditCard, FileCheck, AlertCircle, Ticket, Download } from "lucide-react";

export default function BacklogRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [backlogs, setBacklogs] = useState<any[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [hallTickets, setHallTickets] = useState<any[]>([]);

  const activeWindow = windows.find(
    (w) => w.is_active && new Date(w.start_date) <= new Date() && new Date(w.end_date) >= new Date()
  );
  const registration = activeWindow ? registrations.find((r: any) => r.window_id === activeWindow.id) : null;

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [backRes, winRes, regRes] = await Promise.all([
        supabase
          .from("student_backlogs" as any)
          .select("*, enrollments(semester, course_id, courses(code, title))")
          .eq("student_id", user.id)
          .in("status", ["pending", "attempting"]),
        supabase
          .from("supplementary_registration_windows" as any)
          .select("*, exams(name)")
          .eq("is_active", true)
          .order("end_date", { ascending: false }),
        supabase
          .from("supplementary_registrations" as any)
          .select("*, supplementary_registration_subjects(backlog_id)")
          .eq("student_id", user.id)
          .order("registered_at", { ascending: false }),
      ]);
      const items = (backRes.data || []).map((b: any) => ({
        ...b,
        semester: b.enrollments?.semester || "—",
        courseCode: b.enrollments?.courses?.code || "—",
        courseTitle: b.enrollments?.courses?.title || "—",
      }));
      setBacklogs(items);
      setWindows(winRes.data || []);
      const regs = regRes.data || [];
      setRegistrations(regs);
      const paidRegIds = regs.filter((r: any) => r.payment_status === "paid").map((r: any) => r.id);
      if (paidRegIds.length > 0) {
        const { data: ht } = await supabase.from("supplementary_hall_tickets" as any).select("*, exam_schedules(exam_date, start_time, courses(code, title)), exam_halls(name, building)").in("registration_id", paidRegIds);
        setHallTickets(ht || []);
      } else setHallTickets([]);
      const win = (winRes.data || []).find((w: any) => w.is_active && new Date(w.start_date) <= new Date() && new Date(w.end_date) >= new Date());
      if (win) {
        const reg = regs.find((r: any) => r.window_id === win.id);
        if (reg?.supplementary_registration_subjects) {
          setSelectedBacklogIds(new Set((reg.supplementary_registration_subjects as any[]).map((s: any) => s.backlog_id)));
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const toggleBacklog = (id: string) => {
    setSelectedBacklogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRegister = async () => {
    if (!activeWindow || selectedBacklogIds.size === 0) return;
    setSubmitting(true);
    const feePerSubject = parseFloat(activeWindow.fee_per_subject || 0);
    const totalAmount = selectedBacklogIds.size * feePerSubject;

    const { data: existing } = await supabase
      .from("supplementary_registrations" as any)
      .select("id")
      .eq("student_id", user?.id)
      .eq("window_id", activeWindow.id)
      .maybeSingle();

    let regId: string;
    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("supplementary_registrations" as any)
        .update({ total_amount: totalAmount, payment_status: "pending" })
        .eq("id", existing.id);
      if (upErr) {
        toast({ title: "Error", description: upErr.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      regId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("supplementary_registrations" as any)
        .insert({ student_id: user?.id, window_id: activeWindow.id, total_amount: totalAmount, payment_status: "pending" })
        .select("id")
        .single();
      if (insErr) {
        toast({ title: "Error", description: insErr.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      regId = inserted?.id;
    }

    await supabase.from("supplementary_registration_subjects" as any).delete().eq("registration_id", regId);
    for (const bid of selectedBacklogIds) {
      await supabase.from("supplementary_registration_subjects" as any).insert({ registration_id: regId, backlog_id: bid });
    }

    toast({ title: "Registration submitted", description: `Pay $${totalAmount.toFixed(2)} to complete. Hall ticket will be generated after payment.` });
    setSubmitting(false);
    const { data: refreshed } = await supabase.from("supplementary_registrations" as any).select("*, supplementary_registration_subjects(backlog_id)").eq("id", regId).single();
    if (refreshed) setRegistrations((prev) => {
      const rest = prev.filter((r: any) => r.id !== regId);
      return [refreshed, ...rest];
    });
  };


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplementary Exam Registration</h1>
          <p className="text-muted-foreground">Select backlog subjects, pay exam fee, and get your hall ticket</p>
        </div>

        {!activeWindow ? (
          <Card className="border-amber-500/50">
            <CardContent className="py-8 flex items-center gap-4">
              <AlertCircle className="h-10 w-10 text-amber-600" />
              <div>
                <p className="font-medium">No active registration window</p>
                <p className="text-sm text-muted-foreground">Registration will open between the start and end dates. Check back later.</p>
                {windows.length > 0 && (
                  <p className="text-sm mt-2">Next window: {windows[0].name} — {new Date(windows[0].start_date).toLocaleDateString()} to {new Date(windows[0].end_date).toLocaleDateString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Registration Window</CardTitle>
                <CardDescription>
                  {activeWindow.name} — {new Date(activeWindow.start_date).toLocaleDateString()} to {new Date(activeWindow.end_date).toLocaleDateString()}
                </CardDescription>
                <p className="text-sm">Fee: ${parseFloat(activeWindow.fee_per_subject || 0).toFixed(2)} per subject • Internal marks: {activeWindow.internal_marks_handling === "retain_old" ? "Retain previous" : "Re-evaluate"}</p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select subjects to attempt</CardTitle>
                <CardDescription>Choose which backlog subjects you want to register for</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {backlogs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No pending backlogs</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Subject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backlogs.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <Checkbox checked={selectedBacklogIds.has(b.id)} onCheckedChange={() => toggleBacklog(b.id)} />
                          </TableCell>
                          <TableCell>{b.semester}</TableCell>
                          <TableCell className="font-mono">{b.courseCode}</TableCell>
                          <TableCell>{b.courseTitle}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedBacklogIds.size > 0 && (
              <Card>
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedBacklogIds.size} subject(s) selected</p>
                    <p className="text-sm text-muted-foreground">Total: ${(selectedBacklogIds.size * parseFloat(activeWindow.fee_per_subject || 0)).toFixed(2)}</p>
                  </div>
                  <Button onClick={handleRegister} disabled={submitting}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Submit registration
                  </Button>
                </CardContent>
              </Card>
            )}

            {registration && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> Your registration</CardTitle>
                  <CardDescription>
                    Amount: ${parseFloat(registration.total_amount || 0).toFixed(2)} • Status: <Badge variant={registration.payment_status === "paid" ? "default" : "secondary"}>{registration.payment_status}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {registration.payment_status === "paid" ? (
                    <div className="space-y-3">
                      {hallTickets.filter((ht: any) => ht.registration_id === registration.id).length > 0 ? (
                        <div>
                          <p className="text-sm font-medium mb-2">Your hall ticket</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Hall</TableHead>
                                <TableHead>Seat</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {hallTickets.filter((ht: any) => ht.registration_id === registration.id).map((ht: any) => (
                                <TableRow key={ht.id}>
                                  <TableCell className="font-mono">{ht.exam_schedules?.courses?.code || "—"} {ht.exam_schedules?.courses?.title || ""}</TableCell>
                                  <TableCell>{ht.exam_schedules?.exam_date || "—"}</TableCell>
                                  <TableCell>{ht.exam_schedules?.start_time || "—"}</TableCell>
                                  <TableCell>{ht.exam_halls?.name || "—"} {ht.exam_halls?.building ? `(${ht.exam_halls.building})` : ""}</TableCell>
                                  <TableCell>{ht.seat_number || "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Payment confirmed. Hall ticket will be generated for your registered subjects. Check back soon.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pay the amount at the exam cell to complete registration. Hall ticket will be generated after payment confirmation.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
