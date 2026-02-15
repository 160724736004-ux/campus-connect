import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentAdmission from "@/components/students/StudentAdmission";
import StudentProfile from "@/components/students/StudentProfile";
import StudentBulkUpload from "@/components/students/StudentBulkUpload";
import StudentProgression from "@/components/students/StudentProgression";

export default function Students() {
  const { role } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchLookups = async () => {
      const [pRes, bRes, sRes] = await Promise.all([
        supabase.from("programs").select("*"),
        supabase.from("batches" as any).select("*"),
        supabase.from("sections" as any).select("*"),
      ]);
      setPrograms(pRes.data || []);
      setBatches((bRes.data as any[]) || []);
      setSections((sRes.data as any[]) || []);
    };
    fetchLookups();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground">Admissions, profiles, enrollment & progression</p>
        </div>

        <Tabs defaultValue="profiles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profiles">Student Profiles</TabsTrigger>
            {role === "admin" && <TabsTrigger value="admissions">Admissions</TabsTrigger>}
            {role === "admin" && <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>}
            {role === "admin" && <TabsTrigger value="progression">Progression</TabsTrigger>}
          </TabsList>

          <TabsContent value="profiles">
            <StudentProfile key={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
          </TabsContent>

          {role === "admin" && (
            <TabsContent value="admissions">
              <StudentAdmission />
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="bulk">
              <StudentBulkUpload
                programs={programs}
                batches={batches}
                sections={sections}
                onComplete={() => setRefreshKey(k => k + 1)}
              />
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="progression">
              <StudentProgression />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
