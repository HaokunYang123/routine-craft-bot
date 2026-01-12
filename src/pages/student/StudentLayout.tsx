import { Outlet, NavLink, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ListTodo, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Tasks", url: "/app", icon: ListTodo },
  { title: "Calendar", url: "/app/calendar", icon: Calendar },
  { title: "Me", url: "/app/profile", icon: User },
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
            <div className="bg-card rounded-2xl shadow-card px-2 py-3">
              <div className="flex items-center justify-around">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200",
                        isActive ? "bg-pastel-peach text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-xs font-hand font-bold">{item.title}</span>
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
