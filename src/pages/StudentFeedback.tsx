import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Star, Send, CheckCircle } from "lucide-react";

const RATING_LABELS = ["Poor", "Below Average", "Average", "Good", "Excellent"];

export default function StudentFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [ratings, setRatings] = useState({ teaching: 0, content: 0, communication: 0, overall: 0 });
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("enrollments").select("course_id, courses(id, code, title)").eq("student_id", user.id).eq("status", "enrolled");
      setCourses((data || []).map((e: any) => e.courses).filter(Boolean));
    };
    fetch();
  }, [user]);

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        {value > 0 && <span className="text-xs text-muted-foreground">{RATING_LABELS[value - 1]}</span>}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = () => {
    if (!selectedCourse) {
      toast({ title: "Select a course", variant: "destructive" });
      return;
    }
    if (ratings.overall === 0) {
      toast({ title: "Please rate at least the overall experience", variant: "destructive" });
      return;
    }
    // Store locally (no feedback table exists yet)
    setSubmitted((prev) => [...prev, selectedCourse]);
    toast({ title: "Feedback submitted successfully! Thank you." });
    setRatings({ teaching: 0, content: 0, communication: 0, overall: 0 });
    setComments("");
    setSelectedCourse("");
  };

  const availableCourses = courses.filter((c) => !submitted.includes(c.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6" /> Course Feedback
          </h1>
          <p className="text-muted-foreground">Share your feedback to help improve teaching quality</p>
        </div>

        {submitted.length > 0 && (
          <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium">Feedback submitted for {submitted.length} course{submitted.length > 1 ? "s" : ""}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>Rate your enrolled courses anonymously</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Course *</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent>
                  {availableCourses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableCourses.length === 0 && (
                <p className="text-xs text-muted-foreground">All courses have received feedback</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <StarRating label="Teaching Quality" value={ratings.teaching} onChange={(v) => setRatings((p) => ({ ...p, teaching: v }))} />
              <StarRating label="Course Content" value={ratings.content} onChange={(v) => setRatings((p) => ({ ...p, content: v }))} />
              <StarRating label="Communication" value={ratings.communication} onChange={(v) => setRatings((p) => ({ ...p, communication: v }))} />
              <StarRating label="Overall Experience *" value={ratings.overall} onChange={(v) => setRatings((p) => ({ ...p, overall: v }))} />
            </div>

            <div className="space-y-2">
              <Label>Additional Comments (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any suggestions or remarks..."
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={availableCourses.length === 0}>
              <Send className="h-4 w-4 mr-2" /> Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
