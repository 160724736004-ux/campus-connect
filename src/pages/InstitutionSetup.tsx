import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Building2 } from "lucide-react";

export default function InstitutionSetup() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", address: "", accreditation: "", affiliation: "",
    license_number: "", phone: "", email: "", website: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("institution_settings" as any).select("*").limit(1).single();
      if (data) {
        setId((data as any).id);
        setForm({
          name: (data as any).name || "",
          address: (data as any).address || "",
          accreditation: (data as any).accreditation || "",
          affiliation: (data as any).affiliation || "",
          license_number: (data as any).license_number || "",
          phone: (data as any).phone || "",
          email: (data as any).email || "",
          website: (data as any).website || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (id) {
      const { error } = await supabase.from("institution_settings" as any).update(form as any).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else toast({ title: "Institution settings saved" });
    } else {
      const { error, data } = await supabase.from("institution_settings" as any).insert(form as any).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { setId((data as any).id); toast({ title: "Institution settings created" }); }
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Institution Setup</h1>
            <p className="text-muted-foreground">Configure your institution details</p>
          </div>
          {role === "admin" && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Institution Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. ABC College of Engineering" /></div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={e => update("address", e.target.value)} placeholder="Full institutional address" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91-..." /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => update("email", e.target.value)} placeholder="info@college.edu" /></div>
              </div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://..." /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Accreditation & Affiliation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Accreditation</Label><Input value={form.accreditation} onChange={e => update("accreditation", e.target.value)} placeholder="e.g. NAAC A+, NBA Accredited" /></div>
              <div className="space-y-2"><Label>Affiliation</Label><Input value={form.affiliation} onChange={e => update("affiliation", e.target.value)} placeholder="e.g. JNTU Hyderabad" /></div>
              <div className="space-y-2"><Label>License / Registration Number</Label><Input value={form.license_number} onChange={e => update("license_number", e.target.value)} placeholder="Registration number" /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
