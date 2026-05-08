import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_dash")({
  component: DashLayout,
});

function DashLayout() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("ims:user");
    if (!raw) {
      navigate({ to: "/login", replace: true });
    } else {
      setIsChecking(false);
    }
  }, [navigate]);

  if (isChecking) {
    return null; // Don't render layout until client auth check passes
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
