import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceConfig } from "@/components/attendance/AttendanceConfig";
import { AttendanceMarking } from "@/components/attendance/AttendanceMarking";
import { AttendanceReports } from "@/components/attendance/AttendanceReports";
import { AttendanceAlerts } from "@/components/attendance/AttendanceAlerts";
import { AttendanceCondonation } from "@/components/attendance/AttendanceCondonation";
import { AttendanceCorrection } from "@/components/attendance/AttendanceCorrection";
import { StudentAttendanceView } from "@/components/attendance/StudentAttendanceView";

export default function Attendance() {
  const { role } = useAuth();

  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const canManage = role === "admin" || role === "faculty" || role === "hod";

  if (isStudent) {
    return (
      <DashboardLayout>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">My Attendance</TabsTrigger>
            <TabsTrigger value="condonation">Condonation</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><StudentAttendanceView /></TabsContent>
          <TabsContent value="condonation"><AttendanceCondonation /></TabsContent>
          <TabsContent value="alerts"><AttendanceAlerts /></TabsContent>
        </Tabs>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-muted-foreground">Configure, mark, and manage attendance across courses</p>
        </div>

        <Tabs defaultValue="mark">
          <TabsList className="flex-wrap">
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="condonation">Condonation</TabsTrigger>
            <TabsTrigger value="corrections">Corrections</TabsTrigger>
            {isAdmin && <TabsTrigger value="config">Configuration</TabsTrigger>}
          </TabsList>

          <TabsContent value="mark"><AttendanceMarking /></TabsContent>
          <TabsContent value="reports"><AttendanceReports /></TabsContent>
          <TabsContent value="alerts"><AttendanceAlerts /></TabsContent>
          <TabsContent value="condonation"><AttendanceCondonation /></TabsContent>
          <TabsContent value="corrections"><AttendanceCorrection /></TabsContent>
          {isAdmin && <TabsContent value="config"><AttendanceConfig /></TabsContent>}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
