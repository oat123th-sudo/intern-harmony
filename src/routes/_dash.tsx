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
      <div className="bg-app-mesh flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          <TopHeader />
          <main className="flex-1 px-6 py-8 md:px-10">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
