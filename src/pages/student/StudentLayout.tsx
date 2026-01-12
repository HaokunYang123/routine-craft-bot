import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import {
  DoodleHome,
  DoodleCalendar,
  DoodlePlus,
  DoodleStats,
  DoodleUser,
} from "@/components/ui/doodles";

const navItems = [
  { title: "Home", url: "/app", icon: DoodleHome },
  { title: "Calendar", url: "/app/calendar", icon: DoodleCalendar },
  { title: "Add", url: "/app/add", icon: DoodlePlus },
  { title: "Stats", url: "/app/stats", icon: DoodleStats },
  { title: "Me", url: "/app/profile", icon: DoodleUser },
];

export default function StudentLayout() {
  const location = useLocation();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-24">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 safe-area-pb z-50 bg-background border-t-2 border-ink">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 transition-all",
                    isActive ? "text-ink" : "text-ink-light"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive && "animate-float")} />
                  <span className="text-xs">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
