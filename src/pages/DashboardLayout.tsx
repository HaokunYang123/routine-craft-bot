import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAI } from "@/components/FloatingAI";
import { WobblyFilter } from "@/components/ui/wobbly";

export default function DashboardLayout() {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <WobblyFilter />
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b-2 border-foreground flex items-center px-4 bg-card sticky top-0 z-40">
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
