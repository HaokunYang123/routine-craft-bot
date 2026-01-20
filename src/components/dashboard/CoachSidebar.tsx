import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Library,
  LogOut,
  Menu,
  X,
  UsersRound,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4 tabs only as per specification
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Tasks", url: "/dashboard/tasks", icon: ClipboardList },
  { title: "Templates", url: "/dashboard/templates", icon: Library },
];

export function CoachSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  // Get user display info
  const userEmail = user?.email || "";
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          {/* TeachCoachConnect Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta-primary">
              <UsersRound className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-foreground">
                TeachCoachConnect
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.url === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={collapsed ? item.title : undefined}
                      className={cn(
                        "rounded-lg transition-all duration-200",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive &&
                          "bg-cta-primary text-white hover:bg-cta-hover hover:text-white"
                      )}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {/* User Badge */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-btn-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground truncate">
                {userEmail}
              </p>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 rounded-lg",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
