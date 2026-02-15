import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpCircle, GraduationCap, AlertTriangle, Users } from "lucide-react";

const PROMOTION_TYPES = ["promoted", "detained", "readmitted", "lateral_entry", "transferred_in", "passout", "alumni_converted"];

export default function StudentProgression() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  // Bulk promotion
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [promotionType, setPromotionType] = useState("promoted");
  const [targetYear, setTargetYear] = useState("");
  const [targetSemester, setTargetSemester] = useState("");
  const [promotionRemarks, setPromotionRemarks] = useState("");
  const [promotionAcadYear, setPromotionAcadYear] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sRes, rRes, pRes, bRes, ayRes, prRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("programs").select("*"),
      supabase.from("batches" as any).select("*"),
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("student_promotions" as any).select("*").order("promoted_at", { ascending: false }),
    ]);
    const studentIds = new Set((rRes.data || []).map((r: any) => r.user_id));
    setStudents((sRes.data || []).filter((p: any) => studentIds.has(p.id) && p.status === "active"));
    setPrograms(pRes.data || []);
    setBatches((bRes.data as any[]) || []);
    setAcademicYears((ayRes.data as any[]) || []);
    setPromotions((prRes.data as any[]) || []);
    setLoading(false);
  };

  const filtered = students.filter(s => {
    if (filterProgram !== "all" && s.program_id !== filterProgram) return false;
    if (filterBatch !== "all" && s.batch_id !== filterBatch) return false;
    if (filterYear !== "all" && String(s.year_of_study) !== filterYear) return false;
    return true;
  });

  const getProgName = (id: string | null) => programs.find(p => p.id === id)?.name || "—";
  const getBatchName = (id: string | null) => batches.find((b: any) => b.id === id)?.name || "—";

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedStudents(next);
  };

  const toggleAll = () => {
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.id)));
    }
  };

  const openBulkPromotion = () => {
    if (selectedStudents.size === 0) {
      toast({ title: "Select students first", variant: "destructive" });
      return;
    }
    setPromotionType("promoted");
    setTargetYear("");
    setTargetSemester("");
    setPromotionRemarks("");
    setPromotionAcadYear("");
    setBulkDialogOpen(true);
  };

  const handleBulkPromotion = async () => {
    if (!targetYear) {
      toast({ title: "Target year is required", variant: "destructive" });
      return;
    }

    let success = 0;
    for (const sid of selectedStudents) {
      const student = students.find(s => s.id === sid);
      if (!student) continue;

      // Create promotion record
      await supabase.from("student_promotions" as any).insert({
        student_id: sid,
        from_year: student.year_of_study || 1,
        to_year: parseInt(targetYear),
        from_semester: null,
        to_semester: targetSemester ? parseInt(targetSemester) : null,
        promotion_type: promotionType,
        academic_year_id: promotionAcadYear || null,
        credits_at_promotion: student.credits_earned || 0,
        backlogs_at_promotion: student.backlogs || 0,
        remarks: promotionRemarks || null,
        promoted_by: user?.id || null,
      } as any);

      // Update profile
      const updatePayload: any = { year_of_study: parseInt(targetYear) };
      if (promotionType === "passout") updatePayload.status = "passout";
      if (promotionType === "alumni_converted") updatePayload.status = "alumni";
      if (promotionType === "detained") updatePayload.status = "detained";

      await supabase.from("profiles").update(updatePayload).eq("id", sid);
      success++;
    }

    toast({ title: "Promotion complete", description: `${success} students processed` });
    setBulkDialogOpen(false);
    setSelectedStudents(new Set());
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Student Progression</h2>
          <p className="text-sm text-muted-foreground">Manage promotions, detentions, and semester progression</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openBulkPromotion} disabled={selectedStudents.size === 0}>
            <ArrowUpCircle className="h-4 w-4 mr-2" />Promote Selected ({selectedStudents.size})
          </Button>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBatch} onValueChange={setFilterBatch}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {[1, 2, 3, 4, 5, 6].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedStudents.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Roll No</TableHead><TableHead>Name</TableHead>
                <TableHead>Program</TableHead><TableHead>Batch</TableHead>
                <TableHead>Year</TableHead><TableHead>Credits</TableHead>
                <TableHead>Backlogs</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No active students match filters</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell><Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} /></TableCell>
                  <TableCell className="font-mono text-sm">{s.student_id_number || "—"}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{getProgName(s.program_id)}</TableCell>
                  <TableCell>{getBatchName(s.batch_id)}</TableCell>
                  <TableCell>{s.year_of_study || "—"}</TableCell>
                  <TableCell>{s.credits_earned || 0}</TableCell>
                  <TableCell>
                    {(s.backlogs || 0) > 0 ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{s.backlogs}</Badge>
                    ) : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell><Badge variant="default" className="capitalize">{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Promotions */}
      {promotions.length > 0 && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Recent Promotions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>From</TableHead><TableHead>To</TableHead>
                  <TableHead>Type</TableHead><TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.slice(0, 20).map(p => {
                  const student = students.find(s => s.id === p.student_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{student?.full_name || "—"}</TableCell>
                      <TableCell>Year {p.from_year}</TableCell>
                      <TableCell>Year {p.to_year}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{p.promotion_type.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(p.promoted_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Promotion Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulk Student Promotion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground"><Users className="h-4 w-4 inline mr-1" />{selectedStudents.size} students selected</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Promotion Type</Label>
                <Select value={promotionType} onValueChange={setPromotionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROMOTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Target Year *</Label>
                <Input type="number" min="1" max="8" value={targetYear} onChange={e => setTargetYear(e.target.value)} placeholder="e.g. 2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Target Semester (optional)</Label>
                <Input type="number" min="1" max="16" value={targetSemester} onChange={e => setTargetSemester(e.target.value)} />
              </div>
              <div className="space-y-2"><Label>Academic Year</Label>
                <Select value={promotionAcadYear} onValueChange={setPromotionAcadYear}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Remarks</Label><Textarea value={promotionRemarks} onChange={e => setPromotionRemarks(e.target.value)} placeholder="Optional remarks" /></div>
            <Button onClick={handleBulkPromotion} className="w-full">
              <ArrowUpCircle className="h-4 w-4 mr-2" />Process {selectedStudents.size} Students
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
