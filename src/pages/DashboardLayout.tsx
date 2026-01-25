import { Outlet, NavLink } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CoachSidebar } from "@/components/dashboard/CoachSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Logo } from "@/components/ui/logo";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout() {
  const { displayName, avatarDisplay, loading: profileLoading } = useProfile();

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

                {/* Coach name display on right side of header */}
                <NavLink
                  to="/dashboard/settings"
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  {profileLoading ? (
                    <>
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="w-8 h-8 rounded-full" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground hidden sm:block">
                        {displayName}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-btn-secondary flex items-center justify-center text-white text-xs font-bold">
                        {avatarDisplay}
                      </div>
                    </>
                  )}
                </NavLink>
              </header>
              <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
                <div className="max-w-7xl mx-auto">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  );
}
