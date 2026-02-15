import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, CalendarDays } from "lucide-react";

const EVENT_TYPES = [
  "general", "holiday", "exam_period", "registration_period", "teaching_period",
  "semester_break", "orientation", "convocation", "workshop", "cultural",
];

export function AcademicCalendar() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [events, setEvents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", event_type: "general", start_date: "", end_date: "", description: "",
    academic_year_id: "", department_id: "", program_id: "", applicable_year: "",
    is_holiday: false, is_working_day: true,
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [evRes, ayRes, dRes, pRes] = await Promise.all([
      supabase.from("academic_calendar_events" as any).select("*").order("start_date"),
      supabase.from("academic_years" as any).select("*").order("start_date", { ascending: false }),
      supabase.from("departments").select("id, name"),
      supabase.from("programs").select("id, name"),
    ]);
    setEvents((evRes.data as any[]) || []);
    setAcademicYears((ayRes.data as any[]) || []);
    setDepartments(dRes.data || []);
    setPrograms(pRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date || !form.end_date) return;
    await supabase.from("academic_calendar_events" as any).insert({
      title: form.title, event_type: form.event_type,
      start_date: form.start_date, end_date: form.end_date,
      description: form.description || null,
      academic_year_id: form.academic_year_id || null,
      department_id: form.department_id || null,
      program_id: form.program_id || null,
      applicable_year: form.applicable_year ? parseInt(form.applicable_year) : null,
      is_holiday: form.is_holiday, is_working_day: form.is_working_day,
    } as any);
    toast({ title: "Event created" }); setDialogOpen(false); fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("academic_calendar_events" as any).delete().eq("id", id);
    toast({ title: "Event deleted" }); fetchAll();
  };

  const getAYName = (id: string) => academicYears.find(a => a.id === id)?.name || "—";
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || "";
  const getProgName = (id: string) => programs.find(p => p.id === id)?.name || "";

  const filtered = events.filter(e => {
    if (filterType !== "all" && e.event_type !== filterType) return false;
    if (filterYear && e.academic_year_id !== filterYear) return false;
    return true;
  });

  // Group events by month for calendar view
  const eventsByMonth: Record<string, any[]> = {};
  filtered.forEach(e => {
    const month = e.start_date.slice(0, 7);
    if (!eventsByMonth[month]) eventsByMonth[month] = [];
    eventsByMonth[month].push(e);
  });

  const getEventColor = (type: string) => {
    switch (type) {
      case "holiday": return "destructive";
      case "exam_period": return "secondary";
      case "registration_period": return "default";
      case "teaching_period": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 items-center">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setForm({ title: "", event_type: "general", start_date: "", end_date: "", description: "", academic_year_id: academicYears.find(a => a.is_active)?.id || "", department_id: "", program_id: "", applicable_year: "", is_holiday: false, is_working_day: true }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Event
          </Button>
        )}
      </div>

      {/* Calendar View */}
      {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
       Object.keys(eventsByMonth).length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No events found</CardContent></Card> :
       Object.entries(eventsByMonth).sort().map(([month, events]) => (
        <Card key={month}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    <Badge variant={getEventColor(e.event_type) as any}>{e.event_type.replace(/_/g, " ")}</Badge>
                    {e.is_holiday && <Badge variant="destructive">Holiday</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {e.start_date} — {e.end_date}
                    {getDeptName(e.department_id) && ` • ${getDeptName(e.department_id)}`}
                    {getProgName(e.program_id) && ` • ${getProgName(e.program_id)}`}
                    {e.applicable_year && ` • Year ${e.applicable_year}`}
                  </div>
                  {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                </div>
                {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Mid-Semester Exams" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v, is_holiday: v === "holiday" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Academic Year</Label>
                <Select value={form.academic_year_id} onValueChange={v => setForm(p => ({ ...p, academic_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{academicYears.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm(p => ({ ...p, department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Program</Label>
                <Select value={form.program_id} onValueChange={v => setForm(p => ({ ...p, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Year</Label><Input type="number" min="1" max="6" value={form.applicable_year} onChange={e => setForm(p => ({ ...p, applicable_year: e.target.value }))} placeholder="All" /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_holiday} onCheckedChange={c => setForm(p => ({ ...p, is_holiday: !!c }))} /> Holiday</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_working_day} onCheckedChange={c => setForm(p => ({ ...p, is_working_day: !!c }))} /> Working Day</label>
            </div>
            <Button onClick={handleSave} className="w-full">Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
