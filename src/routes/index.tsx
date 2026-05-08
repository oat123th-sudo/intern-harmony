import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("ims:user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        const dest = u.role === "admin" ? "/admin" : u.role === "mentor" ? "/mentor" : "/intern";
        navigate({ to: dest, replace: true });
        return;
      } catch (e) {
        // ignore parse error
      }
    }
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return null;
}
