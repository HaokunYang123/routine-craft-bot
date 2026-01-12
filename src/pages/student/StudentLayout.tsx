import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import {
  SketchHome,
  SketchCalendar,
  SketchPlus,
  SketchStar,
  SketchSettings,
} from "@/components/ui/sketch";

const navItems = [
  { title: "Home", url: "/app", icon: SketchHome },
  { title: "Calendar", url: "/app/calendar", icon: SketchCalendar },
  { title: "Add", url: "/app/add", icon: SketchPlus },
  { title: "Stickers", url: "/app/stickers", icon: SketchStar },
  { title: "Settings", url: "/app/settings", icon: SketchSettings },
];

export default function StudentLayout() {
  const location = useLocation();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-ink/20 safe-area-pb z-50">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              const isAdd = item.title === "Add";
              
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-1 transition-all duration-200",
                    isActive ? "text-ink" : "text-ink-light hover:text-ink",
                    isAdd && "relative -top-2"
                  )}
                >
                  {isAdd ? (
                    <div className="w-12 h-12 border-2 border-ink bg-card rounded-full flex items-center justify-center shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <Icon className={cn("w-6 h-6", isActive && "animate-float")} />
                      <span className="text-xs font-hand-bold">{item.title}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}