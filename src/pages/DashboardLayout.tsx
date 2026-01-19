import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CoachSidebar } from "@/components/dashboard/CoachSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAI } from "@/components/FloatingAI";
import { Logo } from "@/components/ui/logo";

export default function DashboardLayout() {
  return (
    <ProtectedRoute requiredRole="coach">
      <div className="coach-theme">
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <CoachSidebar />
            <main className="flex-1 flex flex-col">
              <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-foreground hover:bg-muted" />
                  <div className="md:hidden">
                    <Logo size="sm" />
                  </div>
                </div>
              </header>
              <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
                <div className="max-w-7xl mx-auto">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
          <FloatingAI placeholder="Ask about routines, tasks, or get suggestions..." />
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  );
}
