import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function OnlineExamTake() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!testId || !user) return;
    const load = async () => {
      setLoading(true);
      const { data: testData, error: testErr } = await supabase.from("online_tests" as any).select("*, courses(code, title)").eq("id", testId).single();
      if (testErr || !testData) {
        toast({ title: "Test not found", variant: "destructive" });
        navigate("/question-bank");
        return;
      }
      if ((testData as any).status !== "scheduled" && (testData as any).status !== "active") {
        toast({ title: "Test not available", variant: "destructive" });
        navigate("/question-bank");
        return;
      }
      const now = new Date();
      if (new Date((testData as any).start_time) > now) {
        toast({ title: "Test has not started yet", variant: "destructive" });
        navigate("/question-bank");
        return;
      }
      if (new Date((testData as any).end_time) < now) {
        toast({ title: "Test has ended", variant: "destructive" });
        navigate("/question-bank");
        return;
      }
      setTest(testData);

      const { data: attemptData } = await supabase.from("online_test_attempts" as any).select("*").eq("test_id", testId).eq("student_id", user.id).single();
      if (attemptData) {
        setAttempt(attemptData);
        if ((attemptData as any).status === "submitted" || (attemptData as any).status === "evaluated") {
          toast({ title: "You have already submitted this test" });
          navigate("/question-bank");
          return;
        }
      } else {
        const { data: newAttemptId, error: startErr } = await supabase.rpc("start_online_test_attempt" as any, { p_test_id: testId });
        if (startErr) {
          toast({ title: "Error", description: startErr.message, variant: "destructive" });
          navigate("/question-bank");
          return;
        }
        const { data: newAttempt } = await supabase.from("online_test_attempts" as any).select("*").eq("id", newAttemptId).single();
        setAttempt(newAttempt);
      }

      const { data: testQs } = await supabase.from("online_test_questions" as any).select("*, question_bank_questions(*)").eq("test_id", testId).order("sequence");
      let qList = testQs || [];
      if ((testData as any)?.shuffle_questions) qList = [...qList].sort(() => Math.random() - 0.5);
      setQuestions(qList);

      const mins = (testData as any).duration_minutes || 60;
      const start = attemptData ? new Date((attemptData as any).started_at).getTime() : Date.now();
      setTimeLeft(Math.max(0, mins * 60 - Math.floor((Date.now() - start) / 1000)));
      setLoading(false);
    };
    load();
  }, [testId, user, navigate, toast]);

  useEffect(() => {
    if (!test || timeLeft <= 0 || !attempt) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (test.auto_submit) {
            (async () => {
              setSubmitting(true);
              const ans = answersRef.current;
              for (const [qId, ansText] of Object.entries(ans)) {
                if (!ansText) continue;
                await supabase.from("online_test_answers" as any).upsert(
                  { attempt_id: attempt.id, question_id: qId, answer_text: ansText },
                  { onConflict: "attempt_id,question_id" }
                );
              }
              const mins = test.duration_minutes || 60;
              await supabase.from("online_test_attempts" as any).update({
                status: "submitted",
                submitted_at: new Date().toISOString(),
                time_spent_seconds: mins * 60,
              }).eq("id", attempt.id);
              toast({ title: "Time's up! Test auto-submitted." });
              navigate("/question-bank");
            })();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [test, timeLeft, attempt, navigate, toast]);

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    for (const [qId, ansText] of Object.entries(answers)) {
      if (!ansText) continue;
      await supabase.from("online_test_answers" as any).upsert(
        { attempt_id: attempt.id, question_id: qId, answer_text: ansText },
        { onConflict: "attempt_id,question_id" }
      );
    }
    const timeSpent = (test?.duration_minutes || 60) * 60 - timeLeft;
    await supabase.from("online_test_attempts" as any).update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      time_spent_seconds: timeSpent,
    }).eq("id", attempt.id);
    toast({ title: "Test submitted" });
    navigate("/question-bank");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{test?.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{test?.courses?.code} – {test?.courses?.title}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 font-mono text-lg ${timeLeft < 300 ? "text-destructive" : ""}`}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Test"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No questions in this test. Contact your instructor.</p>
          ) : (
            <div className="space-y-8">
              {questions.map((tq: any, idx: number) => {
                const q = tq.question_bank_questions || tq;
                if (!q) return null;
                const isMcq = q.question_type === "mcq";
                const opts = q.options || [];
                const optList = Array.isArray(opts) ? opts : Object.entries(opts).map(([k, v]: [string, any]) => ({ key: k, text: typeof v === "string" ? v : v?.text || v }));
                return (
                  <div key={tq.id} className="border rounded-lg p-4 space-y-3">
                    <p className="font-medium">Q{idx + 1}. {q.question_text} <span className="text-muted-foreground">({q.marks} marks)</span></p>
                    {isMcq && optList.length > 0 ? (
                      <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
                        {optList.map((o: any) => (
                          <div key={o.key || o.text} className="flex items-center space-x-2">
                            <RadioGroupItem value={o.key || o.text} id={`q${q.id}-${o.key}`} />
                            <Label htmlFor={`q${q.id}-${o.key}`} className="cursor-pointer">{o.text || o}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Textarea
                        placeholder="Type your answer..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        rows={4}
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end">
                <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Test"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
