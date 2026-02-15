import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GripVertical, Settings2 } from "lucide-react";

const ENTITY_TYPES = [
  { value: "student", label: "Students" },
  { value: "faculty", label: "Faculty" },
  { value: "course", label: "Courses" },
  { value: "department", label: "Departments" },
  { value: "program", label: "Programs" },
  { value: "admission", label: "Admissions" },
  { value: "batch", label: "Batches" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "textarea", label: "Long Text" },
  { value: "checkbox", label: "Checkbox" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
];

export default function CustomFieldsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("student");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editField, setEditField] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [form, setForm] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    field_options: "",
    is_required: false,
    placeholder: "",
    default_value: "",
    validation_regex: "",
    section_group: "Custom Fields",
  });

  useEffect(() => { fetchFields(); }, [filterEntity]);

  const fetchFields = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_fields" as any)
      .select("*")
      .eq("entity_type", filterEntity)
      .order("sort_order");
    setFields((data as any[]) || []);
    setLoading(false);
  };

  const resetForm = () => setForm({
    field_name: "", field_label: "", field_type: "text", field_options: "",
    is_required: false, placeholder: "", default_value: "", validation_regex: "",
    section_group: "Custom Fields",
  });

  const openCreate = () => { resetForm(); setEditField(null); setDialogOpen(true); };

  const openEdit = (f: any) => {
    setEditField(f);
    setForm({
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type,
      field_options: Array.isArray(f.field_options) ? f.field_options.join(", ") : "",
      is_required: f.is_required,
      placeholder: f.placeholder || "",
      default_value: f.default_value || "",
      validation_regex: f.validation_regex || "",
      section_group: f.section_group || "Custom Fields",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.field_name || !form.field_label) {
      toast({ title: "Field name and label are required", variant: "destructive" });
      return;
    }

    const slug = form.field_name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const options = form.field_type === "select"
      ? form.field_options.split(",").map(o => o.trim()).filter(Boolean)
      : [];

    const payload: any = {
      entity_type: filterEntity,
      field_name: slug,
      field_label: form.field_label,
      field_type: form.field_type,
      field_options: options,
      is_required: form.is_required,
      placeholder: form.placeholder || null,
      default_value: form.default_value || null,
      validation_regex: form.validation_regex || null,
      section_group: form.section_group || "Custom Fields",
    };

    if (editField) {
      const { error } = await supabase.from("custom_fields" as any).update(payload).eq("id", editField.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Field updated" });
    } else {
      payload.created_by = user?.id;
      payload.sort_order = fields.length;
      const { error } = await supabase.from("custom_fields" as any).insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Custom field created" });
    }
    setDialogOpen(false);
    fetchFields();
  };

  const toggleActive = async (field: any) => {
    await supabase.from("custom_fields" as any).update({ is_active: !field.is_active } as any).eq("id", field.id);
    fetchFields();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("custom_fields" as any).delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Field deleted" });
    setDeleteTarget(null);
    fetchFields();
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Custom Fields Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, or remove custom data fields for any entity type
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Field
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ENTITY_TYPES.map(et => (
          <Button
            key={et.value}
            variant={filterEntity === et.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterEntity(et.value)}
          >
            {et.label}
            {fields.length > 0 && filterEntity === et.value && (
              <Badge variant="secondary" className="ml-2 text-xs">{fields.length}</Badge>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base capitalize">{filterEntity} Custom Fields</CardTitle>
          <CardDescription>These fields appear on {filterEntity} forms and profiles</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Field Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No custom fields for {filterEntity}. Click "Add Field" to create one.
                  </TableCell>
                </TableRow>
              ) : fields.map((f: any) => (
                <TableRow key={f.id} className={!f.is_active ? "opacity-50" : ""}>
                  <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                  <TableCell className="font-medium">{f.field_label}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{f.field_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{f.field_type}</Badge>
                  </TableCell>
                  <TableCell>{f.is_required ? <Badge variant="destructive" className="text-xs">Required</Badge> : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.section_group}</TableCell>
                  <TableCell>
                    <Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(f)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editField ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Field Label *</Label>
                <Input value={form.field_label} onChange={e => update("field_label", e.target.value)} placeholder="e.g. Blood Pressure" />
              </div>
              <div className="space-y-2">
                <Label>Field Name (slug) *</Label>
                <Input value={form.field_name} onChange={e => update("field_name", e.target.value)} placeholder="e.g. blood_pressure" className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={form.field_type} onValueChange={v => update("field_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section Group</Label>
                <Input value={form.section_group} onChange={e => update("section_group", e.target.value)} placeholder="Custom Fields" />
              </div>
            </div>
            {form.field_type === "select" && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Textarea value={form.field_options} onChange={e => update("field_options", e.target.value)} placeholder="Option 1, Option 2, Option 3" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input value={form.placeholder} onChange={e => update("placeholder", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input value={form.default_value} onChange={e => update("default_value", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Validation Regex (optional)</Label>
              <Input value={form.validation_regex} onChange={e => update("validation_regex", e.target.value)} placeholder="e.g. ^[0-9]{10}$" className="font-mono" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_required} onCheckedChange={v => update("is_required", v)} />
              <Label>Required field</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editField ? "Update Field" : "Create Field"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmText={deleteTarget?.field_label || ""}
        title="Delete Custom Field"
        description="This will permanently delete this custom field and ALL stored values across all records. This cannot be undone."
      />
    </div>
  );
}
