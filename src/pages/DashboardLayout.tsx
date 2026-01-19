import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAI } from "@/components/FloatingAI";

export default function DashboardLayout() {
  return (
    <ProtectedRoute requiredRole="coach">
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
              <SidebarTrigger />
            </header>
            <div className="flex-1 p-4 md:p-6 bg-background">
              <div className="max-w-6xl mx-auto">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
        <FloatingAI placeholder="Ask about routines, tasks, or get suggestions..." />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
