import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAI } from "@/components/FloatingAI";
import { Home, CalendarDays } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WobblyFilter, WobblyPanel, DoodleStar } from "@/components/ui/wobbly";

export default function StudentLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col pb-24">
        {/* SVG filters for wobbly effect */}
        <WobblyFilter />
        
        <main className="flex-1">
          <Outlet />
        </main>
        
        {/* Bottom Navigation with wobbly style */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 safe-area-pb">
          <div className="max-w-lg mx-auto">
            <WobblyPanel variant="button1" className="h-16">
              <div className="flex items-center justify-around h-full px-4">
                <NavLink
                  to="/app"
                  end
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 px-6 py-2 transition-transform active:scale-95",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <Home className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                        {isActive && <DoodleStar className="absolute -top-2 -right-3 w-4 h-4" />}
                      </div>
                      <span className="text-sm font-sketch">Tasks</span>
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/app/calendar"
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 px-6 py-2 transition-transform active:scale-95",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <CalendarDays className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                        {isActive && <DoodleStar className="absolute -top-2 -right-3 w-4 h-4" />}
                      </div>
                      <span className="text-sm font-sketch">Calendar</span>
                    </>
                  )}
                </NavLink>
              </div>
            </WobblyPanel>
          </div>
        </nav>

        <FloatingAI placeholder="Ask about your tasks..." />
      </div>
    </ProtectedRoute>
  );
}
