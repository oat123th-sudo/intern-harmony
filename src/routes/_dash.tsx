import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_dash")({
  component: DashLayout,
});

function DashLayout() {
  const navigate = useNavigate();
  const { currentUser, isLoadingUser } = useStore();

  useEffect(() => {
    if (isLoadingUser) return; // Wait for cookie session hydration
    if (!currentUser) {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoadingUser, currentUser, navigate]);

  // Show nothing while checking auth or if no user (redirect will happen)
  if (isLoadingUser || !currentUser) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-secondary/40">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <TopHeader />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
