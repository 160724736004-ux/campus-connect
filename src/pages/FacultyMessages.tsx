import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Users } from "lucide-react";

export default function FacultyMessages() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get students enrolled in faculty's courses
      const { data: courses } = await supabase.from("courses").select("id").eq("faculty_id", user.id);
      const courseIds = (courses || []).map((c: any) => c.id);
      if (courseIds.length === 0) { setLoading(false); return; }

      const { data: enrollments } = await supabase.from("enrollments").select("student_id").in("course_id", courseIds).eq("status", "enrolled");
      const studentIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
      if (studentIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, student_id_number").in("id", studentIds).order("full_name");
      setStudents(profiles || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Student Messages
          </h1>
          <p className="text-muted-foreground">View and respond to messages from your students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Students</CardTitle>
            <CardDescription>Students enrolled in your courses. Messaging via this portal is stored locally.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : students.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No students enrolled in your courses</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {s.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.student_id_number || s.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No messages table configured yet. Student messages sent via the portal will appear here once the messaging system is set up.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
