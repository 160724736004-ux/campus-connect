import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { HodDashboard } from "@/components/dashboards/HodDashboard";
import { FacultyDashboard } from "@/components/dashboards/FacultyDashboard";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === "admin" && <AdminDashboard />}
      {role === "hod" && <HodDashboard />}
      {role === "faculty" && <FacultyDashboard />}
      {role === "student" && <StudentDashboard />}
      {!role && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </DashboardLayout>
  );
}
