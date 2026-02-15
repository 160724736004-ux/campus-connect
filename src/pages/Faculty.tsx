import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Eye } from "lucide-react";
import { FacultyProfile } from "@/components/faculty/FacultyProfile";
import { FacultyWorkload } from "@/components/faculty/FacultyWorkload";
import { FacultyDuties } from "@/components/faculty/FacultyDuties";

export default function Faculty() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("directory");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [profilesRes, rolesRes, deptsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id").eq("role", "faculty"),
        supabase.from("departments").select("*"),
      ]);
      const facultyIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
      setFaculty((profilesRes.data || []).filter((p: any) => facultyIds.has(p.id)));
      setDepartments(deptsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  const filtered = faculty.filter(
    (f) =>
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
  );

  const getDeptName = (id: string | null) => departments.find((d) => d.id === id)?.name || "—";

  const handleViewProfile = (id: string) => {
    setSelectedFacultyId(id);
    setShowNewForm(false);
    setActiveTab("profile");
  };

  const handleNewFaculty = () => {
    setSelectedFacultyId(null);
    setShowNewForm(true);
    setActiveTab("profile");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faculty Management</h1>
          <p className="text-muted-foreground">Manage faculty profiles, workload, and duties</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="duties">Duties</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search faculty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              {isAdmin && (
                <Button onClick={handleNewFaculty}><UserPlus className="h-4 w-4 mr-2" /> Register Faculty</Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No faculty found</TableCell></TableRow>
                    ) : (
                      filtered.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.full_name}</TableCell>
                          <TableCell>{(f as any).employee_id || "—"}</TableCell>
                          <TableCell>{f.email}</TableCell>
                          <TableCell>{(f as any).designation || "—"}</TableCell>
                          <TableCell>{getDeptName(f.department_id)}</TableCell>
                          <TableCell className="capitalize">{(f as any).employment_type || "—"}</TableCell>
                          <TableCell><Badge>{f.status}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewProfile(f.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            {showNewForm ? (
              <FacultyProfile isNew onClose={() => { setShowNewForm(false); setActiveTab("directory"); }} />
            ) : selectedFacultyId ? (
              <FacultyProfile facultyId={selectedFacultyId} onClose={() => { setSelectedFacultyId(null); setActiveTab("directory"); }} />
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Select a faculty member from the directory or register a new one.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="workload">
            <FacultyWorkload />
          </TabsContent>

          <TabsContent value="duties">
            <FacultyDuties />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
