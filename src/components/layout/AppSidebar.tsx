import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Briefcase, KanbanSquare, GraduationCap, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore, type Role } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

const NAV: { title: string; url: string; icon: any; roles: Role[] }[] = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard, roles: ["admin"] },
  { title: "Manage Users", url: "/manage-users", icon: Users, roles: ["admin"] },
  { title: "Mentor Dashboard", url: "/mentor", icon: Users, roles: ["mentor", "admin"] },
  { title: "Intern Dashboard", url: "/intern", icon: KanbanSquare, roles: ["intern", "admin"] },
];

export function AppSidebar() {
  const { currentUser, setCurrentUser } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const role = currentUser?.role ?? "intern";
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">InternHub</span>
            <span className="text-xs text-sidebar-foreground/60">Management System</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="https://line.me/R/ti/g/" target="_blank" rel="noreferrer">
                    <Briefcase />
                    <span>Job Board</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => {
            setCurrentUser(null);
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
