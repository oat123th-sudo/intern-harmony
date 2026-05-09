import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,        // 1 min
        gcTime: 5 * 60_000,       // 5 min
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on auth errors or not-found
          const status = error?.status ?? error?.statusCode;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: false, // Never auto-retry mutations
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
