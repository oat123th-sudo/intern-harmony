import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export function TopHeader() {
  const { currentUser, notifications, markAllRead } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((p) => p[0]).slice(0, 2).join("")
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger />
      <div className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search interns, tasks…" className="h-9 w-72 pl-9" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu onOpenChange={(o) => o && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <Badge variant="secondary" className="text-xs">{notifications.length} total</Badge>
            </div>
            <ul className="max-h-96 overflow-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b px-4 py-3 last:border-b-0 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2 rounded-full border bg-card px-2 py-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight sm:block pr-1">
            <p className="text-xs font-medium">{currentUser?.name ?? "Guest"}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{currentUser?.role ?? "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
