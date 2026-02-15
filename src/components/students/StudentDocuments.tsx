import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Trash2, ExternalLink } from "lucide-react";

const DOC_TYPES = [
  "Photo", "Signature", "10th Marksheet", "12th Marksheet",
  "Transfer Certificate", "Migration Certificate", "Caste Certificate",
  "Income Certificate", "Aadhar Card", "Birth Certificate",
  "Degree Certificate", "Other",
];

interface Props {
  studentId: string;
}

export default function StudentDocuments({ studentId }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("Photo");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, [studentId]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase.from("student_documents" as any).select("*").eq("student_id", studentId).order("uploaded_at", { ascending: false });
    setDocs((data as any[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `${studentId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("student-documents").upload(filePath, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("student-documents").getPublicUrl(filePath);
    const { error: dbErr } = await supabase.from("student_documents" as any).insert({
      student_id: studentId,
      document_type: docType,
      document_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
    } as any);

    if (dbErr) {
      toast({ title: "Error saving record", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    fetchDocs();
  };

  const toggleVerified = async (doc: any) => {
    await supabase.from("student_documents" as any).update({ verified: !doc.verified } as any).eq("id", doc.id);
    fetchDocs();
  };

  const deleteDoc = async (doc: any) => {
    // Delete from storage
    const pathParts = doc.file_url.split("/student-documents/");
    if (pathParts[1]) {
      await supabase.storage.from("student-documents").remove([decodeURIComponent(pathParts[1])]);
    }
    await supabase.from("student_documents" as any).delete().eq("id", doc.id);
    toast({ title: "Document deleted" });
    fetchDocs();
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="space-y-2 flex-1">
          <Label>Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead>Size</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map(d => (
              <TableRow key={d.id}>
                <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                <TableCell className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.document_name}</TableCell>
                <TableCell>{formatSize(d.file_size)}</TableCell>
                <TableCell>
                  <Badge variant={d.verified ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleVerified(d)}>
                    {d.verified ? <><CheckCircle className="h-3 w-3 mr-1" />Verified</> : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild><a href={d.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDoc(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
