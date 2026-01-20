import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Library,
  LogOut,
  Menu,
  X,
  UsersRound,
  Settings,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Main nav items
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Tasks", url: "/dashboard/tasks", icon: ClipboardList },
  { title: "Templates", url: "/dashboard/templates", icon: Library },
];

export function CoachSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { displayName, initials, loading: profileLoading } = useProfile();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  // Get user email for fallback
  const userEmail = user?.email || "";

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
        {/* User Badge - Clickable to Settings */}
        <NavLink
          to="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          {profileLoading ? (
            <>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-btn-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              )}
            </>
          )}
        </NavLink>

        {/* Settings Link */}
        <SidebarMenuButton
          asChild
          isActive={location.pathname === "/dashboard/settings"}
          tooltip={collapsed ? "Settings" : undefined}
          className={cn(
            "rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            location.pathname === "/dashboard/settings" &&
              "bg-cta-primary text-white hover:bg-cta-hover hover:text-white"
          )}
        >
          <NavLink
            to="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2"
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">Settings</span>}
          </NavLink>
        </SidebarMenuButton>

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
