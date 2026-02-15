import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Printer } from "lucide-react";
import jsPDF from "jspdf";

export default function StudentHallTickets() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [enrollRes, examRes, instRes] = await Promise.all([
        supabase.from("enrollments").select("*, courses(code, title, credits, semester)").eq("student_id", user.id).eq("status", "enrolled"),
        supabase.from("exam_schedules" as any).select("*").order("exam_date"),
        supabase.from("institution_settings").select("*").limit(1),
      ]);
      setEnrollments(enrollRes.data || []);
      setExamSchedules((examRes.data as any[]) || []);
      setInstitution(instRes.data?.[0] || null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const generateHallTicket = () => {
    const doc = new jsPDF();
    const inst = institution;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(inst?.name || "University", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(inst?.address || "", 105, 27, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("HALL TICKET", 105, 38, { align: "center" });

    // Line
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Student Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const y = 52;
    doc.text(`Name: ${profile?.full_name || ""}`, 20, y);
    doc.text(`ID: ${(profile as any)?.student_id_number || ""}`, 120, y);
    doc.text(`Program: ${(profile as any)?.program_name || ""}`, 20, y + 7);
    doc.text(`Semester: ${enrollments[0]?.courses?.semester || ""}`, 120, y + 7);

    // Subjects Table
    doc.setFontSize(9);
    let tableY = y + 20;
    doc.setFont("helvetica", "bold");
    doc.text("S.No", 22, tableY);
    doc.text("Course Code", 40, tableY);
    doc.text("Course Title", 75, tableY);
    doc.text("Credits", 155, tableY);
    doc.line(20, tableY + 2, 190, tableY + 2);

    doc.setFont("helvetica", "normal");
    enrollments.forEach((e: any, idx: number) => {
      tableY += 7;
      doc.text(String(idx + 1), 25, tableY);
      doc.text(e.courses?.code || "", 40, tableY);
      doc.text(e.courses?.title || "", 75, tableY);
      doc.text(String(e.courses?.credits || ""), 160, tableY);
    });

    // Footer
    tableY += 20;
    doc.setFontSize(8);
    doc.text("This is a computer-generated document.", 105, tableY, { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, tableY + 5, { align: "center" });

    doc.save(`hall_ticket_${profile?.student_id_number || "student"}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" /> Hall Tickets
          </h1>
          <p className="text-muted-foreground">Download your exam hall tickets</p>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No enrolled courses found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>Current Semester Hall Ticket</CardTitle>
                    <CardDescription>{enrollments.length} subjects enrolled</CardDescription>
                  </div>
                  <Button onClick={generateHallTicket}>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2 font-medium">{profile?.full_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Student ID:</span>
                      <span className="ml-2 font-medium">{profile?.student_id_number || "—"}</span>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Code</th>
                          <th className="text-left p-3 font-medium">Course</th>
                          <th className="text-left p-3 font-medium">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e: any, idx: number) => (
                          <tr key={e.id} className="border-t border-border/50">
                            <td className="p-3">{idx + 1}</td>
                            <td className="p-3 font-medium">{e.courses?.code}</td>
                            <td className="p-3">{e.courses?.title}</td>
                            <td className="p-3"><Badge variant="outline">{e.courses?.credits}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
