import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CheckInModal } from "@/components/CheckInModal";
import { cn } from "@/lib/utils";
import {
  SketchHome,
  SketchCalendar,
  SketchPlus,
  SketchStar,
  SketchSettings,
} from "@/components/ui/sketch";

const navItems = [
  { title: "home", url: "/app", icon: SketchHome },
  { title: "schedule", url: "/app/schedule", icon: SketchCalendar, isCenter: true },
  { title: "stickers", url: "/app/stickers", icon: SketchStar },
  { title: "settings", url: "/app/settings", icon: SketchSettings },
];

export default function StudentLayout() {
  const location = useLocation();
  const [showCheckIn, setShowCheckIn] = useState(false);

  // Show check-in modal when student first loads the app
  useEffect(() => {
    // Small delay to let the page load first
    const timer = setTimeout(() => {
      setShowCheckIn(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 overflow-auto pb-24">
          <Outlet />
        </main>

        {/* Bottom Navigation - Wii channel style */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-[2.5px] border-foreground safe-area-pb z-50">
          <div className="flex items-center justify-around py-2 max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[48px] min-h-[48px] gap-0.5 transition-all",
                    isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
                    item.isCenter && "relative -top-4"
                  )}
                >
                  {item.isCenter ? (
                    <div className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center border-[2.5px] border-foreground shadow-sticker">
                      <Icon className="w-7 h-7" />
                    </div>
                  ) : (
                    <>
                      <Icon className={cn("w-6 h-6", isActive && "animate-bounce-subtle")} />
                      <span className="text-caption font-bold">{item.title}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Daily Check-in Modal */}
        <CheckInModal
          open={showCheckIn}
          onOpenChange={setShowCheckIn}
          onCheckInComplete={(sentiment) => {
            // TODO: If tired/sore, trigger plan modification
            console.log("Student checked in as:", sentiment);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

