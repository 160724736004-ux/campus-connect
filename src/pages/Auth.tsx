import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: signupName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link to verify your account.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-16 overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}>
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-16 left-16 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-16 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-white/3 rounded-full blur-2xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "32px 32px"
            }}
          />
        </div>
        <div className="relative z-10 max-w-lg text-white space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
              <GraduationCap className="h-9 w-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight font-display">UniERP</h1>
              <p className="text-white/60 text-base font-medium">University Management System</p>
            </div>
          </div>
          <div className="space-y-5">
            <h2 className="text-3xl font-bold leading-tight font-display">Everything you need to manage your institution</h2>
            <p className="text-white/50 text-lg leading-relaxed">
              Students, faculty, courses, attendance, grading, finance — all in one powerful platform built for modern education.
            </p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 w-9 rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm" />
              ))}
            </div>
            <p className="text-white/40 text-sm font-medium">Trusted by 500+ institutions</p>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold gradient-text font-display">UniERP</h1>
              <p className="text-xs text-muted-foreground font-medium">University Management</p>
            </div>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <Tabs defaultValue="login">
              <CardHeader className="pb-4 px-0">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 rounded-xl p-1">
                  <TabsTrigger value="login" className="text-sm font-semibold rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-card">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-semibold rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-card">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="px-0">
                <TabsContent value="login" className="mt-0 space-y-6">
                  <div>
                    <CardTitle className="text-2xl font-extrabold font-display">Welcome back</CardTitle>
                    <CardDescription className="mt-1.5">Sign in to continue to your dashboard</CardDescription>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-email" type="email" className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/40" placeholder="you@university.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-password" type="password" className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/40" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4 ml-1.5" /></>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 space-y-6">
                  <div>
                    <CardTitle className="text-2xl font-extrabold font-display">Create account</CardTitle>
                    <CardDescription className="mt-1.5">Get started with your institution</CardDescription>
                  </div>
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-name" className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/40" placeholder="Dr. John Smith" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/40" placeholder="you@university.edu" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/40" placeholder="Min. 6 characters" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? "Creating account..." : <>Create Account <Sparkles className="h-4 w-4 ml-1.5" /></>}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
