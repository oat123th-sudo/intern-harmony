import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export const Route = createFileRoute("/_dash")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("ims:user");
      if (!raw) throw redirect({ to: "/login" });
    }
  },
  component: DashLayout,
});

function DashLayout() {
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
