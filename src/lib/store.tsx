import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "mentor" | "intern";

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

export type Task = {
  id: string;
  title: string;
  detail?: string;
  status: "todo" | "doing" | "done";
};

type Store = {
  currentUser: AppUser | null;
  setCurrentUser: (u: AppUser | null) => void;
  users: AppUser[];
  setUsers: (u: AppUser[]) => void;
  notifications: Notification[];
  markAllRead: () => void;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
};

const StoreCtx = createContext<Store | null>(null);

const SEED_USERS: AppUser[] = [];

const SEED_NOTIFS: Notification[] = [
  { id: "n1", title: "Welcome", body: "Welcome to the Internship Management System!", time: "1d ago", read: true },
];

const SEED_TASKS: Task[] = [];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFS);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ims:user");
      if (raw) setCurrentUserState(JSON.parse(raw));
    } catch {}
  }, []);

  const setCurrentUser = (u: AppUser | null) => {
    setCurrentUserState(u);
    if (u) localStorage.setItem("ims:user", JSON.stringify(u));
    else localStorage.removeItem("ims:user");
  };

  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  return (
    <StoreCtx.Provider
      value={{ currentUser, setCurrentUser, users, setUsers, notifications, markAllRead, tasks, setTasks }}
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
