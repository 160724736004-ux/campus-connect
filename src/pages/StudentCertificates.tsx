import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Award, GraduationCap, BookOpen, Shield } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const CERTIFICATE_TYPES = [
  { id: "bonafide", name: "Bonafide Certificate", icon: Shield, description: "Proof of enrollment at the institution", available: true },
  { id: "study", name: "Study Certificate", icon: BookOpen, description: "Certificate of ongoing study", available: true },
  { id: "character", name: "Character Certificate", icon: Award, description: "Character and conduct certificate", available: true },
  { id: "transfer", name: "Transfer Certificate", icon: FileText, description: "For transferring to another institution", available: false },
  { id: "degree", name: "Degree Certificate", icon: GraduationCap, description: "Awarded upon successful graduation", available: false },
  { id: "provisional", name: "Provisional Certificate", icon: FileText, description: "Provisional degree certificate", available: false },
];

export default function StudentCertificates() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const generateCertificate = async (type: string) => {
    setGenerating(type);
    const { data: inst } = await supabase.from("institution_settings").select("*").limit(1);
    const institution: any = inst?.[0] || { name: "University" };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Border
    doc.setDrawColor(0, 0, 128);
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, 277);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, pageWidth - 26, 271);

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(institution.name || "University", pageWidth / 2, 35, { align: "center" });

    if (institution.address) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(institution.address, pageWidth / 2, 42, { align: "center" });
    }

    // Title
    const titles: Record<string, string> = {
      bonafide: "BONAFIDE CERTIFICATE",
      study: "STUDY CERTIFICATE",
      character: "CHARACTER CERTIFICATE",
    };
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(titles[type] || "CERTIFICATE", pageWidth / 2, 60, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(60, 63, pageWidth - 60, 63);

    // Body
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const name = profile?.full_name || "Student";
    const sid = profile?.student_id_number || "N/A";
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let bodyText = "";
    if (type === "bonafide") {
      bodyText = `This is to certify that ${name} (ID: ${sid}) is a bonafide student of this institution. They are currently enrolled and attending classes regularly.`;
    } else if (type === "study") {
      bodyText = `This is to certify that ${name} (ID: ${sid}) is studying at this institution. This certificate is issued for the purpose of reference.`;
    } else if (type === "character") {
      bodyText = `This is to certify that ${name} (ID: ${sid}) is a student of good character and conduct. They have not been involved in any disciplinary action during their tenure at this institution.`;
    }

    const lines = doc.splitTextToSize(bodyText, pageWidth - 60);
    doc.text(lines, 30, 85);

    // Footer
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, 30, 240);
    doc.text("Principal / Registrar", pageWidth - 60, 240);
    doc.setFontSize(8);
    doc.text("This is a computer-generated certificate.", pageWidth / 2, 270, { align: "center" });

    doc.save(`${type}_certificate_${sid}.pdf`);
    toast({ title: `${titles[type]} downloaded` });
    setGenerating(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6" /> Certificates
          </h1>
          <p className="text-muted-foreground">Download your academic certificates</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATE_TYPES.map((cert) => (
            <Card key={cert.id} className={!cert.available ? "opacity-60" : "hover:shadow-md transition-shadow"}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${cert.available ? "bg-primary/10" : "bg-muted"}`}>
                    <cert.icon className={`h-5 w-5 ${cert.available ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{cert.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{cert.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cert.available ? (
                  <Button
                    onClick={() => generateCertificate(cert.id)}
                    disabled={generating === cert.id}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generating === cert.id ? "Generating..." : "Download"}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="w-full justify-center py-1.5">
                    Not Available Yet
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
