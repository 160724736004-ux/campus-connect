import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search, Command } from "lucide-react";
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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 border-b border-border/60 bg-card/60 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-muted rounded-xl transition-colors h-9 w-9" />
              <div className="hidden md:flex items-center relative group">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search..."
                  className="pl-9 pr-12 w-72 h-9 bg-muted/40 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/30 rounded-xl text-sm transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-[10px] font-semibold px-2.5 py-1 hidden sm:inline-flex bg-primary/5 border-primary/15 text-primary rounded-lg tracking-wide">
                {role === "hod" ? "Head of Dept" : role || "User"}
              </Badge>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-xl hover:bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
              </Button>
              <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-border/50">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarFallback className="gradient-bg text-primary-foreground text-[11px] font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[120px] leading-tight">{profile?.full_name || "User"}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">{profile?.email}</span>
                </div>
              </div>
            </div>
          </header>
          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-background">
            <div className="animate-fade-in max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
