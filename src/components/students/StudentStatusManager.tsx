import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

const STATUSES = ["active", "detained", "discontinued", "suspended", "passout", "alumni"];

interface Props {
  studentId: string;
  currentStatus: string;
  onStatusChange: () => void;
}

export default function StudentStatusManager({ studentId, currentStatus, onStatusChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { fetchHistory(); }, [studentId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase.from("student_status_changes" as any)
      .select("*").eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setHistory((data as any[]) || []);
    setLoading(false);
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === currentStatus) return;

    // Record the change
    await supabase.from("student_status_changes" as any).insert({
      student_id: studentId,
      old_status: currentStatus,
      new_status: newStatus,
      reason: reason || null,
      changed_by: user?.id || null,
    } as any);

    // Update the profile
    await supabase.from("profiles").update({ status: newStatus }).eq("id", studentId);

    toast({ title: "Status changed", description: `${currentStatus} → ${newStatus}` });
    setNewStatus("");
    setReason("");
    fetchHistory();
    onStatusChange();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "suspended": case "discontinued": return "destructive";
      case "passout": case "alumni": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current:</span>
          <Badge variant={statusColor(currentStatus) as any} className="capitalize">{currentStatus}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Change to</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.filter(s => s !== currentStatus).map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for status change" className="h-10" />
          </div>
        </div>
        <Button onClick={handleStatusChange} disabled={!newStatus} size="sm">
          <ArrowRight className="h-4 w-4 mr-2" />Apply Change
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Status History</h4>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
          history.length === 0 ? <p className="text-sm text-muted-foreground">No status changes recorded</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead><TableHead></TableHead><TableHead>To</TableHead>
                  <TableHead>Reason</TableHead><TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell><Badge variant="outline" className="capitalize">{h.old_status}</Badge></TableCell>
                    <TableCell><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                    <TableCell><Badge variant={statusColor(h.new_status) as any} className="capitalize">{h.new_status}</Badge></TableCell>
                    <TableCell className="text-sm">{h.reason || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </div>
    </div>
  );
}
