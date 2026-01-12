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
  { title: "Add", url: "/app/add", icon: SketchPlus, isCenter: true },
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

        {/* Bottom Navigation - 44px min tap targets */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb z-50">
          <div className="flex items-center justify-around py-2 max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] gap-0.5 transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
                    item.isCenter && "relative -top-3"
                  )}
                >
                  {item.isCenter ? (
                    <div className="w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-soft border-2 border-accent">
                      <Icon className="w-6 h-6" />
                    </div>
                  ) : (
                    <>
                      <Icon className={cn("w-6 h-6", isActive && "animate-float")} />
                      <span className="text-caption font-medium">{item.title}</span>
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
