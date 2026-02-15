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
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-white space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <GraduationCap className="h-9 w-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">UniERP</h1>
              <p className="text-white/80 text-lg">University Management</p>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Everything you need to manage your institution</h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Students, faculty, courses, attendance, grading, finance — all in one powerful platform.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-8 rounded-full bg-white/20 border-2 border-white/30 backdrop-blur-sm" />
              ))}
            </div>
            <p className="text-white/70 text-sm">Trusted by 500+ institutions</p>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">UniERP</h1>
              <p className="text-sm text-muted-foreground">University Management</p>
            </div>
          </div>

          <Card className="border-0 shadow-none lg:shadow-none bg-transparent">
            <Tabs defaultValue="login">
              <CardHeader className="pb-4 px-0 lg:px-0">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60">
                  <TabsTrigger value="login" className="text-sm font-semibold data-[state=active]:shadow-md">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-semibold data-[state=active]:shadow-md">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="px-0 lg:px-0">
                <TabsContent value="login" className="mt-0 space-y-6">
                  <div>
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription className="mt-1">Sign in to continue to your dashboard</CardDescription>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-email" type="email" className="pl-10 h-11" placeholder="you@university.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-password" type="password" className="pl-10 h-11" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity" disabled={isLoading}>
                      {isLoading ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 space-y-6">
                  <div>
                    <CardTitle className="text-2xl font-bold">Create account</CardTitle>
                    <CardDescription className="mt-1">Get started with your institution</CardDescription>
                  </div>
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-name" className="pl-10 h-11" placeholder="Dr. John Smith" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" className="pl-10 h-11" placeholder="you@university.edu" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" className="pl-10 h-11" placeholder="Min. 6 characters" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity" disabled={isLoading}>
                      {isLoading ? "Creating account..." : <>Create Account <Sparkles className="h-4 w-4 ml-1" /></>}
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
