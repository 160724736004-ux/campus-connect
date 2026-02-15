import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegulationsManager } from "@/components/academic/RegulationsManager";
import { SectionAllocationManager } from "@/components/academic/SectionAllocationManager";
import { AcademicCalendar } from "@/components/academic/AcademicCalendar";
import { CourseRegistrationManager } from "@/components/academic/CourseRegistrationManager";
import { TimetableManager } from "@/components/academic/TimetableManager";

export default function AcademicStructure() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Management</h1>
          <p className="text-muted-foreground">Regulations, curriculum, calendar, registration, and timetable</p>
        </div>
        <Tabs defaultValue="regulations">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="regulations">Regulations & Curriculum</TabsTrigger>
            <TabsTrigger value="sections">Batch & Sections</TabsTrigger>
            <TabsTrigger value="calendar">Academic Calendar</TabsTrigger>
            <TabsTrigger value="registration">Course Registration</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
          </TabsList>
          <TabsContent value="regulations"><RegulationsManager /></TabsContent>
          <TabsContent value="sections"><SectionAllocationManager /></TabsContent>
          <TabsContent value="calendar"><AcademicCalendar /></TabsContent>
          <TabsContent value="registration"><CourseRegistrationManager /></TabsContent>
          <TabsContent value="timetable"><TimetableManager /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
