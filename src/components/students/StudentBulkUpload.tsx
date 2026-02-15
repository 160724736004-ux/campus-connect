import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";

interface Props {
  programs: any[];
  batches: any[];
  sections: any[];
  onComplete: () => void;
}

export default function StudentBulkUpload({ programs, batches, sections, onComplete }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      "Roll No", "Admission No", "Full Name", "DOB (YYYY-MM-DD)", "Gender",
      "Mobile", "Email", "Aadhar", "Category", "Quota",
      "Father Name", "Father Mobile", "Mother Name", "Mother Mobile",
      "Guardian Name", "Guardian Mobile",
      "Permanent Address", "Communication Address",
      "Program Code", "Batch Name", "Year", "Section",
      "Admission Type", "Fee Category", "Previous Education",
    ];
    const sample = [
      "24CSE001", "26ADM00001", "Rahul Sharma", "2006-03-15", "Male",
      "9876543210", "rahul@email.com", "123456789012", "General", "convener",
      "Ramesh Sharma", "9876543211", "Sunita Sharma", "9876543212",
      "", "",
      "123 Main St, City", "Same as permanent",
      "B.TECH-CSE", "2024-28", "1", "A",
      "regular", "regular", "12th CBSE 95%",
    ];
    const csv = headers.join(",") + "\n" + sample.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "student_bulk_upload_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { setBulkErrors(["File is empty"]); setBulkDialogOpen(true); return; }

      const rows: any[] = [];
      const errors: string[] = [];
      const existingRolls = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols.length < 7) { errors.push(`Row ${i}: insufficient columns`); continue; }

        const row = {
          student_id_number: cols[0], admission_number: cols[1],
          full_name: cols[2], date_of_birth: cols[3], gender: cols[4],
          phone: cols[5], email: cols[6], aadhar_number: cols[7] || "",
          category: cols[8] || "", admission_quota: cols[9] || "convener",
          father_name: cols[10] || "", father_mobile: cols[11] || "",
          mother_name: cols[12] || "", mother_mobile: cols[13] || "",
          guardian_name: cols[14] || "", guardian_mobile: cols[15] || "",
          permanent_address: cols[16] || "", communication_address: cols[17] || "",
          program_code: cols[18] || "", batch_name: cols[19] || "",
          year: cols[20] || "1", section: cols[21] || "",
          admission_type: cols[22] || "regular", fee_category: cols[23] || "regular",
          previous_education: cols[24] || "",
        };

        // Validation
        if (!row.full_name) { errors.push(`Row ${i}: missing name`); continue; }
        if (!row.email || !/\S+@\S+\.\S+/.test(row.email)) { errors.push(`Row ${i}: invalid email`); continue; }
        if (row.phone && row.phone.length < 10) { errors.push(`Row ${i}: invalid mobile`); continue; }
        if (row.student_id_number && existingRolls.has(row.student_id_number)) {
          errors.push(`Row ${i}: duplicate roll number ${row.student_id_number}`); continue;
        }
        if (row.student_id_number) existingRolls.add(row.student_id_number);
        if (row.program_code && !programs.find(p => p.code === row.program_code)) {
          errors.push(`Row ${i}: unknown program code ${row.program_code}`); continue;
        }

        rows.push(row);
      }

      setBulkData(rows);
      setBulkErrors(errors);
      setBulkDialogOpen(true);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmBulkUpload = async () => {
    setBulkUploading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const row of bulkData) {
      const prog = programs.find(p => p.code === row.program_code);
      const batch = batches.find((b: any) => b.name === row.batch_name);
      const section = row.section ? sections.find((s: any) => s.name === row.section && (!batch || s.batch_id === batch?.id)) : null;

      // Check if user already exists
      const { data: existing } = await supabase.from("profiles").select("id").eq("email", row.email).single();

      if (existing) {
        // Update existing profile
        const payload: any = {
          full_name: row.full_name,
          student_id_number: row.student_id_number || null,
          admission_number: row.admission_number || null,
          phone: row.phone || null,
          date_of_birth: row.date_of_birth || null,
          gender: row.gender || null,
          aadhar_number: row.aadhar_number || null,
          category: row.category || null,
          admission_quota: row.admission_quota || "convener",
          father_name: row.father_name || null,
          father_mobile: row.father_mobile || null,
          mother_name: row.mother_name || null,
          mother_mobile: row.mother_mobile || null,
          guardian_name: row.guardian_name || null,
          guardian_mobile: row.guardian_mobile || null,
          permanent_address: row.permanent_address || null,
          communication_address: row.communication_address || null,
          program_id: prog?.id || null,
          department_id: prog?.department_id || null,
          batch_id: batch?.id || null,
          section_id: section?.id || null,
          year_of_study: parseInt(row.year) || 1,
          admission_type: row.admission_type || "regular",
          fee_category: row.fee_category || "regular",
          previous_education: row.previous_education || null,
          admission_date: new Date().toISOString().split("T")[0],
        };
        const { error } = await supabase.from("profiles").update(payload).eq("id", existing.id);
        if (error) errors.push(`${row.email}: ${error.message}`);
        else successCount++;
      } else {
        errors.push(`${row.email}: no account found (student must sign up first)`);
      }
    }

    setBulkUploading(false);
    setBulkDialogOpen(false);
    toast({ title: "Bulk upload complete", description: `${successCount} updated, ${errors.length} errors` });
    if (errors.length > 0) setBulkErrors(errors);
    onComplete();
  };

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Bulk Student Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Upload a CSV file with student data. Download the template first to see the required format.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Download Template</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload CSV</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>

          {bulkErrors.length > 0 && !bulkDialogOpen && (
            <Card className="border-destructive">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />{bulkErrors.length} Errors from last upload
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm max-h-32 overflow-y-auto space-y-1">
                {bulkErrors.map((e, i) => <p key={i} className="text-destructive">{e}</p>)}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Upload Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {bulkErrors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />{bulkErrors.length} Errors
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm max-h-32 overflow-y-auto space-y-1">
                  {bulkErrors.map((e, i) => <p key={i} className="text-destructive">{e}</p>)}
                </CardContent>
              </Card>
            )}
            {bulkData.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />{bulkData.length} Valid Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead><TableHead>Adm No</TableHead>
                        <TableHead>Name</TableHead><TableHead>Email</TableHead>
                        <TableHead>Program</TableHead><TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkData.slice(0, 15).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{r.student_id_number}</TableCell>
                          <TableCell className="font-mono">{r.admission_number}</TableCell>
                          <TableCell>{r.full_name}</TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.program_code}</TableCell>
                          <TableCell>{r.category || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {bulkData.length > 15 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">...and {bulkData.length - 15} more</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Button onClick={confirmBulkUpload} disabled={bulkUploading || bulkData.length === 0} className="w-full">
              {bulkUploading ? "Processing..." : `Import ${bulkData.length} Students`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
