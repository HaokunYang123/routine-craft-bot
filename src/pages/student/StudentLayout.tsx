import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import { Home, Calendar, Settings } from "lucide-react";

const navItems = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Calendar", url: "/app/calendar", icon: Calendar },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export default function StudentLayout() {
  const location = useLocation();

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        {/* Simple Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50">
          <div className="flex items-center justify-around py-3 max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] gap-1 transition-all rounded-lg px-3 py-2",
                    isActive
                      ? "text-cta-primary bg-cta-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
