import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search } from "lucide-react";

export default function FacultyStudentDetails() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("courses").select("id, code, title").eq("faculty_id", user.id).order("code");
      setCourses(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    if (!selectedCourse) { setStudents([]); return; }
    const fetch = async () => {
      setLoading(true);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, status")
        .eq("course_id", selectedCourse)
        .eq("status", "enrolled");
      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      if (studentIds.length === 0) { setStudents([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, student_id_number, phone, status")
        .in("id", studentIds)
        .order("full_name");
      setStudents(profiles || []);
      setLoading(false);
    };
    fetch();
  }, [selectedCourse]);

  const filtered = students.filter((s) =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Student Details
          </h1>
          <p className="text-muted-foreground">View students enrolled in your courses</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-72">
            <Select value={selectedCourse || "__none__"} onValueChange={(v) => setSelectedCourse(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCourse && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          )}
        </div>

        {!selectedCourse ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Select a course to view enrolled students</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{filtered.length} Student{filtered.length !== 1 ? "s" : ""}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
                  ) : filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.student_id_number || "—"}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{s.status || "active"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
