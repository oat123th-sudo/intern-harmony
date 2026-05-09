import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUserFn } from "@/api/auth";

export type Role = "admin" | "mentor" | "intern" | "alumni";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: "Pending" | "Accepted" | "Rejected" | "Active";
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
  { id: "n1", title: "Welcome", body: "Welcome to the Internship Management System!", time: "1d ago", read: true },
];

const USER_CACHE_KEY = "ims_user_cache";

function readCachedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
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
    /* ignore */
  }
}

function getCookieUserId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )ims_userid=([^;]+)/);
  return match ? match[2] : null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from localStorage to avoid the "loading" flash.
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(() => {
    const cached = readCachedUser();
    const cookieId = getCookieUserId();
    // Only trust cache if cookie still references the same user.
    if (cached && cookieId && cached.id === cookieId) return cached;
    return null;
  });
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFS);
  // If we already have a cached user, we are NOT loading — render immediately.
  const [isLoadingUser, setIsLoadingUser] = useState(() => {
    const cached = readCachedUser();
    const cookieId = getCookieUserId();
    return !!cookieId && !(cached && cached.id === cookieId);
  });

  // Background refresh from server (validates session + picks up changes).
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
          document.cookie = "ims_userid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          writeCachedUser(null);
          setCurrentUserState(null);
        }
      })
      .catch((err) => console.error("Failed to refresh user:", err))
      .finally(() => {
        if (!cancelled) setIsLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrentUser = (u: AppUser | null) => {
    setCurrentUserState(u);
    writeCachedUser(u);
    if (u) {
      document.cookie = `ims_userid=${u.id}; path=/; max-age=86400;`;
    } else {
      document.cookie = "ims_userid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  };

  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  return (
    <StoreCtx.Provider
      value={{ currentUser, setCurrentUser, notifications, markAllRead, isLoadingUser }}
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
