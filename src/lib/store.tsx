import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUserFn } from "@/api/auth";

export type Role = "admin" | "mentor" | "intern" | "alumni";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: "Pending" | "Accepted" | "Rejected" | "Active";
  team?: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

type Store = {
  currentUser: AppUser | null;
  setCurrentUser: (u: AppUser | null) => void;
  notifications: Notification[];
  markAllRead: () => void;
  isLoadingUser: boolean;
};

const StoreCtx = createContext<Store | null>(null);

const SEED_NOTIFS: Notification[] = [
  {
    id: "n1",
    title: "Welcome",
    body: "Welcome to the Internship Management System!",
    time: "1d ago",
    read: true,
  },
];

const USER_CACHE_KEY = "ims_user_cache";
const COOKIE_NAME = "ims_userid";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readCachedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    // Basic shape guard
    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedUser(u: AppUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    /* storage quota or private-mode — silently ignore */
  }
}

function getCookieUserId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookieUserId(id: string | null) {
  if (typeof document === "undefined") return;
  if (id) {
    // Secure flag is omitted because it breaks local http dev; add it in
    // production via a reverse-proxy / Cloudflare. SameSite=Lax prevents CSRF.
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from localStorage to avoid the "loading" flash.
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(() => {
    const cached = readCachedUser();
    const cookieId = getCookieUserId();
    // Only trust the cache when the cookie still references the same user id.
    if (cached && cookieId && cached.id === cookieId) return cached;
    return null;
  });

  const [notifications, setNotifications] =
    useState<Notification[]>(SEED_NOTIFS);

  // Skip loading state if we already resolved a cached user.
  const [isLoadingUser, setIsLoadingUser] = useState(() => {
    const cookieId = getCookieUserId();
    if (!cookieId) return false;
    const cached = readCachedUser();
    return !(cached && cached.id === cookieId);
  });

  // Background refresh: validate session + pick up any server-side changes.
  useEffect(() => {
    const cookieId = getCookieUserId();
    if (!cookieId) {
      setIsLoadingUser(false);
      return;
    }
    let cancelled = false;

    getCurrentUserFn({ data: cookieId })
      .then((user) => {
        if (cancelled) return;
        if (user) {
          setCurrentUserState(user as AppUser);
          writeCachedUser(user as AppUser);
        } else {
          // Session invalid — clear everything
          setCookieUserId(null);
          writeCachedUser(null);
          setCurrentUserState(null);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to refresh user session:", err);
        // Don't clear session on network errors — be resilient
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // run once on mount

  const setCurrentUser = (u: AppUser | null) => {
    setCurrentUserState(u);
    writeCachedUser(u);
    setCookieUserId(u ? u.id : null);
  };

  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  return (
    <StoreCtx.Provider
      value={{
        currentUser,
        setCurrentUser,
        notifications,
        markAllRead,
        isLoadingUser,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
