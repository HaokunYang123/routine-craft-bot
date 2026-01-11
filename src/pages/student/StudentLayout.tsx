import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAI } from "@/components/FloatingAI";
import { Home, CalendarDays } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function StudentLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <main className="flex-1">
          <Outlet />
        </main>
        
        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">Tasks</span>
            </NavLink>
            <NavLink
              to="/app/calendar"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-medium">Calendar</span>
            </NavLink>
          </div>
        </nav>

        <FloatingAI placeholder="Ask about your tasks..." />
      </div>
    </ProtectedRoute>
  );
}
