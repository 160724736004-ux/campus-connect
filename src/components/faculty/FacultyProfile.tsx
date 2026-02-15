import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Save, UserPlus, X } from "lucide-react";

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Guest Faculty"];
const EMPLOYMENT_TYPES = ["regular", "contract", "guest", "visiting"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface FacultyProfileProps {
  facultyId?: string | null;
  onClose?: () => void;
  isNew?: boolean;
}

export function FacultyProfile({ facultyId, onClose, isNew = false }: FacultyProfileProps) {
  const { role, user } = useAuth();
  const isAdmin = role === "admin" || role === "hod";
  const [departments, setDepartments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", gender: "", date_of_birth: "",
    blood_group: "", aadhar_number: "", pan_number: "",
    employee_id: "", designation: "", employment_type: "regular",
    date_of_joining: "", department_id: "",
    qualifications: "", specialization: "", experience_years: 0,
    bank_account_number: "", bank_name: "", bank_ifsc: "",
    permanent_address: "", communication_address: "",
    research_interests: "", publications: "", professional_memberships: "",
  });

  useEffect(() => {
    supabase.from("departments").select("id, name").eq("status", "active").then(({ data }) => setDepartments(data || []));
    if (facultyId && !isNew) {
      supabase.from("profiles").select("*").eq("id", facultyId).single().then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || "", email: data.email || "", phone: data.phone || "",
            gender: data.gender || "", date_of_birth: data.date_of_birth || "",
            blood_group: data.blood_group || "", aadhar_number: data.aadhar_number || "",
            pan_number: (data as any).pan_number || "",
            employee_id: (data as any).employee_id || "", designation: (data as any).designation || "",
            employment_type: (data as any).employment_type || "regular",
            date_of_joining: (data as any).date_of_joining || "", department_id: data.department_id || "",
            qualifications: (data as any).qualifications || "", specialization: (data as any).specialization || "",
            experience_years: (data as any).experience_years || 0,
            bank_account_number: (data as any).bank_account_number || "",
            bank_name: (data as any).bank_name || "", bank_ifsc: (data as any).bank_ifsc || "",
            permanent_address: data.permanent_address || "", communication_address: data.communication_address || "",
            research_interests: (data as any).research_interests || "",
            publications: (data as any).publications || "",
            professional_memberships: (data as any).professional_memberships || "",
          });
        }
      });
    }
  }, [facultyId, isNew]);

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        // Generate employee ID
        const { data: empId } = await supabase.rpc("generate_employee_id");
        // Create auth user via signup (faculty will get a password reset email)
        const tempPassword = crypto.randomUUID().slice(0, 16);
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.email,
          password: tempPassword,
          options: { data: { full_name: form.full_name }, emailRedirectTo: window.location.origin },
        });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error("Failed to create user");

        const userId = authData.user.id;
        // Update profile with faculty details
        const { error: profileErr } = await supabase.from("profiles").update({
          full_name: form.full_name, phone: form.phone, gender: form.gender,
          date_of_birth: form.date_of_birth || null, blood_group: form.blood_group || null,
          aadhar_number: form.aadhar_number || null, department_id: form.department_id || null,
          permanent_address: form.permanent_address || null,
          communication_address: form.communication_address || null,
          employee_id: empId, designation: form.designation || null,
          employment_type: form.employment_type, date_of_joining: form.date_of_joining || null,
          qualifications: form.qualifications || null, specialization: form.specialization || null,
          experience_years: form.experience_years,
          bank_account_number: form.bank_account_number || null,
          bank_name: form.bank_name || null, bank_ifsc: form.bank_ifsc || null,
          pan_number: form.pan_number || null,
          research_interests: form.research_interests || null,
          publications: form.publications || null,
          professional_memberships: form.professional_memberships || null,
        } as any).eq("id", userId);
        if (profileErr) throw profileErr;

        // Set role to faculty
        await supabase.from("user_roles").update({ role: "faculty" }).eq("user_id", userId);
        toast({ title: "Faculty registered", description: `Employee ID: ${empId}` });
        onClose?.();
      } else if (facultyId) {
        const { error } = await supabase.from("profiles").update({
          full_name: form.full_name, phone: form.phone, gender: form.gender,
          date_of_birth: form.date_of_birth || null, blood_group: form.blood_group || null,
          aadhar_number: form.aadhar_number || null, department_id: form.department_id || null,
          permanent_address: form.permanent_address || null,
          communication_address: form.communication_address || null,
          designation: form.designation || null, employment_type: form.employment_type,
          date_of_joining: form.date_of_joining || null,
          qualifications: form.qualifications || null, specialization: form.specialization || null,
          experience_years: form.experience_years,
          bank_account_number: form.bank_account_number || null,
          bank_name: form.bank_name || null, bank_ifsc: form.bank_ifsc || null,
          pan_number: form.pan_number || null,
          research_interests: form.research_interests || null,
          publications: form.publications || null,
          professional_memberships: form.professional_memberships || null,
        } as any).eq("id", facultyId);
        if (error) throw error;
        toast({ title: "Profile updated" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isNew ? "Register New Faculty" : "Faculty Profile"}</CardTitle>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !isAdmin} size="sm">
            <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
          </Button>
          {onClose && <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="bank">Bank & ID</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={!isNew} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></div>
              <div><Label>Blood Group</Label>
                <Select value={form.blood_group} onValueChange={(v) => set("blood_group", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Permanent Address</Label><Textarea value={form.permanent_address} onChange={(e) => set("permanent_address", e.target.value)} /></div>
              <div><Label>Communication Address</Label><Textarea value={form.communication_address} onChange={(e) => set("communication_address", e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {!isNew && <div><Label>Employee ID</Label><Input value={form.employee_id} disabled /></div>}
              <div><Label>Designation</Label>
                <Select value={form.designation} onValueChange={(v) => set("designation", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date of Joining</Label><Input type="date" value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} /></div>
              <div><Label>Department</Label>
                <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Experience (Years)</Label><Input type="number" value={form.experience_years} onChange={(e) => set("experience_years", parseInt(e.target.value) || 0)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Qualifications</Label><Textarea placeholder="e.g. Ph.D in Computer Science, M.Tech..." value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} /></div>
              <div><Label>Specialization</Label><Textarea placeholder="e.g. Machine Learning, Data Structures..." value={form.specialization} onChange={(e) => set("specialization", e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><Label>Bank Account Number</Label><Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} /></div>
              <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></div>
              <div><Label>IFSC Code</Label><Input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value)} /></div>
              <div><Label>PAN Number</Label><Input value={form.pan_number} onChange={(e) => set("pan_number", e.target.value)} /></div>
              <div><Label>Aadhar Number</Label><Input value={form.aadhar_number} onChange={(e) => set("aadhar_number", e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-4">
            <div className="grid gap-4">
              <div><Label>Research Interests</Label><Textarea placeholder="Comma-separated research areas..." value={form.research_interests} onChange={(e) => set("research_interests", e.target.value)} /></div>
              <div><Label>Publications</Label><Textarea placeholder="List publications, one per line..." rows={5} value={form.publications} onChange={(e) => set("publications", e.target.value)} /></div>
              <div><Label>Professional Memberships</Label><Textarea placeholder="e.g. IEEE, ACM, CSI..." value={form.professional_memberships} onChange={(e) => set("professional_memberships", e.target.value)} /></div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
