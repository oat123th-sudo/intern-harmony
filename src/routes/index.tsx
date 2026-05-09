import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  const navigate = useNavigate();
  const { currentUser, isLoadingUser } = useStore();

  useEffect(() => {
    if (isLoadingUser) return; // Wait for cookie-based session check to finish
    if (currentUser) {
      const dest =
        currentUser.role === "admin" ? "/admin" :
        currentUser.role === "mentor" ? "/mentor" : "/intern";
      navigate({ to: dest, replace: true });
    } else {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoadingUser, currentUser, navigate]);

  return null;
}
