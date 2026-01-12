import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  MessageSquare, 
  BarChart3, 
  LogOut,
  Zap
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "People", url: "/dashboard/people", icon: Users },
  { title: "Tasks", url: "/dashboard/tasks", icon: ListTodo },
  { title: "AI Assistant", url: "/dashboard/assistant", icon: MessageSquare },
  { title: "Progress", url: "/dashboard/progress", icon: BarChart3 },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-foreground">
      <SidebarHeader className="p-4 border-b-2 border-foreground">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 border-2 border-foreground flex items-center justify-center shrink-0 bg-foreground text-background">
            <Zap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="text-xl font-sketch text-foreground">taskflow</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-sketch text-muted-foreground">menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className="border-2 border-transparent data-[active=true]:border-foreground data-[active=true]:bg-muted"
                  >
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span className="font-sketch">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t-2 border-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 font-sketch border-2 border-transparent hover:border-foreground"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
