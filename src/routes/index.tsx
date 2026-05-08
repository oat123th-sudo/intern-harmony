import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("ims:user");
      if (raw) {
        const u = JSON.parse(raw);
        const dest = u.role === "admin" ? "/admin" : u.role === "mentor" ? "/mentor" : "/intern";
        throw redirect({ to: dest });
      }
      throw redirect({ to: "/login" });
    }
  },
  component: () => null,
});
