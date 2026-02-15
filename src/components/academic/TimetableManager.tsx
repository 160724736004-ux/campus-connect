import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertTriangle, Clock } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetableManager() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSection, setSelectedSection] = useState("");
  const [selectedDay, setSelectedDay] = useState("1");

  // Slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({ name: "", start_time: "09:00", end_time: "10:00", slot_type: "theory", is_break: false });

  // Entry dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ course_id: "", faculty_id: "", time_slot_id: "", day_of_week: "1", room: "", entry_type: "regular" });

  // Conflicts
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [slotRes, entryRes, secRes, courseRes, rolesRes] = await Promise.all([
      supabase.from("time_slots" as any).select("*").order("start_time"),
      supabase.from("timetable_entries" as any).select("*").eq("status", "active"),
      supabase.from("sections" as any).select("*"),
      supabase.from("courses").select("id, code, title"),
      supabase.from("user_roles").select("user_id").eq("role", "faculty"),
    ]);
    const facultyIds = (rolesRes.data || []).map((r: any) => r.user_id);
    let facultyProfiles: any[] = [];
    if (facultyIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", facultyIds);
      facultyProfiles = data || [];
    }
    setTimeSlots((slotRes.data as any[]) || []);
    setEntries((entryRes.data as any[]) || []);
    setSections((secRes.data as any[]) || []);
    setCourses(courseRes.data || []);
    setFaculty(facultyProfiles);
    setLoading(false);
  };

  const getCourseName = (id: string) => { const c = courses.find(c => c.id === id); return c ? `${c.code} - ${c.title}` : "—"; };
  const getFacultyName = (id: string) => faculty.find(f => f.id === id)?.full_name || "—";
  const getSlotName = (id: string) => { const s = timeSlots.find(s => s.id === id); return s ? `${s.name} (${s.start_time?.slice(0,5)}-${s.end_time?.slice(0,5)})` : "—"; };
  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || "—";

  // Detect conflicts
  useEffect(() => {
    const newConflicts: string[] = [];
    entries.forEach((e1, i) => {
      entries.forEach((e2, j) => {
        if (i >= j) return;
        if (e1.day_of_week !== e2.day_of_week || e1.time_slot_id !== e2.time_slot_id) return;
        // Faculty conflict
        if (e1.faculty_id && e1.faculty_id === e2.faculty_id) {
          newConflicts.push(`Faculty ${getFacultyName(e1.faculty_id)} double-booked on ${DAYS[e1.day_of_week]} at ${getSlotName(e1.time_slot_id)}`);
        }
        // Room conflict
        if (e1.room && e1.room === e2.room) {
          newConflicts.push(`Room ${e1.room} double-booked on ${DAYS[e1.day_of_week]} at ${getSlotName(e1.time_slot_id)}`);
        }
        // Section conflict
        if (e1.section_id && e1.section_id === e2.section_id) {
          newConflicts.push(`Section ${getSectionName(e1.section_id)} double-booked on ${DAYS[e1.day_of_week]} at ${getSlotName(e1.time_slot_id)}`);
        }
      });
    });
    setConflicts([...new Set(newConflicts)]);
  }, [entries, timeSlots, faculty, sections]);

  // Save time slot
  const handleSaveSlot = async () => {
    if (!slotForm.name) return;
    await supabase.from("time_slots" as any).insert({
      name: slotForm.name, start_time: slotForm.start_time, end_time: slotForm.end_time,
      slot_type: slotForm.slot_type, is_break: slotForm.is_break,
    } as any);
    toast({ title: "Time slot created" }); setSlotDialogOpen(false); fetchAll();
  };
  const deleteSlot = async (id: string) => {
    await supabase.from("time_slots" as any).delete().eq("id", id);
    toast({ title: "Slot deleted" }); fetchAll();
  };

  // Save timetable entry
  const handleSaveEntry = async () => {
    if (!entryForm.course_id || !entryForm.time_slot_id) return;
    await supabase.from("timetable_entries" as any).insert({
      section_id: selectedSection || null,
      course_id: entryForm.course_id, faculty_id: entryForm.faculty_id || null,
      time_slot_id: entryForm.time_slot_id, day_of_week: parseInt(entryForm.day_of_week),
      room: entryForm.room || null, entry_type: entryForm.entry_type,
    } as any);
    toast({ title: "Timetable entry added" }); setEntryDialogOpen(false); fetchAll();
  };
  const deleteEntry = async (id: string) => {
    await supabase.from("timetable_entries" as any).delete().eq("id", id);
    toast({ title: "Entry removed" }); fetchAll();
  };

  // Filter entries by section & day
  const sectionEntries = entries.filter(e => {
    if (selectedSection && e.section_id !== selectedSection) return false;
    return true;
  });

  // Build grid view: days × slots
  const gridData = DAYS.slice(1, 7).map((day, dayIdx) => {
    const dayNum = dayIdx + 1;
    const dayEntries = sectionEntries.filter(e => e.day_of_week === dayNum);
    return { day, dayNum, slots: timeSlots.filter(s => !s.is_break).map(slot => {
      const entry = dayEntries.find(e => e.time_slot_id === slot.id);
      return { slot, entry };
    })};
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="timetable">
        <TabsList>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="slots">Time Slots</TabsTrigger>
          {conflicts.length > 0 && <TabsTrigger value="conflicts" className="text-destructive">Conflicts ({conflicts.length})</TabsTrigger>}
        </TabsList>

        {/* Timetable Grid */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="All sections" /></SelectTrigger>
              <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEntryForm({ course_id: "", faculty_id: "", time_slot_id: "", day_of_week: "1", room: "", entry_type: "regular" }); setEntryDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Entry
              </Button>
            )}
          </div>

          {timeSlots.filter(s => !s.is_break).length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Define time slots first</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Day</TableHead>
                      {timeSlots.filter(s => !s.is_break).map(s => (
                        <TableHead key={s.id} className="text-center text-xs min-w-[120px]">
                          {s.name}<br />{s.start_time?.slice(0,5)}-{s.end_time?.slice(0,5)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gridData.map(({ day, dayNum, slots }) => (
                      <TableRow key={dayNum}>
                        <TableCell className="font-medium">{day}</TableCell>
                        {slots.map(({ slot, entry }) => (
                          <TableCell key={slot.id} className="text-center p-1">
                            {entry ? (
                              <div className="bg-primary/10 rounded p-1.5 text-xs space-y-0.5 relative group">
                                <div className="font-medium">{courses.find(c => c.id === entry.course_id)?.code || "—"}</div>
                                <div className="text-muted-foreground">{entry.room || ""}</div>
                                {isAdmin && (
                                  <button onClick={() => deleteEntry(entry.id)} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">×</button>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Time Slots */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Time Slots</h2>
            {isAdmin && <Button size="sm" onClick={() => { setSlotForm({ name: "", start_time: "09:00", end_time: "10:00", slot_type: "theory", is_break: false }); setSlotDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Slot</Button>}
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Break</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {timeSlots.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No slots defined</TableCell></TableRow> :
                 timeSlots.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</TableCell>
                    <TableCell><Badge variant="outline">{s.slot_type}</Badge></TableCell>
                    <TableCell>{s.is_break ? <Badge variant="secondary">Break</Badge> : "—"}</TableCell>
                    {isAdmin && <TableCell><Button variant="ghost" size="icon" onClick={() => deleteSlot(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <TabsContent value="conflicts">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Scheduling Conflicts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {conflicts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />{c}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Slot Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Time Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={slotForm.name} onChange={e => setSlotForm(p => ({ ...p, name: e.target.value }))} placeholder="Period 1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" value={slotForm.start_time} onChange={e => setSlotForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="time" value={slotForm.end_time} onChange={e => setSlotForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Type</Label>
              <Select value={slotForm.slot_type} onValueChange={v => setSlotForm(p => ({ ...p, slot_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="theory">Theory</SelectItem><SelectItem value="lab">Lab</SelectItem><SelectItem value="tutorial">Tutorial</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveSlot} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course *</Label>
              <Select value={entryForm.course_id} onValueChange={v => setEntryForm(p => ({ ...p, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Faculty</Label>
                <Select value={entryForm.faculty_id} onValueChange={v => setEntryForm(p => ({ ...p, faculty_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Room</Label><Input value={entryForm.room} onChange={e => setEntryForm(p => ({ ...p, room: e.target.value }))} placeholder="Room 101" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Day *</Label>
                <Select value={entryForm.day_of_week} onValueChange={v => setEntryForm(p => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.slice(1, 7).map((d, i) => <SelectItem key={i+1} value={String(i+1)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Time Slot *</Label>
                <Select value={entryForm.time_slot_id} onValueChange={v => setEntryForm(p => ({ ...p, time_slot_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{timeSlots.filter(s => !s.is_break).map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time?.slice(0,5)}-{s.end_time?.slice(0,5)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Type</Label>
              <Select value={entryForm.entry_type} onValueChange={v => setEntryForm(p => ({ ...p, entry_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem><SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="makeup">Makeup</SelectItem><SelectItem value="extra">Extra</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveEntry} className="w-full">Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
