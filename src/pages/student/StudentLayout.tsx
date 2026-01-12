import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import {
  SketchHome,
  SketchCalendar,
  SketchPlus,
  SketchStats,
  SketchSettings,
} from "@/components/ui/sketch";

const navItems = [
  { title: "Home", url: "/app", icon: SketchHome },
  { title: "Calendar", url: "/app/calendar", icon: SketchCalendar },
  { title: "Add", url: "/app/add", icon: SketchPlus },
  { title: "Stats", url: "/app/stats", icon: SketchStats },
  { title: "Settings", url: "/app/settings", icon: SketchSettings },
];

export default function StudentLayout() {
  const location = useLocation();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-24">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 safe-area-pb z-50">
          <div className="mx-4 mb-4">
            <div
              className="bg-card border-2 border-ink/15 px-2 py-2"
              style={{ borderRadius: "14px 18px 16px 20px" }}
            >
              <div className="flex items-center justify-around">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-4 py-2 transition-all duration-200",
                        isActive
                          ? "text-ink"
                          : "text-ink-light hover:text-ink"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", isActive && "animate-float")} />
                      <span className="text-xs font-hand-bold">{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
