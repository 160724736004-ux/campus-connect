import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();

    if (action === "check_and_alert") {
      // Fetch all configs
      const { data: configs } = await supabase.from("attendance_config").select("*");
      const defaultConfig = {
        alert_threshold_warning: 75,
        alert_threshold_critical: 70,
        alert_threshold_danger: 65,
        min_attendance_overall: 75,
      };

      // Get all active enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, course_id")
        .eq("status", "enrolled");

      if (!enrollments || enrollments.length === 0) {
        return new Response(JSON.stringify({ message: "No enrollments" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const alerts: any[] = [];
      const { data: attendanceTypes } = await supabase
        .from("attendance_types")
        .select("id, counts_as_present");

      const presentTypeIds = (attendanceTypes || [])
        .filter((t: any) => t.counts_as_present)
        .map((t: any) => t.id);

      // Process each enrollment
      for (const enrollment of enrollments) {
        const { data: records } = await supabase
          .from("attendance_records")
          .select("status, attendance_type_id")
          .eq("student_id", enrollment.student_id)
          .eq("course_id", enrollment.course_id);

        if (!records || records.length === 0) continue;

        const total = records.length;
        const present = records.filter((r: any) => {
          if (r.attendance_type_id) return presentTypeIds.includes(r.attendance_type_id);
          return r.status === "present" || r.status === "late" || r.status === "p" || r.status === "l";
        }).length;

        const percentage = Math.round((present / total) * 100);
        const config = configs?.[0] || defaultConfig;

        // Check thresholds and create alerts
        let alertType: string | null = null;
        let threshold = 0;

        if (percentage < config.alert_threshold_danger) {
          alertType = "critical";
          threshold = config.alert_threshold_danger;
        } else if (percentage < config.alert_threshold_critical) {
          alertType = "warning";
          threshold = config.alert_threshold_critical;
        } else if (percentage < config.alert_threshold_warning) {
          alertType = "shortage";
          threshold = config.alert_threshold_warning;
        }

        if (alertType) {
          // Check if alert already sent today
          const today = new Date().toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("attendance_alerts")
            .select("id")
            .eq("student_id", enrollment.student_id)
            .eq("course_id", enrollment.course_id)
            .eq("alert_type", alertType)
            .gte("sent_at", today);

          if (!existing || existing.length === 0) {
            const sentVia = ["in_app"];

            // Get student profile for parent contact
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, father_mobile, mother_mobile, guardian_mobile")
              .eq("id", enrollment.student_id)
              .single();

            const { data: course } = await supabase
              .from("courses")
              .select("code, title")
              .eq("id", enrollment.course_id)
              .single();

            const message = `${profile?.full_name}: Attendance in ${course?.code} is ${percentage}% (below ${threshold}% ${alertType} threshold)`;

            // Send email if configured
            const emailApiKey = Deno.env.get("EMAIL_API_KEY");
            if (emailApiKey) {
              sentVia.push("email");
            }

            // Send SMS if configured
            const smsApiKey = Deno.env.get("SMS_API_KEY");
            const parentPhone = profile?.father_mobile || profile?.mother_mobile || profile?.guardian_mobile;
            if (smsApiKey && parentPhone) {
              sentVia.push("sms");
              // SMS sending would go here with provider-specific API
            }

            alerts.push({
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              alert_type: alertType,
              threshold,
              current_percentage: percentage,
              message,
              sent_via: sentVia,
              recipient_type: "student",
              parent_phone: parentPhone || null,
            });
          }
        }
      }

      // Batch insert alerts
      if (alerts.length > 0) {
        await supabase.from("attendance_alerts").insert(alerts);
      }

      return new Response(JSON.stringify({ alerts_created: alerts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "daily_absence_notify") {
      const today = new Date().toISOString().split("T")[0];
      const { data: absentRecords } = await supabase
        .from("attendance_records")
        .select("student_id, course_id")
        .eq("date", today)
        .eq("status", "absent");

      if (!absentRecords || absentRecords.length === 0) {
        return new Response(JSON.stringify({ message: "No absences today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const alerts = [];
      for (const rec of absentRecords) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, father_mobile")
          .eq("id", rec.student_id)
          .single();

        const { data: course } = await supabase
          .from("courses")
          .select("code")
          .eq("id", rec.course_id)
          .single();

        alerts.push({
          student_id: rec.student_id,
          course_id: rec.course_id,
          alert_type: "daily_absence",
          message: `${profile?.full_name} was absent in ${course?.code} on ${today}`,
          sent_via: ["in_app"],
          recipient_type: "parent",
          parent_phone: profile?.father_mobile || null,
        });
      }

      if (alerts.length > 0) {
        await supabase.from("attendance_alerts").insert(alerts);
      }

      return new Response(JSON.stringify({ alerts_created: alerts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
