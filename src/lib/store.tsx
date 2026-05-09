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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFS);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const cookieStr = document.cookie;
        const match = cookieStr.match(new RegExp('(^| )ims_userid=([^;]+)'));
        if (match) {
          const userId = match[2];
          const user = await getCurrentUserFn({ data: userId });
          if (user) {
            setCurrentUserState(user as AppUser);
          } else {
            // Invalid or deleted user
            document.cookie = "ims_userid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        }
      } catch (err) {
        console.error("Failed to load user from DB:", err);
      } finally {
        setIsLoadingUser(false);
      }
    };
    initUser();
  }, []);

  const setCurrentUser = (u: AppUser | null) => {
    setCurrentUserState(u);
    if (u) {
      document.cookie = `ims_userid=${u.id}; path=/; max-age=86400;`; // 1 day expiration
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
