import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, role } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent rounded-lg transition-colors" />
              <div className="hidden md:flex items-center relative">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search anything..."
                  className="pl-9 w-64 h-9 bg-muted/50 border-0 focus-visible:ring-1 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize text-xs font-medium px-3 py-1 hidden sm:inline-flex bg-primary/5 border-primary/20 text-primary">
                {role === "hod" ? "Head of Dept" : role || "User"}
              </Badge>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-lg">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground truncate max-w-[120px]">{profile?.full_name || "User"}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
