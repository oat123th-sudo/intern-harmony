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

const SEED_USERS: AppUser[] = [
  { id: "u1", name: "Alex Kim", email: "alex@intern.co", role: "intern", status: "Active" },
  { id: "u2", name: "Priya Patel", email: "priya@intern.co", role: "intern", status: "Pending" },
  { id: "u3", name: "Diego Soto", email: "diego@intern.co", role: "intern", status: "Accepted" },
  { id: "u4", name: "Mei Tanaka", email: "mei@mentor.co", role: "mentor", status: "Active" },
  { id: "u5", name: "Jordan Reed", email: "jordan@admin.co", role: "admin", status: "Active" },
  { id: "u6", name: "Sara Lopez", email: "sara@intern.co", role: "intern", status: "Pending" },
];

const SEED_NOTIFS: Notification[] = [
  { id: "n1", title: "New comment", body: "Your mentor commented on your task 'API integration'.", time: "2m ago", read: false },
  { id: "n2", title: "Application update", body: "Your application moved to interview stage.", time: "1h ago", read: false },
  { id: "n3", title: "Welcome", body: "Welcome to the Internship Management System!", time: "1d ago", read: true },
];

const SEED_TASKS: Task[] = [
  { id: "t1", title: "Read onboarding handbook", status: "done" },
  { id: "t2", title: "Set up local dev environment", status: "done" },
  { id: "t3", title: "Build login flow prototype", status: "doing" },
  { id: "t4", title: "Draft project proposal", status: "doing" },
  { id: "t5", title: "Weekly mentor sync", status: "todo" },
  { id: "t6", title: "Submit week-1 report", status: "todo" },
];

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
