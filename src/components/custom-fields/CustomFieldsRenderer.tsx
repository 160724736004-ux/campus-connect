import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomFieldsRendererProps {
  entityType: string;
  entityId: string;
  readOnly?: boolean;
  onChange?: (fieldId: string, value: string) => void;
}

export function CustomFieldsRenderer({ entityType, entityId, readOnly = false, onChange }: CustomFieldsRendererProps) {
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFieldsAndValues();
  }, [entityType, entityId]);

  const fetchFieldsAndValues = async () => {
    setLoading(true);
    const { data: fieldData } = await supabase
      .from("custom_fields" as any)
      .select("*")
      .eq("entity_type", entityType)
      .eq("is_active", true)
      .order("sort_order");

    const activeFields = (fieldData as any[]) || [];
    setFields(activeFields);

    if (entityId && activeFields.length > 0) {
      const fieldIds = activeFields.map((f: any) => f.id);
      const { data: valueData } = await supabase
        .from("custom_field_values" as any)
        .select("*")
        .eq("entity_id", entityId)
        .in("custom_field_id", fieldIds);

      const valMap: Record<string, string> = {};
      (valueData as any[] || []).forEach((v: any) => {
        valMap[v.custom_field_id] = v.value || "";
      });
      setValues(valMap);
    }
    setLoading(false);
  };

  const handleChange = async (fieldId: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    onChange?.(fieldId, value);

    if (entityId) {
      await supabase.from("custom_field_values" as any).upsert({
        custom_field_id: fieldId,
        entity_id: entityId,
        value,
      } as any, { onConflict: "custom_field_id,entity_id" });
    }
  };

  if (loading || fields.length === 0) return null;

  // Group fields by section_group
  const grouped = fields.reduce((acc: Record<string, any[]>, f: any) => {
    const group = f.section_group || "Custom Fields";
    if (!acc[group]) acc[group] = [];
    acc[group].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, groupFields]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</h4>
          <div className="grid grid-cols-2 gap-3">
            {(groupFields as any[]).map((field: any) => {
              const val = values[field.id] || field.default_value || "";
              return (
                <div key={field.id} className={`space-y-1.5 ${field.field_type === "textarea" ? "col-span-2" : ""}`}>
                  <Label className="text-sm">
                    {field.field_label}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderField(field, val, readOnly, (v: string) => handleChange(field.id, v))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderField(field: any, value: string, readOnly: boolean, onChange: (v: string) => void) {
  if (readOnly) {
    if (field.field_type === "checkbox") {
      return <span className="text-sm font-medium">{value === "true" ? "Yes" : "No"}</span>;
    }
    return <span className="text-sm font-medium">{value || "—"}</span>;
  }

  switch (field.field_type) {
    case "textarea":
      return <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
          <SelectContent>
            {(field.field_options || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox checked={value === "true"} onCheckedChange={c => onChange(c ? "true" : "false")} />
          <span className="text-sm text-muted-foreground">{field.placeholder || "Enable"}</span>
        </div>
      );
    case "number":
      return <Input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
    case "date":
      return <Input type="date" value={value} onChange={e => onChange(e.target.value)} />;
    case "email":
      return <Input type="email" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
    case "url":
      return <Input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "https://..."} />;
    default:
      return <Input value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
}
